const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const aiEngine = require('../services/aiEngine');
const { getAll, runQuery } = require('../config/database');

const TFLiteDiseasePredictor = require('../services/ai/tfliteDiseasePredictor');
const LSTMIrrigationPredictor = require('../services/ai/lstmIrrigationPredictor');
const LightGBMPredictor = require('../services/ai/LightGBMPredictor');
const AutoMLService = require('../services/ai/AutoMLService');
const FederatedClient = require('../services/ai/FederatedClient');
const BayesianOptimizer = require('../services/ai/BayesianOptimizer');
const DigitalTwin = require('../services/ai/DigitalTwin');

const diseasePredictor = new TFLiteDiseasePredictor();
const irrigationPredictor = new LSTMIrrigationPredictor();

const federatedClient = new FederatedClient();
const digitalTwins = new Map();

router.get('/predict/irrigation', auth, async (req, res) => {
  try {
    const farmId = req.query.farm_id || 'default';
    const prediction = await aiEngine.predictIrrigation(farmId);
    res.json({ ok: true, data: prediction });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/predict/fertilization', auth, async (req, res) => {
  try {
    const farmId = req.query.farm_id || 'default';
    const prediction = await aiEngine.predictFertilization(farmId);
    res.json({ ok: true, data: prediction });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/predict/yield', auth, async (req, res) => {
  try {
    const farmId = req.query.farm_id || 'default';
    const prediction = await aiEngine.predictYield(farmId);
    res.json({ ok: true, data: prediction });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/predict/disease-risk', auth, async (req, res) => {
  try {
    const farmId = req.query.farm_id || 'default';
    const risk = await aiEngine.diseaseRiskScore(farmId);
    res.json({ ok: true, data: risk });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/predict/anomaly', auth, async (req, res) => {
  try {
    const farmId = req.query.farm_id || 'default';
    const result = await aiEngine.detectAnomalies(farmId);
    res.json({ ok: true, data: result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/predict/all', auth, async (req, res) => {
  try {
    const farmId = req.query.farm_id || 'default';
    const results = await aiEngine.processAllPredictions(farmId);
    res.json({ ok: true, data: results });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/recommendations', auth, async (req, res) => {
  try {
    const { farm_id, category, status, priority } = req.query;
    let sql = 'SELECT * FROM recommendations WHERE 1=1';
    const params = [];
    if (farm_id) { sql += ' AND farm_id = ?'; params.push(farm_id); }
    if (category) { sql += ' AND category = ?'; params.push(category); }
    if (status) { sql += ' AND status = ?'; params.push(status); }
    if (priority) { sql += ' AND priority = ?'; params.push(priority); }
    sql += ' ORDER BY created_at DESC LIMIT 50';
    
    const recommendations = getAll(sql, params);
    res.json({ ok: true, data: recommendations });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/recommendations/:id/acknowledge', auth, async (req, res) => {
  try {
    const result = await aiEngine.acknowledgeRecommendation(req.params.id, req.user?.id, 'acknowledged');
    res.json({ ok: true, data: result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/recommendations/:id/complete', auth, async (req, res) => {
  try {
    runQuery('UPDATE recommendations SET status = "done", resolved_at = datetime("now") WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/recommendations/:id/dismiss', auth, async (req, res) => {
  try {
    const { reason } = req.body;
    runQuery('UPDATE recommendations SET status = "dismissed", resolved_at = datetime("now") WHERE id = ?', [req.params.id]);
    if (reason) {
      const feedbackId = 'fb-' + Date.now();
      runQuery(
        `INSERT INTO ai_feedback (id, recommendation_id, user_id, feedback_type, comment, created_at)
         VALUES (?, ?, ?, ?, ?, datetime("now"))`,
        [feedbackId, req.params.id, req.user?.id, 'dismissed', reason]
      );
    }
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/anomalies', auth, async (req, res) => {
  try {
    const { farm_id, status, severity } = req.query;
    let sql = 'SELECT * FROM anomalies WHERE 1=1';
    const params = [];
    if (farm_id) { sql += ' AND farm_id = ?'; params.push(farm_id); }
    if (status) { sql += ' AND status = ?'; params.push(status); }
    if (severity) { sql += ' AND severity = ?'; params.push(severity); }
    sql += ' ORDER BY detected_at DESC LIMIT 50';
    
    const anomalies = getAll(sql, params);
    res.json({ ok: true, data: anomalies });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/anomalies/:id/acknowledge', auth, async (req, res) => {
  try {
    runQuery(
      'UPDATE anomalies SET status = "acknowledged", acknowledged_by = ? WHERE id = ?',
      [req.user?.id, req.params.id]
    );
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/predictions', auth, async (req, res) => {
  try {
    const { farm_id, target_type } = req.query;
    let sql = 'SELECT * FROM predictions WHERE 1=1';
    const params = [];
    if (farm_id) { sql += ' AND farm_id = ?'; params.push(farm_id); }
    if (target_type) { sql += ' AND target_type = ?'; params.push(target_type); }
    sql += ' ORDER BY created_at DESC LIMIT 30';
    
    const predictions = getAll(sql, params);
    res.json({ ok: true, data: predictions });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/summary/daily', auth, async (req, res) => {
  try {
    const farmId = req.query.farm_id || 'default';
    const summary = await aiEngine.generateSummary(farmId, 'daily');
    res.json({ ok: true, data: summary });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/summary/weekly', auth, async (req, res) => {
  try {
    const farmId = req.query.farm_id || 'default';
    const summary = await aiEngine.generateSummary(farmId, 'weekly');
    res.json({ ok: true, data: summary });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/feedback', auth, async (req, res) => {
  try {
    const { recommendation_id, prediction_id, feedback_type, comment } = req.body;
    const id = 'fb-' + Date.now();
    runQuery(
      `INSERT INTO ai_feedback (id, recommendation_id, prediction_id, user_id, feedback_type, comment, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime("now"))`,
      [id, recommendation_id, prediction_id, req.user?.id, feedback_type, comment]
    );
    res.json({ ok: true, data: { id } });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/models', auth, async (req, res) => {
  try {
    const models = getAll('SELECT * FROM ai_models ORDER BY created_at DESC');
    res.json({ ok: true, data: models });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/detect-disease', async (req, res) => {
  try {
    const { image_url, temperature, humidity, soilMoisture } = req.body;

    let result;
    if (image_url) {
      result = await diseasePredictor.predictFromUrl(image_url);
    } else if (temperature !== undefined && humidity !== undefined) {
      const conditions = { temperature, humidity, soilMoisture };
      result = {
        disease: conditions.soilMoisture < 30 ? 'drought_stress' : conditions.temperature > 35 ? 'heat_stress' : 'healthy',
        confidence: '75%',
        rawScore: 0.75,
        method: 'sensor_fallback'
      };
    } else {
      result = diseasePredictor.fallbackPredict();
    }

    res.json({ ok: true, data: result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/predict-irrigation-lstm', async (req, res) => {
  try {
    const { historicalData, temperature, humidity, rainfall, soilMoisture } = req.body;

    let result;
    if (historicalData && Array.isArray(historicalData)) {
      result = await irrigationPredictor.predict(historicalData);
    } else if (temperature !== undefined) {
      result = await irrigationPredictor.predictFromSensors({ temperature, humidity, rainfall, soilMoisture });
    } else {
      result = irrigationPredictor.fallbackPredict(null);
    }

    res.json({ ok: true, data: result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/governance/report', auth, async (req, res) => {
  try {
    const report = aiEngine.getTelemetryHealth(req.query.farm_id);
    res.json({ ok: true, data: report });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/governance/audit', auth, async (req, res) => {
  try {
    const n = Math.min(parseInt(req.query.limit) || 20, 100);
    const audit = aiEngine.getAuditTrail(n);
    res.json({ ok: true, data: audit });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/governance/validate', auth, async (req, res) => {
  try {
    const { data } = req.body;
    if (!data || typeof data !== 'object') {
      return res.status(400).json({ ok: false, error: 'data object required' });
    }
    const validation = aiEngine.validateInputData(data);
    res.json({ ok: true, data: validation });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/ml/status', auth, async (req, res) => {
  try {
    res.json({
      ok: true,
      data: {
        lightgbm: LightGBMPredictor.getStatus(),
        automl: AutoMLService.getStatus(),
        federated: federatedClient.getStatus(),
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/ml/yield/predict', auth, async (req, res) => {
  try {
    const features = req.body;
    const prediction = await LightGBMPredictor.predict(features);
    res.json({ ok: true, data: { predictedYield: prediction, unit: 'tons/ha' } });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/ml/yield/predict-season', auth, async (req, res) => {
  try {
    const seasonData = req.body;
    const prediction = await LightGBMPredictor.predictSeason(seasonData);
    res.json({ ok: true, data: { predictedYield: prediction, unit: 'tons/ha', seasonData } });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/ml/yield/health', auth, async (req, res) => {
  try {
    const health = LightGBMPredictor.getHealth();
    res.json({ ok: true, data: health });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/ml/automl/train', auth, async (req, res) => {
  try {
    if (AutoMLService.isTraining) {
      return res.status(409).json({ ok: false, error: 'Training already in progress' });
    }
    const result = await AutoMLService.train(req.body);
    res.json({ ok: true, data: result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/ml/automl/status', auth, async (req, res) => {
  try {
    const status = AutoMLService.getStatus();
    res.json({ ok: true, data: status });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/ml/automl/health', auth, async (req, res) => {
  try {
    const health = AutoMLService.getHealth();
    res.json({ ok: true, data: health });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/ml/federated/submit', auth, async (req, res) => {
  try {
    const modelParams = req.body;
    const result = await federatedClient.submitModelUpdate(modelParams);
    res.json({ ok: true, data: result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/ml/federated/sync', auth, async (req, res) => {
  try {
    const result = await federatedClient.syncPendingUpdates();
    res.json({ ok: true, data: result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/ml/federated/status', auth, async (req, res) => {
  try {
    const status = federatedClient.getStatus();
    res.json({ ok: true, data: status });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/ml/bayesian/optimize', auth, async (req, res) => {
  try {
    const { iterations, bounds, objective } = req.body;
    const optimizer = new BayesianOptimizer({ bounds, iterations });
    
    const objectiveFunction = async (params) => {
      return objective(params);
    };
    
    const result = await optimizer.optimize(objectiveFunction, iterations);
    res.json({ ok: true, data: result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/ml/bayesian/recommend', auth, async (req, res) => {
  try {
    const { params, score } = req.body;
    const optimizer = new BayesianOptimizer();
    optimizer.bestParams = params;
    optimizer.bestScore = score;
    
    const recommendations = optimizer.getRecommendations();
    res.json({ ok: true, data: recommendations });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/ml/digital-twin/create', auth, async (req, res) => {
  try {
    const { farmId, initialState } = req.body;
    const twin = new DigitalTwin({ farmId, ...initialState });
    digitalTwins.set(farmId, twin);
    
    res.json({ ok: true, data: { farmId, status: twin.getStatus() } });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/ml/digital-twin/:farmId/predict', auth, async (req, res) => {
  try {
    const { farmId } = req.params;
    const { waterInput, temperature, fertilizerInput, days } = req.body;
    
    let twin = digitalTwins.get(farmId);
    if (!twin) {
      twin = new DigitalTwin({ farmId });
      digitalTwins.set(farmId, twin);
    }
    
    const result = twin.predict(waterInput, temperature, fertilizerInput, days);
    res.json({ ok: true, data: result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/ml/digital-twin/:farmId/update', auth, async (req, res) => {
  try {
    const { farmId } = req.params;
    const measurements = req.body;
    
    let twin = digitalTwins.get(farmId);
    if (!twin) {
      twin = new DigitalTwin({ farmId });
      digitalTwins.set(farmId, twin);
    }
    
    const result = twin.update(measurements);
    res.json({ ok: true, data: result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/ml/digital-twin/:farmId/simulate', auth, async (req, res) => {
  try {
    const { farmId } = req.params;
    const scenario = req.body;
    
    let twin = digitalTwins.get(farmId);
    if (!twin) {
      twin = new DigitalTwin({ farmId });
      digitalTwins.set(farmId, twin);
    }
    
    const result = twin.simulateScenario(scenario);
    res.json({ ok: true, data: result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/ml/digital-twin/:farmId/status', auth, async (req, res) => {
  try {
    const { farmId } = req.params;
    const twin = digitalTwins.get(farmId);
    
    if (!twin) {
      return res.status(404).json({ ok: false, error: 'Digital twin not found' });
    }
    
    res.json({ ok: true, data: twin.getStatus() });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/ml/digital-twin/:farmId/health', auth, async (req, res) => {
  try {
    const { farmId } = req.params;
    const twin = digitalTwins.get(farmId);
    
    if (!twin) {
      return res.status(404).json({ ok: false, error: 'Digital twin not found' });
    }
    
    res.json({ ok: true, data: twin.getHealth() });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.delete('/ml/digital-twin/:farmId', auth, async (req, res) => {
  try {
    const { farmId } = req.params;
    digitalTwins.delete(farmId);
    res.json({ ok: true, data: { message: `Digital twin ${farmId} deleted` } });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

module.exports = router;