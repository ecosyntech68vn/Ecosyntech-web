'use strict';

class AnomalyDetectionSkill {
  constructor() {
    this.id = 'anomaly-detection';
    this.name = 'Anomaly Detection';
    this.description = 'Real-time statistical anomaly detection for sensor data and system metrics';
    
    this.baselines = new Map();
    this.anomalies = [];
    this.sensitivity = 2.5;
    this.windowSize = 100;
    this.zScoreThreshold = 3;
    
    this.detectionMethods = ['statistical', 'movingAverage', 'exponentialSmoothing', 'isolationForest'];
    this.enabledMethods = ['statistical', 'movingAverage'];
  }

  async analyze(ctx) {
    const sensors = this.getSensorData();
    const anomalies = await this.detectAnomalies(sensors);
    const patterns = this.detectPatterns(anomalies);
    const alerts = this.generateAlerts(anomalies);
    
    return {
      skill: this.id,
      timestamp: new Date().toISOString(),
      sensorCount: sensors.length,
      anomalyCount: anomalies.length,
      anomalies: anomalies.slice(0, 50),
      patterns,
      alerts,
      severity: this.calculateSeverity(anomalies),
      recommendations: this.generateRecommendations(anomalies, patterns)
    };
  }

  async detectAnomalies(sensors) {
    const anomalies = [];
    const now = Date.now();

    for (const sensor of sensors) {
      const history = this.getSensorHistory(sensor.type);
      
      for (const method of this.enabledMethods) {
        const result = await this.runDetection(method, sensor, history);
        if (result.isAnomaly) {
          anomalies.push({
            sensorId: sensor.id,
            sensorType: sensor.type,
            value: sensor.value,
            expectedValue: result.expected,
            deviation: result.deviation,
            method,
            severity: this.calculateAnomalySeverity(result.deviation),
            timestamp: now,
            details: result
          });
        }
      }

      this.updateBaseline(sensor.type, sensor.value);
    }

    this.anomalies = this.anomalies.concat(anomalies).slice(-1000);
    return anomalies;
  }

  async runDetection(method, sensor, history) {
    switch (method) {
      case 'statistical':
        return this.statisticalDetection(sensor, history);
      case 'movingAverage':
        return this.movingAverageDetection(sensor, history);
      case 'exponentialSmoothing':
        return this.exponentialSmoothingDetection(sensor, history);
      default:
        return { isAnomaly: false };
    }
  }

  statisticalDetection(sensor, history) {
    if (history.length < 10) {
      return { isAnomaly: false, expected: sensor.value, deviation: 0 };
    }

    const values = history.map(h => h.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const std = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length);
    
    const zScore = std > 0 ? Math.abs(sensor.value - mean) / std : 0;
    const deviation = sensor.value - mean;

    return {
      isAnomaly: zScore > this.zScoreThreshold,
      expected: mean,
      deviation,
      zScore,
      mean,
      std
    };
  }

  movingAverageDetection(sensor, history) {
    if (history.length < 20) {
      return { isAnomaly: false, expected: sensor.value, deviation: 0 };
    }

    const recent = history.slice(-20);
    const weights = recent.map((_, i) => i + 1);
    const sumWeights = weights.reduce((a, b) => a + b, 0);
    
    const weightedMean = recent.reduce((sum, h, i) => sum + h.value * weights[i], 0) / sumWeights;
    
    const recentStd = Math.sqrt(
      recent.reduce((sum, h) => sum + Math.pow(h.value - weightedMean, 2), 0) / recent.length
    );

    const deviation = sensor.value - weightedMean;
    const threshold = recentStd * this.sensitivity;

    return {
      isAnomaly: Math.abs(deviation) > threshold,
      expected: weightedMean,
      deviation,
      threshold
    };
  }

  exponentialSmoothingDetection(sensor, history) {
    if (history.length < 5) {
      return { isAnomaly: false, expected: sensor.value, deviation: 0 };
    }

    const alpha = 0.3;
    let predicted = history[0].value;
    
    for (let i = 1; i < history.length; i++) {
      predicted = alpha * history[i].value + (1 - alpha) * predicted;
    }

    const deviation = sensor.value - predicted;
    const errorThreshold = Math.abs(predicted) * 0.3;

    return {
      isAnomaly: Math.abs(deviation) > errorThreshold,
      expected: predicted,
      deviation,
      predicted
    };
  }

  detectPatterns(anomalies) {
    const patterns = {
      temporal: [],
      spatial: [],
      behavioral: []
    };

    const timeGroups = {};
    for (const a of anomalies) {
      const hour = new Date(a.timestamp).getHours();
      if (!timeGroups[hour]) timeGroups[hour] = 0;
      timeGroups[hour]++;
    }
    
    const peakHours = Object.entries(timeGroups)
      .filter(([_, count]) => count > 3)
      .map(([hour]) => parseInt(hour));
    
    if (peakHours.length > 0) {
      patterns.temporal.push({
        type: 'time_based',
        description: `Anomalies cluster at hours: ${peakHours.join(', ')}`,
        hours: peakHours
      });
    }

    const typeGroups = {};
    for (const a of anomalies) {
      if (!typeGroups[a.sensorType]) typeGroups[a.sensorType] = 0;
      typeGroups[a.sensorType]++;
    }
    
    const frequentTypes = Object.entries(typeGroups)
      .filter(([_, count]) => count > 5)
      .map(([type]) => type);
    
    if (frequentTypes.length > 0) {
      patterns.behavioral.push({
        type: 'sensor_type_frequency',
        description: `Frequent anomalies from: ${frequentTypes.join(', ')}`,
        types: frequentTypes
      });
    }

    return patterns;
  }

  generateAlerts(anomalies) {
    const alerts = [];
    const now = Date.now();

    const critical = anomalies.filter(a => a.severity === 'critical');
    if (critical.length > 0) {
      alerts.push({
        level: 'critical',
        count: critical.length,
        message: `Critical anomalies detected requiring immediate attention`,
        sensors: critical.map(a => a.sensorId)
      });
    }

    const recent = anomalies.filter(a => now - a.timestamp < 3600000);
    if (recent.length > 10) {
      alerts.push({
        level: 'warning',
        count: recent.length,
        message: `High anomaly rate: ${recent.length} in the last hour`
      });
    }

    const newTypes = [...new Set(anomalies.map(a => a.sensorType))];
    if (newTypes.length > 3) {
      alerts.push({
        level: 'info',
        count: newTypes.length,
        message: `Anomalies detected across ${newTypes.length} sensor types`
      });
    }

    return alerts;
  }

  calculateSeverity(anomalies) {
    const critical = anomalies.filter(a => a.severity === 'critical').length;
    const warning = anomalies.filter(a => a.severity === 'warning').length;
    
    if (critical > 0) return 'critical';
    if (warning > 5) return 'warning';
    if (anomalies.length > 0) return 'info';
    return 'normal';
  }

  calculateAnomalySeverity(deviation) {
    const absDev = Math.abs(deviation);
    if (absDev > 100) return 'critical';
    if (absDev > 50) return 'warning';
    return 'info';
  }

  generateRecommendations(anomalies, patterns) {
    const recommendations = [];

    const criticalCount = anomalies.filter(a => a.severity === 'critical').length;
    if (criticalCount > 0) {
      recommendations.push({
        type: 'investigate',
        priority: 'critical',
        message: `${criticalCount} critical anomalies require immediate investigation`
      });
    }

    if (patterns.temporal.length > 0) {
      recommendations.push({
        type: 'schedule',
        priority: 'medium',
        message: 'Consider adjusting maintenance schedule based on anomaly patterns'
      });
    }

    const deviceAnomalies = anomalies.filter(a => a.deviation > 200);
    const problematicDevices = [...new Set(deviceAnomalies.map(a => a.sensorId))];
    if (problematicDevices.length > 0) {
      recommendations.push({
        type: 'maintenance',
        priority: 'high',
        message: `Review devices: ${problematicDevices.join(', ')}`,
        devices: problematicDevices
      });
    }

    if (anomalies.length === 0) {
      recommendations.push({
        type: 'status',
        priority: 'low',
        message: 'No anomalies detected - system operating normally'
      });
    }

    return recommendations;
  }

  getSensorHistory(type) {
    try {
      const { getAll } = require('../config/database');
      const rows = getAll(
        `SELECT value, timestamp FROM sensors WHERE type = ? ORDER BY timestamp DESC LIMIT ?`,
        [type, this.windowSize]
      );
      return rows.reverse();
    } catch {
      return this.baselines.get(type) || [];
    }
  }

  getSensorData() {
    try {
      const { getAll } = require('../config/database');
      return getAll('SELECT * FROM sensors WHERE value IS NOT NULL');
    } catch {
      return [];
    }
  }

  updateBaseline(type, value) {
    if (!this.baselines.has(type)) {
      this.baselines.set(type, []);
    }
    
    const history = this.baselines.get(type);
    history.push({ value, timestamp: Date.now() });
    
    if (history.length > this.windowSize) {
      history.shift();
    }
  }

  setSensitivity(value) {
    this.sensitivity = Math.max(1, Math.min(5, value));
    this.zScoreThreshold = this.sensitivity;
  }

  getStatus() {
    return {
      skill: this.id,
      enabledMethods: this.enabledMethods,
      sensitivity: this.sensitivity,
      windowSize: this.windowSize,
      anomalyCount: this.anomalies.length,
      baselineTypes: [...this.baselines.keys()]
    };
  }
}

module.exports = new AnomalyDetectionSkill();