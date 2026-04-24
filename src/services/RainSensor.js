'use strict';

class RainSensor {
  constructor(pin = 34, dryValue = 4095, wetValue = 0) {
    this.pin = pin;
    this.dryValue = dryValue;
    this.wetValue = wetValue;
    this.isRaining = false;
    this.rainIntensity = 0;
    this.lastRainTime = null;
    this.rainHistory = [];
  }

  read() {
    try {
      const ADC = require('adc');
      const adc = new ADC(this.pin);
      const rawValue = adc.read();
      
      this.rainIntensity = 100 - ((rawValue - this.wetValue) / (this.dryValue - this.wetValue) * 100);
      this.rainIntensity = Math.max(0, Math.min(100, this.rainIntensity));
      
      this.isRaining = this.rainIntensity > 30;
      
      if (this.isRaining) {
        this.lastRainTime = Date.now();
      }
      
      this.rainHistory.push({
        intensity: this.rainIntensity,
        isRaining: this.isRaining,
        timestamp: new Date().toISOString()
      });
      
      if (this.rainHistory.length > 100) {
        this.rainHistory.shift();
      }
      
      return {
        rawValue,
        intensity: Math.round(this.rainIntensity),
        isRaining: this.isRaining,
        timestamp: new Date().toISOString()
      };
    } catch (e) {
      return this.getSimulatedReading();
    }
  }

  getSimulatedReading() {
    return {
      rawValue: 2048,
      intensity: 50,
      isRaining: false,
      timestamp: new Date().toISOString(),
      simulated: true
    };
  }

  getRecentRainMinutes(minutes = 60) {
    const cutoff = Date.now() - minutes * 60000;
    return this.rainHistory.filter(r => 
      r.isRaining && new Date(r.timestamp).getTime() > cutoff
    ).length;
  }

  getStatus() {
    return {
      isRaining: this.isRaining,
      intensity: this.rainIntensity,
      lastRainTime: this.lastRainTime,
      historyLength: this.rainHistory.length
    };
  }
}

module.exports = RainSensor;