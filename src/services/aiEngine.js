const { getAll, getOne, runQuery } = require('../config/database');
const logger = require('../config/logger');
const aiTelemetry = require('./aiTelemetry');

const MIN_DATA_QUALITY_SCORE = 40;

class AIEngine {
  constructor() {
    this.enabled = process.env.AI_ENGINE_ENABLED !== 'false';
    this.confidenceThreshold = parseFloat(process.env.AI_CONFIDENCE_THRESHOLD || '0.6');
  }

  async getWeatherData() {
    try {
      const lat = process.env.FARM_LAT || '10.7769';
      const lon = process.env.FARM_LON || '106.7009';
      const axios = require('axios');
      const res = await axios.get(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,precipitation&forecast_days=2&timezone=auto`
      );
      return res.data;
    } catch (e) {
      return null;
    }
  }

  async getSoilMoisture(_farmId) {
    try {
      const sensor = getOne('SELECT value FROM sensors WHERE type = \'soil\'');
      return sensor?.value || 30;
    } catch (e) {
      return 30;
    }
  }

  async predictIrrigation(farmId) {
    const soilMoisture = await this.getSoilMoisture(farmId);
    const weatherData = await this.getWeatherData();
    const hourly = weatherData?.hourly;
    const now = new Date();
    const idx = hourly?.time?.findIndex(t => new Date(t) >= now) || 0;

    const temp = hourly?.temperature_2m?.[idx] || 28;
    const humidity = hourly?.relative_humidity_2m?.[idx] || 70;
    const precipProb = hourly?.precipitation_probability?.[idx] || 0;
    const rainfall = hourly?.precipitation?.[idx] || 0;

    const rawInput = { soilMoisture, temp, humidity, precipProb, rainfall };
    const quality = aiTelemetry.assessDataQuality({
      soil: soilMoisture, temperature: temp, humidity, rainfall
    });

    if (!quality.meetsMinimumQuality && quality.score < MIN_DATA_QUALITY_SCORE) {
      logger.warn(`[AIEngine] Irrigation prediction skipped: quality score ${quality.score} below threshold`);
      return {
        prediction: null,
        reason: 'low_data_quality',
        quality,
        auditId: null
      };
    }

    let shouldIrrigate = false;
    let duration = 0;
    let reason = '';
    let confidence = 0.85;
    let priority = 'medium';

    if (soilMoisture < 25) {
      shouldIrrigate = true;
      duration = Math.max(15, Math.round((35 - soilMoisture) * 1.2));
      reason = `Độ ẩm đất thấp (${soilMoisture.toFixed(0)}%)`;
      priority = 'high';
    } else if (soilMoisture < 35 && precipProb < 30 && temp > 30) {
      shouldIrrigate = true;
      duration = 10;
      reason = `Độ ẩm ${soilMoisture.toFixed(0)}%, nóng ${temp.toFixed(0)}°C, không mưa`;
    } else if (precipProb > 60) {
      shouldIrrigate = false;
      reason = `Khả năng mưa cao (${precipProb}%)`;
      confidence = 0.75;
    } else {
      shouldIrrigate = false;
      reason = `Độ ẩm đất ổn định (${soilMoisture.toFixed(0)}%)`;
      confidence = 0.9;
    }

    const predictionId = 'pred-' + Date.now();
    runQuery(
      `INSERT INTO predictions (id, farm_id, target_type, predicted_value, confidence, explanation, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime("now"))`,
      [predictionId, farmId, 'irrigation', JSON.stringify({ shouldIrrigate, duration }), confidence, reason]
    );

    const recId = 'rec-' + Date.now();
    runQuery(
      `INSERT INTO recommendations (id, farm_id, category, title, detail, priority, status, suggested_action, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime("now"))`,
      [
        recId, farmId, 'irrigation',
        shouldIrrigate ? 'Cần tưới nước' : 'Không cần tưới',
        reason,
        priority, 'open',
        JSON.stringify({ action: shouldIrrigate ? 'irrigate' : 'none', duration, confidence })
      ]
    );

    const auditEntry = aiTelemetry.logPredictionAudit({
      predictionType: 'irrigation',
      modelId: 'model-001',
      inputHash: aiTelemetry.hashData(rawInput),
      outputHash: aiTelemetry.hashData({ shouldIrrigate, duration }),
      qualityScore: quality.score,
      qualityGrade: quality.grade,
      inputSources: ['sensors:soil', 'sensors:temperature', 'sensors:humidity', 'weather:open-meteo'],
      dataClassification: aiTelemetry.getClassification('prediction_input')
    });

    return {
      prediction: { shouldIrrigate, duration, confidence },
      reason,
      recommendation: { id: recId, priority, status: 'open' },
      weather: { temp, humidity, precipProb, soilMoisture },
      dataQuality: quality,
      inputHash: auditEntry.inputHash,
      auditId: auditEntry.id
    };
  }

  async predictFertilization(farmId) {
    const soilMoisture = await this.getSoilMoisture(farmId);
    const weatherData = await this.getWeatherData();
    const humidity = weatherData?.hourly?.relative_humidity_2m?.[0] || 70;
    const temp = weatherData?.hourly?.temperature_2m?.[0] || 28;

    const rawInput = { soilMoisture, humidity, temp };
    const quality = aiTelemetry.assessDataQuality({
      soil: soilMoisture, humidity, temperature: temp
    });

    let shouldFertilize = false;
    let fertilizerType = 'NPK';
    let amount = 0;
    let reason = '';
    let priority = 'low';

    if (soilMoisture < 40 && humidity > 60) {
      shouldFertilize = true;
      amount = Math.max(50, Math.round((50 - soilMoisture) * 2));
      fertilizerType = 'NPK 20-20-20';
      reason = 'Độ ẩm phù hợp, cây cần dinh dưỡng';
      priority = 'medium';
    } else if (temp > 32) {
      shouldFertilize = true;
      amount = 30;
      fertilizerType = 'NPK cao Kali';
      reason = 'Nhiệt độ cao, cây cần Kali';
      priority = 'medium';
    } else {
      reason = 'Điều kiện chưa phù hợp để bón';
    }

    const recId = 'rec-fert-' + Date.now();
    if (shouldFertilize) {
      runQuery(
        `INSERT INTO recommendations (id, farm_id, category, title, detail, priority, status, suggested_action, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now"))`,
        [recId, farmId, 'fertilization', 'Khuyến nghị bón phân', reason, priority, 'open',
          JSON.stringify({ action: 'fertilize', type: fertilizerType, amount })]
      );
    }

    aiTelemetry.logPredictionAudit({
      predictionType: 'fertilization',
      modelId: null,
      inputHash: aiTelemetry.hashData(rawInput),
      outputHash: aiTelemetry.hashData({ shouldFertilize, fertilizerType, amount }),
      qualityScore: quality.score,
      qualityGrade: quality.grade,
      inputSources: ['sensors:soil', 'sensors:temperature', 'sensors:humidity', 'weather:open-meteo'],
      dataClassification: aiTelemetry.getClassification('prediction_input')
    });

    return {
      shouldFertilize,
      fertilizerType,
      amount,
      reason,
      priority,
      recommendation: { id: recId, status: shouldFertilize ? 'open' : 'none' },
      dataQuality: quality
    };
  }

  async detectAnomalies(farmId) {
    const anomalies = [];
    try {
      const sensors = getAll('SELECT * FROM sensors');
      const devices = getOne('SELECT COUNT(*) as total, SUM(CASE WHEN status = \'online\' THEN 1 ELSE 0 END) as online FROM devices');

      const sensorData = {};
      for (const s of sensors) {
        if (s.type && s.value !== undefined) sensorData[s.type] = s.value;
      }
      const quality = aiTelemetry.assessDataQuality(sensorData);

      for (const sensor of sensors) {
        if (sensor.type === 'soil' && sensor.value < 10) {
          anomalies.push({
            metric: 'soil_moisture',
            expected_range: { min: 20, max: 80 },
            actual_value: sensor.value,
            severity: sensor.value < 5 ? 'high' : 'medium',
            reason: 'Độ ẩm đất quá thấp'
          });
        }
        if (sensor.type === 'temperature' && sensor.value > 40) {
          anomalies.push({
            metric: 'temperature',
            expected_range: { min: 15, max: 35 },
            actual_value: sensor.value,
            severity: 'high',
            reason: 'Nhiệt độ quá cao'
          });
        }
        if (sensor.type === 'water' && sensor.value < 15) {
          anomalies.push({
            metric: 'water_level',
            expected_range: { min: 20, max: 100 },
            actual_value: sensor.value,
            severity: sensor.value < 10 ? 'high' : 'medium',
            reason: 'Mực nước thấp'
          });
        }
      }

      const onlineRatio = devices?.online / (devices?.total || 1);
      if (onlineRatio < 0.5) {
        anomalies.push({
          metric: 'device_online',
          expected_range: { min: 0.8 },
          actual_value: onlineRatio,
          severity: 'medium',
          reason: 'Nhiều thiết bị offline'
        });
      }

      for (const anomaly of anomalies) {
        const id = 'ano-' + Date.now();
        runQuery(
          `INSERT INTO anomalies (id, farm_id, metric, expected_range, actual_value, severity, detected_at)
           VALUES (?, ?, ?, ?, ?, ?, datetime("now"))`,
          [id, farmId, anomaly.metric, JSON.stringify(anomaly.expected_range), anomaly.actual_value, anomaly.severity]
        );
      }

      aiTelemetry.logPredictionAudit({
        predictionType: 'anomaly',
        modelId: null,
        inputHash: aiTelemetry.hashData(sensorData),
        outputHash: aiTelemetry.hashData(anomalies.map(a => a.metric)),
        qualityScore: quality.score,
        qualityGrade: quality.grade,
        inputSources: ['sensors', 'devices'],
        dataClassification: aiTelemetry.getClassification('anomaly')
      });

      return { anomalies, count: anomalies.length, dataQuality: quality };
    } catch (e) {
      logger.warn('[AI] Anomaly detection error:', e.message);
      return { anomalies: [], count: 0 };
    }
  }

  async predictYield(farmId) {
    const sensors = getAll('SELECT type, value FROM sensors');
    const soilMoisture = sensors.find(s => s.type === 'soil')?.value || 30;
    const temp = sensors.find(s => s.type === 'temperature')?.value || 28;
    const humidity = sensors.find(s => s.type === 'humidity')?.value || 70;

    const weatherData = await this.getWeatherData();
    const rainDays = weatherData?.hourly?.precipitation?.filter(p => p > 0)?.length || 0;

    let predictedYield = 0;
    let confidence = 0.7;
    let riskLevel = 'low';
    let explanation = '';

    const score = (soilMoisture / 100 * 40) + ((50 - Math.abs(temp - 28)) * 2) + (humidity / 5) + (rainDays * 0.5);
    
    if (score > 120) {
      predictedYield = Math.round(score * 0.8);
      confidence = 0.8;
      riskLevel = 'low';
      explanation = 'Điều kiện rất tốt cho năng suất';
    } else if (score > 80) {
      predictedYield = Math.round(score * 0.6);
      confidence = 0.7;
      riskLevel = 'medium';
      explanation = 'Điều kiện trung bình, có thể cải thiện';
    } else {
      predictedYield = Math.round(score * 0.4);
      confidence = 0.6;
      riskLevel = 'high';
      explanation = 'Điều kiện không tốt, cần chú ý chăm sóc';
    }

    const predId = 'pred-yield-' + Date.now();
    runQuery(
      `INSERT INTO predictions (id, farm_id, target_type, predicted_value, confidence, explanation, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime("now"))`,
      [predId, farmId, 'yield', predictedYield, confidence, explanation]
    );

    return {
      predictedYield: predictedYield + ' kg/hectare',
      confidence: (confidence * 100).toFixed(0) + '%',
      riskLevel,
      explanation,
      metrics: { soilMoisture, temp, humidity, rainDays }
    };
  }

  async diseaseRiskScore(farmId) {
    const sensors = getAll('SELECT type, value FROM sensors');
    const humidity = sensors.find(s => s.type === 'humidity')?.value || 70;
    const temp = sensors.find(s => s.type === 'temperature')?.value || 28;

    const rawInput = { humidity, temp };
    const quality = aiTelemetry.assessDataQuality({ humidity, temperature: temp });

    let riskScore = 0;
    let riskLevel = 'low';
    let diseases = [];
    let explanation = '';

    if (humidity > 80 && temp > 25) {
      riskScore = 75;
      riskLevel = 'high';
      diseases = ['Nấm', 'Bệnh héo lá'];
      explanation = 'Độ ẩm cao + nhiệt độ ấm tạo điều kiện cho nấm bệnh';
    } else if (humidity > 70 && temp > 28) {
      riskScore = 50;
      riskLevel = 'medium';
      diseases = ['Bệnh đốm lá'];
      explanation = 'Có nguy cơ bệnh nhẹ';
    } else {
      riskScore = 20;
      riskLevel = 'low';
      explanation = 'Điều kiện khô ráo, ít nguy cơ bệnh';
    }

    if (riskLevel !== 'low') {
      const recId = 'rec-disease-' + Date.now();
      runQuery(
        `INSERT INTO recommendations (id, farm_id, category, title, detail, priority, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, datetime("now"))`,
        [recId, farmId, 'inspection', `Cảnh báo: ${diseases.join(', ')}`, explanation, riskLevel === 'high' ? 'high' : 'medium', 'open']
      );
    }

    aiTelemetry.logPredictionAudit({
      predictionType: 'disease-risk',
      modelId: 'model-001',
      inputHash: aiTelemetry.hashData(rawInput),
      outputHash: aiTelemetry.hashData({ riskScore, riskLevel, diseases }),
      qualityScore: quality.score,
      qualityGrade: quality.grade,
      inputSources: ['sensors:temperature', 'sensors:humidity'],
      dataClassification: aiTelemetry.getClassification('prediction_input')
    });

    return {
      riskScore,
      riskLevel,
      diseases,
      explanation,
      conditions: { humidity, temp },
      dataQuality: quality
    };
  }

  async generateSummary(farmId, period = 'daily') {
    try {
      const totalDevices = getOne('SELECT COUNT(*) as count FROM devices');
      const onlineDevices = getOne('SELECT COUNT(*) as count FROM devices WHERE status = \'online\'');
      const activeRules = getOne('SELECT COUNT(*) as count FROM rules WHERE enabled = 1');
      const pendingAlerts = getOne('SELECT COUNT(*) as count FROM alerts WHERE acknowledged = 0');
      const pendingRecs = getOne('SELECT COUNT(*) as count FROM recommendations WHERE status = \'open\'');
      const anomalies = getOne('SELECT COUNT(*) as count FROM anomalies WHERE status = \'open\'');

      const summary = {
        period,
        timestamp: new Date().toISOString(),
        overview: {
          devices: { total: totalDevices?.count || 0, online: onlineDevices?.count || 0 },
          automation: { activeRules: activeRules?.count || 0 },
          alerts: { pending: pendingAlerts?.count || 0 },
          recommendations: { pending: pendingRecs?.count || 0 },
          anomalies: { open: anomalies?.count || 0 }
        },
        status: 'healthy',
        priority_tasks: []
      };

      if (anomalies?.count > 0) {
        summary.status = 'warning';
        summary.priority_tasks.push({ type: 'anomaly', count: anomalies?.count });
      }
      if (pendingRecs?.count > 0) {
        summary.priority_tasks.push({ type: 'recommendation', count: pendingRecs?.count });
      }
      if (pendingAlerts?.count > 3) {
        summary.status = 'warning';
        summary.priority_tasks.push({ type: 'alert', count: pendingAlerts?.count });
      }

      summary.message = this.generateSummaryMessage(summary);
      return summary;
    } catch (e) {
      return { error: e.message };
    }
  }

  generateSummaryMessage(summary) {
    if (summary.status === 'healthy') {
      return 'Farm hoạt động bình thường. Không có vấn đề cần xử lý.';
    }
    const tasks = summary.priority_tasks.map(t => `${t.count} ${t.type}`).join(', ');
    return `Cần xử lý: ${tasks}`;
  }

  async acknowledgeRecommendation(recommendationId, userId, feedback = null) {
    const status = feedback ? 'acknowledged' : 'open';
    runQuery(
      'UPDATE recommendations SET status = ?, resolved_at = datetime("now") WHERE id = ?',
      [status, recommendationId]
    );

    if (feedback) {
      const feedbackId = 'fb-' + Date.now();
      runQuery(
        `INSERT INTO ai_feedback (id, recommendation_id, user_id, feedback_type, created_at)
         VALUES (?, ?, ?, datetime("now"))`,
        [feedbackId, recommendationId, userId, feedback]
      );
    }
    return { ok: true };
  }

  async processAllPredictions(farmId) {
    const results = {
      irrigation: await this.predictIrrigation(farmId),
      fertilization: await this.predictFertilization(farmId),
      anomalies: await this.detectAnomalies(farmId),
      yield: await this.predictYield(farmId),
      disease: await this.diseaseRiskScore(farmId),
      summary: await this.generateSummary(farmId, 'daily')
    };
    return results;
  }

  getTelemetryHealth() {
    return aiTelemetry.getDataGovernanceReport();
  }

  getAuditTrail(n = 20) {
    return aiTelemetry.getRecentAudit(n);
  }

  validateInputData(data) {
    return aiTelemetry.assessDataQuality(data);
  }
}

module.exports = new AIEngine();