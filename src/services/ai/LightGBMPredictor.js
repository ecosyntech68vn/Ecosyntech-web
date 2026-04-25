/**
 * LightGBM Yield Predictor Service
 * Dự báo năng suất nông sản sử dụng mô hình LightGBM ONNX
 * 
 * ISO Standards: ISO 8601 (datetime), ISO 25010 (quality), ISO 27001 (security)
 * 
 * @version 1.0.0
 * @author EcoSynTech
 */

const ort = require('onnxruntime-node');
const mlMetrics = require('../../metrics/mlMetrics');
const WebLocalBridge = require('../../services/weblocal/WebLocalBridge');
const path = require('path');
const fs = require('fs');
const logger = require('../../config/logger');
const { getBreaker } = require('../circuitBreaker');

const DEFAULT_MODEL_PATH = path.join(__dirname, '../../../models/lightgbm_yield.onnx');

const FEATURE_NAMES = [
  'temperature_avg',
  'rainfall_mm',
  'fertilizer_kg',
  'soil_ph',
  'sun_hours',
  'humidity_avg',
  'pest_presence',
  'disease_presence'
];

const breakerConfig = {
  failureThreshold: 3,
  timeout: 30000,
  resetTimeout: 60000
};

const lgbmBreaker = getBreaker('lightgbm-predictor', breakerConfig);

class LightGBMPredictor {
  constructor(options = {}) {
    this.modelPath = options.modelPath || DEFAULT_MODEL_PATH;
    this.session = null;
    this.isInitialized = false;
    this.inputName = null;
    this.outputName = null;
    this.featureNames = options.featureNames || FEATURE_NAMES;
    this.useFallback = true;
    this.fallbackModel = this._initFallbackModel();
    this.lastPrediction = null;
    this.predictionCount = 0;
    this.errorCount = 0;
  }

  _initFallbackModel() {
    return {
      weights: {
        temperature_avg: 0.15,
        rainfall_mm: 0.08,
        fertilizer_kg: 0.12,
        soil_ph: 0.20,
        sun_hours: 0.10,
        humidity_avg: 0.05,
        pest_presence: -0.15,
        disease_presence: -0.18
      },
      baseYield: 8.5,
      intercept: 1.2
    };
  }

  async initialize() {
    if (this.isInitialized && this.session) {
      return this.session;
    }

    return lgbmBreaker.fire(async () => {
      try {
        if (!fs.existsSync(this.modelPath)) {
          logger.warn('[LightGBM] Model file not found, using fallback prediction');
          this.useFallback = true;
          this.isInitialized = true;
          return null;
        }

        logger.info('[LightGBM] Loading ONNX model...');
        this.session = await ort.InferenceSession.create(this.modelPath);
        
        this.inputName = this.session.inputNames[0];
        this.outputName = this.session.outputNames[0];
        
        this.useFallback = false;
        this.isInitialized = true;
        
        logger.info(`[LightGBM] Model loaded successfully. Input: ${this.inputName}, Output: ${this.outputName}`);
        return this.session;
        
      } catch (error) {
        logger.error('[LightGBM] Model load failed:', error.message);
        this.useFallback = true;
        this.isInitialized = true;
        throw error;
      }
    });
  }

  async reloadModel() {
    logger.info('[LightGBM] Reloading model...');
    this.session = null;
    this.isInitialized = false;
    this.useFallback = true;
    await this.initialize();
  }

  _validateFeatures(features) {
    const validated = {};
    for (const name of this.featureNames) {
      let value = features[name];
      
      if (value === undefined || value === null) {
        value = 0;
      }
      
      if (typeof value !== 'number' || isNaN(value)) {
        logger.warn(`[LightGBM] Invalid value for ${name}, using 0`);
        value = 0;
      }
      
      validated[name] = value;
    }
    return validated;
  }

  _normalizeFeatures(features) {
    const normalized = { ...features };
    
    normalized.temperature_avg = Math.max(-10, Math.min(50, features.temperature_avg));
    normalized.rainfall_mm = Math.max(0, Math.min(2000, features.rainfall_mm));
    normalized.fertilizer_kg = Math.max(0, Math.min(1000, features.fertilizer_kg));
    normalized.soil_ph = Math.max(3, Math.min(9, features.soil_ph));
    normalized.sun_hours = Math.max(0, Math.min(16, features.sun_hours));
    normalized.humidity_avg = Math.max(0, Math.min(100, features.humidity_avg));
    normalized.pest_presence = Math.max(0, Math.min(1, features.pest_presence));
    normalized.disease_presence = Math.max(0, Math.min(1, features.disease_presence));
    
    return normalized;
  }

  async predict(features) {
    await this.initialize();
    
    const validatedFeatures = this._validateFeatures(features);
    const t0 = process.hrtime.bigint();
    const normalizedFeatures = this._normalizeFeatures(validatedFeatures);
    
    if (this.useFallback || !this.session) {
      const res = this._fallbackPredict(normalizedFeatures);
      const durationFallback = 0; // fallback path is fast; duration not critical here
      if (mlMetrics && mlMetrics.record) mlMetrics.record('LightGBM', 'predict', durationFallback, 'fallback');
      // Report to Web Local (best-effort)
      try {
        await WebLocalBridge.sendReport({
          model: 'LightGBM Yield Predictor',
          event: 'predict',
          latencyMs: durationFallback,
          outcome: 'fallback',
          details: { features: normalizedFeatures }
        });
      } catch (e) {
        // swallow web local errors
      }
      return res;
    }

    try {
      const inputArray = this.featureNames.map(name => normalizedFeatures[name]);
      const float32Data = new Float32Array(inputArray);
      const tensor = new ort.Tensor('float32', float32Data, [1, this.featureNames.length]);
      
      const feeds = { [this.inputName]: tensor };
      const results = await this.session.run(feeds);
      const outputTensor = results[this.outputName];
      
      let predictedYield = outputTensor.data[0];
      predictedYield = Math.max(0, Math.min(50, predictedYield));
      
      this.lastPrediction = {
        yield: predictedYield,
        features: normalizedFeatures,
        timestamp: new Date().toISOString(),
        method: 'lightgbm_onnx'
      };
      this.predictionCount++;
      
      logger.info(`[LightGBM] Predicted yield: ${predictedYield.toFixed(2)} tons/ha`);
      const durationSec = Number(process.hrtime.bigint() - t0) / 1e9;
      const latencyMs = durationSec * 1000;
      if (mlMetrics && mlMetrics.record) mlMetrics.record('LightGBM', 'predict', durationSec, 'success');
      // Report to Web Local
      try {
        await WebLocalBridge.sendReport({
          model: 'LightGBM Yield Predictor',
          event: 'predict',
          latencyMs,
          outcome: 'success',
          result: predictedYield,
          features: normalizedFeatures
        });
      } catch (e) {
        // ignore reporting failures
      }
      return Math.round(predictedYield * 100) / 100;
      
    } catch (error) {
      this.errorCount++;
      logger.error(`[LightGBM] Prediction error: ${error.message}`);
      const durationSec = Number(process.hrtime.bigint() - t0) / 1e9;
      if (mlMetrics && mlMetrics.record) mlMetrics.record('LightGBM', 'predict', durationSec, 'error');
      return this._fallbackPredict(normalizedFeatures);
    }
  }

  _fallbackPredict(features) {
    const model = this.fallbackModel;
    let predictedYield = model.baseYield;
    
    for (const [feature, weight] of Object.entries(model.weights)) {
      if (features[feature] !== undefined) {
        predictedYield += features[feature] * weight;
      }
    }
    
    predictedYield += model.intercept;
    predictedYield = Math.max(0, Math.min(50, predictedYield));
    
    this.lastPrediction = {
      yield: predictedYield,
      features: features,
      timestamp: new Date().toISOString(),
      method: 'fallback_regression'
    };
    this.predictionCount++;
    
    logger.info(`[LightGBM] Fallback predicted yield: ${predictedYield.toFixed(2)} tons/ha`);
    return Math.round(predictedYield * 100) / 100;
  }

  async predictBatch(featureList) {
    const results = [];
    for (const features of featureList) {
      const result = await this.predict(features);
      results.push(result);
    }
    return results;
  }

  async predictSeason(seasonData) {
    const features = {
      temperature_avg: seasonData.avgTemperature || 0,
      rainfall_mm: seasonData.totalRainfall || 0,
      fertilizer_kg: seasonData.totalFertilizer || 0,
      soil_ph: seasonData.avgSoilPH || 7.0,
      sun_hours: seasonData.totalSunHours || 0,
      humidity_avg: seasonData.avgHumidity || 50,
      pest_presence: seasonData.pestLevel || 0,
      disease_presence: seasonData.diseaseLevel || 0
    };
    
    return await this.predict(features);
  }

  getStatus() {
    return {
      initialized: this.isInitialized,
      modelLoaded: !this.useFallback,
      modelPath: this.modelPath,
      predictionCount: this.predictionCount,
      errorCount: this.errorCount,
      lastPrediction: this.lastPrediction,
      featureNames: this.featureNames,
      timestamp: new Date().toISOString()
    };
  }

  getHealth() {
    const errorRate = this.predictionCount > 0 ? this.errorCount / this.predictionCount : 0;
    const base = {
      healthy: errorRate < 0.1 && this.isInitialized,
      errorRate: Math.round(errorRate * 100) / 100,
      modelAvailable: !this.useFallback,
      sessionActive: this.session !== null
    };
    // Web Local health integration
    try {
      base.weblocal = WebLocalBridge.getHealth ? WebLocalBridge.getHealth() : { enabled: false };
    } catch (e) {
      base.weblocal = { enabled: false };
    }
    return base;
  }
}

module.exports = new LightGBMPredictor();
