const { getAll, getOne, runQuery } = require('../config/database');
const logger = require('../config/logger');
const { getBreaker } = require('./circuitBreaker');
const { retry } = require('./retryService');
const fuzzyController = require('./IrrigationFuzzyController');

class WaterOptimizationService {
  constructor() {
    this.enabled = process.env.WATER_OPTIMIZATION_ENABLED === 'true';
    this.minMoisture = parseFloat(process.env.WATER_MIN_MOISTURE || '30');
    this.maxMoisture = parseFloat(process.env.WATER_MAX_MOISTURE || '70');
    this.checkIntervalMs = parseInt(process.env.WATER_CHECK_INTERVAL || '300000');
    this.timer = null;
    
    this.weatherBreaker = getBreaker('water-weather', { 
      failureThreshold: 3, 
      timeout: 30000 
    });
  }

  start() {
    if (!this.enabled) {
      logger.info('[WaterOpt] Tắt ( WATER_OPTIMIZATION_ENABLED=false )');
      return;
    }
    logger.info('[WaterOpt] Khởi động tưới tiêu thông minh');
    this.scheduleCheck();
  }

  scheduleCheck() {
    this.timer = setTimeout(() => {
      this.checkAndOptimize();
      this.scheduleCheck();
    }, this.checkIntervalMs);
  }

  async getCropKc(cropType, growthStage) {
    const kcValues = {
      rice: { initial: 0.9, mid: 1.2, late: 0.9 },
      maize: { initial: 0.9, mid: 1.15, late: 0.7 },
      vegetable: { initial: 0.9, mid: 1.1, late: 0.8 },
      fruit: { initial: 0.9, mid: 1.05, late: 0.85 },
      default: { initial: 0.9, mid: 1.1, late: 0.8 }
    };
    const kc = kcValues[cropType] || kcValues.default;
    return kc[growthStage] || kc.mid;
  }

  calculateET0(temp, humidity, wind, solar) {
    if (!temp) return 4;
    const es = 0.6108 * Math.exp((17.27 * temp) / (temp + 237.3));
    const ea = es * (humidity / 100);
    const delta = (4098 * es) / Math.pow(temp + 237.3, 2);
    const u2 = wind || 2;
    const rs = solar || 15;
    const gamma = 0.665 * 0.001 * 101.3;
    return (0.408 * delta * es + gamma * u2 * (es - ea)) / (delta + gamma * u2 * 0.34);
  }

  async getIrrigationRecommendation(farmId = null) {
    const useFuzzy = process.env.USE_FUZZY_IRRIGATION === 'true';
    
    if (useFuzzy) {
      return this.getFuzzyIrrigationRecommendation(farmId);
    }
    
    return this.getET0IrrigationRecommendation(farmId);
  }

  async getFuzzyIrrigationRecommendation(farmId = null) {
    try {
      const whereClause = farmId ? 'WHERE zone LIKE ?' : '';
      const params = farmId ? [`%${farmId}%`] : [];
      const sensors = getAll(
        `SELECT type, value FROM sensors ${whereClause}`,
        params
      );
      
      const soilMoisture = sensors.find(s => s.type === 'soil')?.value || 30;
      const weatherData = await this.getWeatherForecast();
      
      const targetMoisture = (this.minMoisture + this.maxMoisture) / 2;
      const rainProb = weatherData?.rainfall !== undefined 
        ? Math.min(100, (weatherData.rainfall > 0 ? 80 : 0))
        : 0;
      const hour = new Date().getHours();
      
      const fuzzyDuration = fuzzyController.compute(
        targetMoisture,
        soilMoisture,
        rainProb,
        hour
      );
      
      const explanation = fuzzyController.explainDecision(
        targetMoisture,
        soilMoisture,
        rainProb,
        hour
      );
      
      const action = fuzzyDuration > 0 ? 'irrigate' : 'wait';
      
      return {
        action,
        duration: fuzzyDuration,
        reason: explanation.reason,
        soilMoisture,
        method: 'fuzzy',
        explanation: explanation
      };
    } catch (e) {
      logger.warn('[WaterOpt] Fuzzy recommendation error, fallback to ET0:', e.message);
      return this.getET0IrrigationRecommendation(farmId);
    }
  }

  async getET0IrrigationRecommendation(farmId = null) {
    try {
      const whereClause = farmId ? 'WHERE zone LIKE ?' : '';
      const params = farmId ? [`%${farmId}%`] : [];
      const sensors = getAll(
        `SELECT type, value FROM sensors ${whereClause}`,
        params
      );
      
      const soilMoisture = sensors.find(s => s.type === 'soil')?.value || 0;
      const temperature = sensors.find(s => s.type === 'temperature')?.value || 25;
      const humidity = sensors.find(s => s.type === 'humidity')?.value || 60;
      
      const weatherData = await this.getWeatherForecast();
      const et0 = this.calculateET0(
        weatherData?.temp || temperature,
        weatherData?.humidity || humidity,
        weatherData?.wind,
        weatherData?.solar
      );
      
      const crops = getAll('SELECT * FROM crops WHERE status = "active"');
      let totalKc = 0;
      for (const crop of crops) {
        const stage = this.getGrowthStage(crop.planting_date);
        totalKc += await this.getCropKc(crop.variety || 'default', stage);
      }
      const avgKc = crops.length ? totalKc / crops.length : 1.0;
      const etc = et0 * avgKc;
      const irrigationNeedMm = Math.max(0, etc - (soilMoisture / 10));
      const duration = Math.round(irrigationNeedMm * 2);

      const action = soilMoisture < this.minMoisture && duration > 0 ? 'irrigate' : 'wait';
      const reason = soilMoisture < this.minMoisture 
        ? `Độ ẩm ${soilMoisture.toFixed(0)}% < ngưỡng ${this.minMoisture}%` 
        : soilMoisture > this.maxMoisture 
          ? `Độ ẩm ${soilMoisture.toFixed(0)}% > ngưỡng ${this.maxMoisture}%` 
          : 'Độ ẩm trong ngưỡng cho phép';

      return {
        action,
        duration,
        reason,
        soilMoisture,
        et0: et0.toFixed(2),
        etc: etc.toFixed(2),
        weatherSource: weatherData ? 'api' : 'sensor'
      };
    } catch (e) {
      logger.warn('[WaterOpt] Lỗi:', e.message);
      return { action: 'wait', duration: 0, error: e.message };
    }
  }

  async getWeatherForecast() {
    const fallbackWeather = {
      temp: 28,
      humidity: 70,
      rainfall: 0,
      wind: 2,
      solar: 15
    };

    try {
      return await this.weatherBreaker.execute(async () => {
        return await retry(async () => {
          const lat = process.env.FARM_LAT || '10.7769';
          const lon = process.env.FARM_LON || '106.7009';
          
          const axios = require('axios');
          const res = await axios.get(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m&forecast_days=2&timezone=auto`,
            { timeout: 5000 }
          );
          const hourly = res.data.hourly;
          const now = new Date();
          const idx = hourly?.time?.findIndex(t => new Date(t) >= now) ?? -1;
          const safeIdx = idx >= 0 ? idx : 0;
          
          return {
            temp: hourly?.temperature_2m?.[safeIdx] || fallbackWeather.temp,
            humidity: hourly?.relative_humidity_2m?.[safeIdx] || fallbackWeather.humidity,
            rainfall: hourly?.precipitation?.[safeIdx] || fallbackWeather.rainfall,
            wind: hourly?.wind_speed_10m?.[safeIdx] || fallbackWeather.wind
          };
        }, {
          maxRetries: 2,
          initialDelay: 500,
          backoffFactor: 2,
          onRetry: (info) => logger.warn(`[WaterOpt] Weather retry ${info.attempt}: ${info.error}`)
        });
      });
    } catch (error) {
      logger.warn(`[WaterOpt] Weather API failed, using fallback: ${error.message}`);
      return fallbackWeather;
    }
  }

  getGrowthStage(plantingDate) {
    if (!plantingDate) return 'mid';
    const days = Math.floor((Date.now() - new Date(plantingDate).getTime()) / 86400000);
    if (days < 30) return 'initial';
    if (days < 60) return 'mid';
    return 'late';
  }

  async checkAndOptimize() {
    const rec = await this.getIrrigationRecommendation();
    if (rec.action === 'irrigate' && rec.duration > 0) {
      this.triggerIrrigation(rec);
    }
  }

  triggerIrrigation(recommendation) {
    try {
      const pumpDevices = getAll('SELECT * FROM devices WHERE type = \'pump\' AND status = \'online\'');
      for (const pump of pumpDevices) {
        const config = JSON.parse(pump.config || '{}');
        if (config.autoMode) {
          runQuery(
            'INSERT INTO history (id, action, trigger, status, timestamp) VALUES (?, ?, ?, ?, datetime("now"))',
            [`irrigation-${Date.now()}`, 'auto_irrigate', recommendation.reason, 'pending']
          );
          logger.info(`[WaterOpt] Tưới tự động: ${recommendation.duration} phút - ${recommendation.reason}`);
        }
      }
    } catch (e) {
      logger.warn('[WaterOpt] Lỗi kích hoạt:', e.message);
    }
  }

  stop() {
    if (this.timer) clearTimeout(this.timer);
  }
  
  getCircuitBreakerStatus() {
    return this.weatherBreaker.getState();
  }
}

module.exports = new WaterOptimizationService();