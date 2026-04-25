const ort = require('onnxruntime-node');
const fs = require('fs');
const path = require('path');
const logger = require('../../config/logger');
const mlMetrics = require('../../metrics/mlMetrics');
const WebLocalBridge = require('../../services/weblocal/WebLocalBridge');

const DEFAULT_MODEL_PATH = path.join(__dirname, '../../../models/irrigation_lstm.onnx');

class LSTMIrrigationPredictor {
  constructor(modelPath) {
    this.modelPath = modelPath || DEFAULT_MODEL_PATH;
    this.session = null;
    this.useFallback = true;
  }

  async loadModel() {
    if (this.session) return;

    try {
      if (!fs.existsSync(this.modelPath)) {
        logger.warn('[LSTM] Model file not found, using fallback');
        this.useFallback = true;
        return;
      }

      this.session = await ort.InferenceSession.create(this.modelPath);
      this.useFallback = false;
      logger.info('[LSTM] Model loaded successfully');
    } catch (e) {
      logger.warn('[LSTM] Model load failed, using fallback:', e.message);
      this.useFallback = true;
    }
  }

  async predict(historicalData) {
    await this.loadModel();
    const t0 = process.hrtime.bigint();

    if (this.useFallback || !this.session) {
      const res = this.fallbackPredict(historicalData?.[0]);
      const durationSec = Number(process.hrtime.bigint() - t0) / 1e9;
      if (typeof mlMetrics !== 'undefined' && mlMetrics && mlMetrics.record) mlMetrics.record('Irrigation','predict', durationSec, 'fallback');
      return res;
    }

    if (!Array.isArray(historicalData) || historicalData.length === 0) {
      return this.fallbackPredict(null);
    }

    if (historicalData.length < 3) {
      const lastDay = historicalData[historicalData.length - 1];
      return this.fallbackPredict(lastDay);
    }

    try {
      const seqLen = 3;
      const inputSize = 4;
      
      const flatFeatures = [];
      for (let i = 0; i < seqLen; i++) {
        const day = historicalData[i] || {};
        flatFeatures.push((day.temp || day.temperature || 25) / 40);
        flatFeatures.push((day.humidity || 70) / 100);
        flatFeatures.push((day.rainfall || day.precipitation || 0) / 20);
        flatFeatures.push((day.soilMoisture || 50) / 100);
      }
      
      const inputArray = new Float32Array(flatFeatures);
      const inputTensor = new ort.Tensor('float32', inputArray, [1, 12]);
      const feeds = { float_input: inputTensor };

      try {
        const results = await this.session.run(feeds);
        const waterAmount = results.output?.data?.[0] || results[Object.keys(results)[0]]?.data?.[0];

        inputTensor.dispose();
        const durationSec = Number(process.hrtime.bigint() - t0) / 1e9;
        if (typeof mlMetrics !== 'undefined' && mlMetrics && mlMetrics.record) mlMetrics.record('Irrigation','predict', durationSec, 'success');
        try {
          await WebLocalBridge.sendReport({
            model: 'Irrigation LSTM Predictor',
            event: 'predict',
            latencyMs: durationSec * 1000,
            outcome: 'success',
            result: waterAmount,
            features: normalizedFeatures
          });
        } catch (e) {
          // ignore bridge errors
        }
        return this.normalizeWaterResult(waterAmount);
      } catch (inferError) {
        logger.warn('[LSTM] Inference error:', inferError.message);
        const durationSec = Number(process.hrtime.bigint() - t0) / 1e9;
        if (typeof mlMetrics !== 'undefined' && mlMetrics && mlMetrics.record) mlMetrics.record('Irrigation','predict', durationSec, 'fallback');
        try {
          await WebLocalBridge.sendReport({
            model: 'Irrigation LSTM Predictor',
            event: 'predict',
            latencyMs: durationSec * 1000,
            outcome: 'fallback',
            features: normalizedFeatures
          });
        } catch (e) { /* ignore */ }
        return this.fallbackPredict(historicalData[historicalData.length - 1]);
      }
    } catch (e) {
      logger.warn('[LSTM] Prediction error:', e.message);
      const durationSec = Number(process.hrtime.bigint() - t0) / 1e9;
      if (typeof mlMetrics !== 'undefined' && mlMetrics && mlMetrics.record) mlMetrics.record('Irrigation','predict', durationSec, 'error');
      try {
        await WebLocalBridge.sendReport({
          model: 'Irrigation LSTM Predictor',
          event: 'predict',
          latencyMs: durationSec * 1000,
          outcome: 'error',
          error: e.message,
          features: normalizedFeatures
        });
      } catch (br) {
        // ignore bridge errors
      }
      return this.fallbackPredict(historicalData[historicalData.length - 1]);
    }
  }

  normalizeWaterResult(value) {
    const waterMm = Math.abs(value || 0);
    const clamped = Math.min(50, Math.max(0, waterMm));
    return {
      recommendedWater_mm: clamped.toFixed(1),
      unit: 'mm',
      confidence: '75%',
      method: 'lstm'
    };
  }

  fallbackPredict(currentData) {
    let water = 5.0;

    if (currentData) {
      const temp = currentData.temp || currentData.temperature || 25;
      const humidity = currentData.humidity || 70;
      const rainfall = currentData.rainfall || currentData.precipitation || 0;
      const soilMoisture = currentData.soilMoisture || 50;

      if (temp > 30) water += 2;
      if (temp > 35) water += 1.5;
      if (humidity < 60) water += 1;
      if (humidity < 40) water += 1.5;
      if (rainfall > 5) water -= 2;
      if (soilMoisture > 70) water *= 0.5;
      else if (soilMoisture > 50) water *= 0.75;
      if (soilMoisture < 30) water += 2;
    }

    const clamped = Math.min(30, Math.max(0, water));

    return {
      recommendedWater_mm: clamped.toFixed(1),
      unit: 'mm',
      confidence: '60%',
      method: 'heuristic_fallback',
      note: 'Model not loaded - using rule-based prediction'
    };
  }

  async predictFromSensors(sensorData) {
    const historical = [];

    for (let i = 0; i < 3; i++) {
      historical.push({
        temp: sensorData.temperature || 25 - i,
        humidity: (sensorData.humidity || 70) - i * 5,
        rainfall: i === 0 ? (sensorData.rainfall || 0) : 0,
        soilMoisture: (sensorData.soilMoisture || 50) - i * 10
      });
    }

    return this.predict(historical);
  }

  dispose() {
    if (this.session) {
      this.session = null;
    }
  }
  getHealth() {
    const weblocalHealth = (typeof WebLocalBridge !== 'undefined' && WebLocalBridge.getHealth) ? WebLocalBridge.getHealth() : { enabled: false };
    return {
      healthy: !this.useFallback && !!this.session,
      sessionActive: !!this.session,
      fallback: this.useFallback
      , weblocal: weblocalHealth
    };
  }
}

module.exports = LSTMIrrigationPredictor;
