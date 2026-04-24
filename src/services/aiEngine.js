const { getAll, getOne, runQuery } = require('../config/database');
const logger = require('../config/logger');
const aiTelemetry = require('./aiTelemetry');
const { getBreaker } = require('./circuitBreaker');
const { retry } = require('./retryService');

const MIN_DATA_QUALITY_SCORE = 40;

const BREAKER_CONFIGS = {
  weather: { failureThreshold: 3, timeout: 30000 },
  model: { failureThreshold: 5, timeout: 60000 },
  database: { failureThreshold: 3, timeout: 15000 }
};

class AIEngine {
  constructor() {
    this.enabled = process.env.AI_ENGINE_ENABLED !== 'false';
    this.confidenceThreshold = parseFloat(process.env.AI_CONFIDENCE_THRESHOLD || '0.6');
    
    this.weatherBreaker = getBreaker('weather', BREAKER_CONFIGS.weather);
    this.modelBreaker = getBreaker('model', BREAKER_CONFIGS.model);
  }

  async getWeatherData() {
    const fallbackData = {
      hourly: {
        time: [new Date().toISOString()],
        temperature_2m: [28],
        relative_humidity_2m: [70],
        precipitation_probability: [0],
        precipitation: [0]
      }
    };

    try {
      return await this.weatherBreaker.execute(async () => {
        return await retry(async () => {
          const lat = process.env.FARM_LAT || '10.7769';
          const lon = process.env.FARM_LON || '106.7009';
          const axios = require('axios');
          const res = await axios.get(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,precipitation&forecast_days=2&timezone=auto`,
            { timeout: 5000 }
          );
          return res.data;
        }, {
          maxRetries: 2,
          initialDelay: 1000,
          backoffFactor: 2,
          onRetry: (info) => logger.warn(`[Weather] Retry ${info.attempt}: ${info.error}`)
        });
      });
    } catch (error) {
      logger.warn(`[AIEngine] Weather API failed, using fallback: ${error.message}`);
      return fallbackData;
    }
  }

  async getSoilMoisture(farmId) {
    try {
      return await this.modelBreaker.execute(async () => {
        const sensor = getOne('SELECT value FROM sensors WHERE type = ?', ['soil']);
        return sensor?.value || 30;
      });
    } catch (error) {
      logger.warn(`[AIEngine] Soil moisture query failed, using fallback: ${error.message}`);
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
    try {
      runQuery(
        `INSERT INTO predictions (id, farm_id, target_type, predicted_value, confidence, explanation, created_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime("now"))`,
        [predictionId, farmId, 'irrigation', JSON.stringify({ shouldIrrigate, duration }), confidence, reason]
      );
    } catch (e) {
      logger.warn(`[AIEngine] Failed to save prediction: ${e.message}`);
    }

    const recId = 'rec-' + Date.now();
    try {
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
    } catch (e) {
      logger.warn(`[AIEngine] Failed to save recommendation: ${e.message}`);
    }

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
      try {
        runQuery(
          `INSERT INTO recommendations (id, farm_id, category, title, detail, priority, status, suggested_action, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now"))`,
          [recId, farmId, 'fertilization', 'Khuyến nghị bón phân', reason, priority, 'open',
            JSON.stringify({ action: 'fertilize', type: fertilizerType, amount })]
        );
      } catch (e) {
        logger.warn(`[AIEngine] Failed to save fertilization recommendation: ${e.message}`);
      }
    }

    try {
      aiTelemetry.logPredictionAudit({
        predictionType: 'fertilization',
        modelId: 'model-001',
        inputHash: aiTelemetry.hashData(rawInput),
        outputHash: aiTelemetry.hashData({ shouldFertilize, fertilizerType, amount }),
        qualityScore: quality.score,
        qualityGrade: quality.grade,
        inputSources: ['sensors:soil', 'weather:open-meteo'],
        dataClassification: aiTelemetry.getClassification('prediction_input')
      });
    } catch (e) {
      logger.warn(`[AIEngine] Failed to log fertilization audit: ${e.message}`);
    }

    return {
      prediction: { shouldFertilize, fertilizerType, amount },
      reason,
      recommendation: { id: recId, priority, status: shouldFertilize ? 'open' : 'closed' },
      dataQuality: quality
    };
  }

  getCircuitBreakerStatus() {
    return {
      weather: this.weatherBreaker.getState(),
      model: this.modelBreaker.getState()
    };
  }

  getTelemetryHealth() {
    return {
      timestamp: new Date().toISOString(),
      telemetryEnabled: aiTelemetry.enabled,
      qualityThreshold: MIN_DATA_QUALITY_SCORE,
      circuitBreakers: this.getCircuitBreakerStatus()
    };
  }

  validateInputData(data) {
    const quality = aiTelemetry.assessDataQuality(data);
    return {
      score: quality.score,
      grade: quality.grade,
      meetsMinimumQuality: quality.score >= MIN_DATA_QUALITY_SCORE,
      details: quality
    };
  }

  getAuditTrail() {
    return aiTelemetry.getAuditLog ? aiTelemetry.getAuditLog() : [];
  }
}

module.exports = new AIEngine();