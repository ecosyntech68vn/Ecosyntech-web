/**
 * Aurora Weather Service - Node.js wrapper for Aurora Python service
 * 
 * Provides weather predictions using lightweight ML model
 * Alternative to full Aurora model for resource-constrained environments
 * 
 * @version 1.0.0
 */

const { spawn } = require('child_process');
const path = require('path');
const logger = require('../../config/logger');

const AURORA_SCRIPT_PATH = path.join(__dirname, '../../../ml/aurora_service.py');

class AuroraService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 30 * 60 * 1000;
  }

  _getCacheKey(lat, lon, date) {
    return `${lat}_${lon}_${date}`;
  }

  _isCacheValid(timestamp) {
    return Date.now() - timestamp < this.cacheTimeout;
  }

  async forecast(lat, lon, dateStr = null) {
    const date = dateStr || new Date().toISOString().split('T')[0];
    const cacheKey = this._getCacheKey(lat, lon, date);
    
    const cached = this.cache.get(cacheKey);
    if (cached && this._isCacheValid(cached.timestamp)) {
      logger.info('[Aurora] Returning cached forecast');
      return cached.data;
    }

    return new Promise((resolve, reject) => {
      const t0 = Date.now();
      const pythonProcess = spawn('python3', [
        AURORA_SCRIPT_PATH,
        lat.toString(),
        lon.toString(),
        date
      ]);

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      // Safety timer to prevent hung processes
      const killTimer = setTimeout(() => {
        try { pythonProcess.kill(); } catch (e) { /* ignore */ }
      }, 15000);

      pythonProcess.on('close', (code) => {
        const durationSec = (Date.now() - t0) / 1000;
        try { if (typeof mlMetrics !== 'undefined' && mlMetrics && mlMetrics.record) mlMetrics.record('Aurora','forecast', durationSec, code === 0 ? 'success' : 'error'); } catch (e) { /* ignore metrics errors */ }
        clearTimeout(killTimer);
        if (code !== 0) {
          logger.error(`[Aurora] Python process failed: ${stderr}`);
          resolve(this._getFallbackForecast(lat, lon, date));
          return;
        }

        try {
          const forecast = JSON.parse(stdout);
          
          this.cache.set(cacheKey, {
            timestamp: Date.now(),
            data: forecast
          });

          logger.info(`[Aurora] Forecast: ${forecast.temperature}°C, ${forecast.humidity}% humidity`);
          resolve(forecast);
        } catch (parseError) {
          logger.error(`[Aurora] Parse error: ${parseError.message}`);
          resolve(this._getFallbackForecast(lat, lon, date));
        }
      });

      pythonProcess.on('error', (err) => {
        clearTimeout(killTimer);
        logger.error(`[Aurora] Spawn error: ${err.message}`);
        resolve(this._getFallbackForecast(lat, lon, date));
      });
    });
  }

  _getFallbackForecast(lat, lon, date) {
    const dayOfYear = new Date(date).getMonth() * 30 + new Date(date).getDate();
    const seasonalTemp = 25 + 10 * Math.sin((dayOfYear - 90) * 2 * Math.PI / 365);
    const latAdjust = (lat - 10) / 20 * 5;

    return {
      temperature: Math.round((seasonalTemp + latAdjust + (Math.random() - 0.5) * 3) * 10) / 10,
      humidity: Math.round(70 + (Math.random() - 0.5) * 20),
      rainfall: Math.round(Math.random() * 5 * 10) / 10,
      wind_speed: Math.round((8 + (Math.random() - 0.5) * 4) * 10) / 10,
      forecast_date: date,
      location: { lat, lon },
      model: 'aurora_fallback_v1'
    };
  }

  async forecastRange(lat, lon, startDate, days = 7) {
    const forecasts = [];
    const start = new Date(startDate);

    for (let i = 0; i < days; i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      const forecast = await this.forecast(lat, lon, dateStr);
      forecasts.push(forecast);
    }

    return forecasts;
  }

  async getCurrentWeather(lat, lon) {
    return this.forecast(lat, lon, new Date().toISOString().split('T')[0]);
  }

  async get7DayForecast(lat, lon) {
    const today = new Date().toISOString().split('T')[0];
    return this.forecastRange(lat, lon, today, 7);
  }

  clearCache() {
    this.cache.clear();
    logger.info('[Aurora] Cache cleared');
  }

  getStatus() {
    return {
      cacheSize: this.cache.size,
      cacheTimeout: this.cacheTimeout,
      scriptPath: AURORA_SCRIPT_PATH
    };
  }

  getHealth() {
    const weblocalHealth = (typeof require('../../services/weblocal/WebLocalBridge').getHealth === 'function') ? require('../../services/weblocal/WebLocalBridge').getHealth() : { healthy: true };
    return {
      healthy: true,
      cacheSize: this.cache.size,
      cacheTimeout: this.cacheTimeout,
      scriptPath: AURORA_SCRIPT_PATH
      , weblocal: weblocalHealth
    };
  }
}

module.exports = new AuroraService();
