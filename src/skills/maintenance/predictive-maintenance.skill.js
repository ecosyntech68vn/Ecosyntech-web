'use strict';

class PredictiveMaintenanceSkill {
  constructor() {
    this.id = 'predictive-maintenance';
    this.name = 'Predictive Maintenance';
    this.description = 'AI-powered device failure prediction using historical sensor data';
    
    this.thresholds = {
      temperature: { warn: 65, critical: 80 },
      humidity: { warn: 85, critical: 95 },
      signalStrength: { warn: -70, critical: -85 },
      uptime: { warn: 30 * 24 * 60, critical: 60 * 24 * 60 },
      errorRate: { warn: 5, critical: 15 },
      battery: { warn: 20, critical: 10 }
    };

    this.deviceHealthScores = new Map();
    this.anomalyPatterns = new Map();
  }

  async analyze(ctx) {
    const devices = this.getDevices();
    const predictions = [];

    for (const device of devices) {
      const healthScore = await this.calculateHealthScore(device);
      const failureProbability = await this.predictFailureProbability(device);
      const predictedFailureDate = this.estimateFailureDate(failureProbability, device.lastMaintenance);
      
      const recommendation = this.generateRecommendation(healthScore, failureProbability, device);
      
      predictions.push({
        deviceId: device.id,
        deviceType: device.type,
        healthScore: healthScore.toFixed(1),
        failureProbability: (failureProbability * 100).toFixed(1),
        predictedFailureDate,
        recommendation,
        riskLevel: failureProbability > 0.7 ? 'critical' : failureProbability > 0.4 ? 'warning' : 'normal',
        factors: this.getContributingFactors(device)
      });
    }

    return {
      skill: this.id,
      timestamp: new Date().toISOString(),
      deviceCount: devices.length,
      atRiskDevices: predictions.filter(p => p.riskLevel !== 'normal').length,
      predictions: predictions.sort((a, b) => b.failureProbability - a.failureProbability),
      summary: this.generateSummary(predictions)
    };
  }

  async calculateHealthScore(device) {
    let score = 100;
    const factors = [];

    if (device.temperature > this.thresholds.temperature.warn) {
      const penalty = (device.temperature - this.thresholds.temperature.warn) * 2;
      score -= Math.min(penalty, 30);
      factors.push('high_temperature');
    }

    if (device.signalStrength < this.thresholds.signalStrength.warn) {
      const penalty = Math.abs(device.signalStrength - this.thresholds.signalStrength.warn);
      score -= Math.min(penalty * 0.5, 20);
      factors.push('weak_signal');
    }

    if (device.errorRate > this.thresholds.errorRate.warn) {
      score -= Math.min(device.errorRate * 2, 25);
      factors.push('high_error_rate');
    }

    const daysSinceMaintenance = this.getDaysSince(device.lastMaintenance);
    if (daysSinceMaintenance > this.thresholds.uptime.warn / (24 * 60)) {
      score -= Math.min((daysSinceMaintenance - 30) * 0.5, 15);
      factors.push('overdue_maintenance');
    }

    if (device.battery && device.battery < this.thresholds.battery.warn) {
      score -= Math.min((this.thresholds.battery.warn - device.battery) * 1.5, 20);
      factors.push('low_battery');
    }

    this.deviceHealthScores.set(device.id, { score, factors, timestamp: Date.now() });
    return Math.max(0, score);
  }

  async predictFailureProbability(device) {
    const healthData = this.deviceHealthScores.get(device.id) || { score: 100 };
    const baseProbability = 1 - (healthData.score / 100);
    
    const trendFactor = this.calculateTrendFactor(device);
    const patternFactor = this.detectAnomalyPattern(device);
    const seasonalFactor = this.getSeasonalFactor();

    let probability = baseProbability * 0.4 + trendFactor * 0.3 + patternFactor * 0.2 + seasonalFactor * 0.1;
    
    return Math.min(0.99, Math.max(0, probability));
  }

  calculateTrendFactor(device) {
    if (!device.sensorHistory || device.sensorHistory.length < 7) return 0.3;
    
    const recent = device.sensorHistory.slice(-7);
    const degrading = recent.every((v, i) => i === 0 || v >= recent[i - 1] * 0.9);
    
    return degrading ? 0.6 : 0.2;
  }

  detectAnomalyPattern(device) {
    const pattern = this.anomalyPatterns.get(device.id);
    if (!pattern) return 0;
    
    const anomalyCount = pattern.filter(p => p.isAnomaly).length;
    return Math.min(anomalyCount / 10, 0.5);
  }

  getSeasonalFactor() {
    const month = new Date().getMonth();
    if (month >= 4 && month <= 9) return 0.3;
    return 0.1;
  }

  estimateFailureDate(probability, lastMaintenance) {
    if (probability < 0.1) return null;
    if (probability > 0.8) return new Date(Date.now() + 1 * 24 * 60 * 60 * 1000);
    if (probability > 0.5) return new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }

  generateRecommendation(healthScore, probability, device) {
    if (probability > 0.7) {
      return { action: 'replace', priority: 'critical', message: `Replace ${device.id} immediately` };
    }
    if (probability > 0.4 || healthScore < 50) {
      return { action: 'maintain', priority: 'high', message: `Schedule maintenance for ${device.id}` };
    }
    if (healthScore < 70) {
      return { action: 'inspect', priority: 'medium', message: `Inspect ${device.id} within 48 hours` };
    }
    return { action: 'none', priority: 'low', message: `Device ${device.id} operating normally` };
  }

  getContributingFactors(device) {
    const healthData = this.deviceHealthScores.get(device.id);
    return healthData?.factors || [];
  }

  getDaysSince(date) {
    if (!date) return 0;
    return Math.floor((Date.now() - new Date(date).getTime()) / (24 * 60 * 60 * 1000));
  }

  getDevices() {
    try {
      const { getAll } = require('../config/database');
      return getAll('SELECT * FROM devices WHERE status = "online"').map(d => ({
        ...d,
        config: typeof d.config === 'string' ? JSON.parse(d.config) : d.config,
        sensorHistory: []
      }));
    } catch {
      return [];
    }
  }

  generateSummary(predictions) {
    const critical = predictions.filter(p => p.riskLevel === 'critical').length;
    const warning = predictions.filter(p => p.riskLevel === 'warning').length;
    
    return {
      criticalCount: critical,
      warningCount: warning,
      healthyCount: predictions.length - critical - warning,
      overallHealth: predictions.length > 0 
        ? predictions.reduce((sum, p) => sum + parseFloat(p.healthScore), 0) / predictions.length
        : 100,
      recommendation: critical > 0 ? 'Immediate action required' : warning > 0 ? 'Schedule maintenance' : 'All systems normal'
    };
  }

  getStatus() {
    return {
      skill: this.id,
      monitoredDevices: this.deviceHealthScores.size,
      thresholds: this.thresholds
    };
  }
}

module.exports = new PredictiveMaintenanceSkill();