'use strict';

class WeatherIntelligenceSkill {
  constructor() {
    this.id = 'weather-intelligence';
    this.name = 'Weather Intelligence';
    this.description = 'AI-powered weather-aware decision making for irrigation and farming operations';
    
    this.weatherThresholds = {
      rain: { light: 2, moderate: 10, heavy: 25 },
      temperature: { cold: 10, optimal: 25, hot: 35 },
      humidity: { low: 30, optimal: 60, high: 85 },
      wind: { calm: 10, moderate: 25, strong: 50 },
      uv: { low: 3, moderate: 6, high: 8, extreme: 11 }
    };

    this.cropRequirements = {
      rice: { minTemp: 20, maxTemp: 35, minHumidity: 70, optimalRainfall: 10 },
      vegetable: { minTemp: 15, maxTemp: 30, minHumidity: 60, optimalRainfall: 5 },
      fruit: { minTemp: 18, maxTemp: 32, minHumidity: 50, optimalRainfall: 7 },
      maize: { minTemp: 18, maxTemp: 35, minHumidity: 40, optimalRainfall: 8 }
    };

    this.forecast = null;
    this.lastUpdate = null;
  }

  async analyze(ctx) {
    const currentWeather = await this.getCurrentWeather();
    const forecast = await this.getForecast();
    const recommendations = this.generateRecommendations(currentWeather, forecast);
    const riskAssessment = this.assessWeatherRisks(currentWeather, forecast);
    const irrigationAdvice = this.getIrrigationAdvice(currentWeather, forecast);

    return {
      skill: this.id,
      timestamp: new Date().toISOString(),
      current: currentWeather,
      forecast: forecast.slice(0, 7),
      recommendations,
      riskAssessment,
      irrigationAdvice
    };
  }

  async getCurrentWeather() {
    try {
      const axios = require('axios');
      const lat = process.env.FARM_LAT || '10.7769';
      const lon = process.env.FARM_LON || '106.7009';
      
      const res = await axios.get(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,uv_index&timezone=auto`,
        { timeout: 5000 }
      );

      const current = res.data.current;
      this.lastUpdate = new Date().toISOString();

      return {
        temperature: current.temperature_2m,
        humidity: current.relative_humidity_2m,
        rainfall: current.precipitation,
        windSpeed: current.wind_speed_10m,
        uvIndex: current.uv_index,
        conditions: this.getConditions(current),
        timestamp: this.lastUpdate
      };
    } catch (e) {
      return this.getFallbackWeather();
    }
  }

  async getForecast() {
    try {
      const axios = require('axios');
      const lat = process.env.FARM_LAT || '10.7769';
      const lon = process.env.FARM_LON || '106.7009';
      
      const res = await axios.get(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max&forecast_days=7&timezone=auto`,
        { timeout: 5000 }
      );

      const daily = res.data.daily;
      const forecast = daily.time.map((date, i) => ({
        date,
        tempMax: daily.temperature_2m_max[i],
        tempMin: daily.temperature_2m_min[i],
        rainfall: daily.precipitation_sum[i],
        rainProbability: daily.precipitation_probability_max[i],
        windSpeed: daily.wind_speed_10m_max[i],
        conditions: this.getConditions({ 
          precipitation: daily.precipitation_sum[i],
          temperature_2m: (daily.temperature_2m_max[i] + daily.temperature_2m_min[i]) / 2
        })
      }));

      this.forecast = forecast;
      return forecast;
    } catch (e) {
      return this.getFallbackForecast();
    }
  }

  getConditions(data) {
    const conditions = [];
    
    if (data.precipitation > this.weatherThresholds.rain.heavy) conditions.push('heavy_rain');
    else if (data.precipitation > this.weatherThresholds.rain.moderate) conditions.push('rain');
    else if (data.precipitation > this.weatherThresholds.rain.light) conditions.push('light_rain');
    
    if (data.temperature_2m > this.weatherThresholds.temperature.hot) conditions.push('hot');
    else if (data.temperature_2m < this.weatherThresholds.temperature.cold) conditions.push('cold');
    else conditions.push('optimal');
    
    if (data.relative_humidity_2m < this.weatherThresholds.humidity.low) conditions.push('dry');
    else if (data.relative_humidity_2m > this.weatherThresholds.humidity.high) conditions.push('humid');
    
    return conditions;
  }

  generateRecommendations(current, forecast) {
    const recommendations = [];

    const rainyDays = forecast.filter(f => f.rainProbability > 60).length;
    if (rainyDays >= 3) {
      recommendations.push({
        type: 'postpone',
        priority: 'high',
        message: `${rainyDays} rainy days expected - postpone irrigation for 3+ days`
      });
    }

    if (current.temperature > this.weatherThresholds.temperature.hot) {
      recommendations.push({
        type: 'protect',
        priority: 'high',
        message: 'High temperature alert - ensure adequate shading for sensitive crops'
      });
    }

    const uvRisk = current.uvIndex > this.weatherThresholds.uv.high;
    if (uvRisk) {
      recommendations.push({
        type: 'protect',
        priority: 'medium',
        message: `UV index ${current.uvIndex} - extreme exposure risk`
      });
    }

    if (current.windSpeed > this.weatherThresholds.wind.moderate) {
      recommendations.push({
        type: 'secure',
        priority: 'medium',
        message: `Wind speed ${current.windSpeed}km/h - secure loose equipment`
      });
    }

    const upcomingRain = forecast.find(f => f.rainProbability > 70 && f.rainfall > 5);
    if (upcomingRain) {
      recommendations.push({
        type: 'prepare',
        priority: 'low',
        message: `Rain expected on ${upcomingRain.date} - prepare drainage`
      });
    }

    return recommendations;
  }

  assessWeatherRisks(current, forecast) {
    const risks = [];

    const heatDays = forecast.filter(f => f.tempMax > 38).length;
    if (heatDays > 0) risks.push({ type: 'heat', level: 'high', days: heatDays });

    const frostRisk = forecast.some(f => f.tempMin < 10);
    if (frostRisk) risks.push({ type: 'frost', level: 'medium', message: 'Frost risk in coming days' });

    const stormRisk = forecast.some(f => f.windSpeed > 50);
    if (stormRisk) risks.push({ type: 'storm', level: 'high', message: 'Storm risk detected' });

    const droughtWeeks = forecast.filter(f => f.rainProbability < 20).length;
    if (droughtWeeks >= 5) risks.push({ type: 'drought', level: 'medium', weeks: droughtWeeks });

    return {
      overall: risks.some(r => r.level === 'high') ? 'high' : risks.length > 0 ? 'medium' : 'low',
      risks,
      summary: risks.length === 0 ? 'No significant weather risks' : `${risks.length} weather risks identified`
    };
  }

  getIrrigationAdvice(current, forecast) {
    const advice = {
      shouldIrrigate: true,
      urgency: 'normal',
      reason: '',
      duration: 30,
      skipReason: null
    };

    const todayRain = forecast[0]?.rainfall || 0;
    const weekRain = forecast.reduce((sum, f) => sum + f.rainfall, 0);
    const rainProbability = forecast[0]?.rainProbability || 0;

    if (todayRain > 10) {
      advice.shouldIrrigate = false;
      advice.skipReason = 'Heavy rainfall today';
      advice.reason = 'Sufficient water from rain';
      advice.duration = 0;
    } else if (rainProbability > 70) {
      advice.shouldIrrigate = false;
      advice.skipReason = 'High rain probability expected';
      advice.reason = 'Rain expected within 24 hours';
      advice.duration = 0;
    } else if (weekRain > 30) {
      advice.shouldIrrigate = false;
      advice.skipReason = 'Sufficient weekly rainfall';
      advice.reason = `${weekRain.toFixed(1)}mm rain expected this week`;
      advice.duration = 0;
    } else if (current.humidity > 85) {
      advice.shouldIrrigate = false;
      advice.skipReason = 'High ambient humidity';
      advice.reason = 'Evaporation suppressed';
      advice.duration = 0;
    } else if (current.temperature > 35) {
      advice.urgency = 'high';
      advice.reason = 'High temperature - increase watering';
      advice.duration = 45;
    } else {
      advice.reason = 'Normal irrigation needed';
      advice.duration = 30;
    }

    return advice;
  }

  getFallbackWeather() {
    return {
      temperature: 28,
      humidity: 70,
      rainfall: 0,
      windSpeed: 5,
      uvIndex: 5,
      conditions: ['optimal'],
      timestamp: new Date().toISOString()
    };
  }

  getFallbackForecast() {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      days.push({
        date: date.toISOString().split('T')[0],
        tempMax: 32,
        tempMin: 24,
        rainfall: 0,
        rainProbability: 10,
        windSpeed: 8,
        conditions: ['optimal']
      });
    }
    return days;
  }

  getStatus() {
    return {
      skill: this.id,
      lastUpdate: this.lastUpdate,
      thresholds: this.weatherThresholds
    };
  }
}

module.exports = new WeatherIntelligenceSkill();