'use strict';

class AlertAggregationSkill {
  constructor() {
    this.id = 'alert-aggregation';
    this.name = 'Smart Alert Aggregation';
    this.description = 'Intelligent alert correlation, prioritization, and noise reduction';
    
    this.alertGroups = new Map();
    this.escalationRules = {
      critical: { repeatCount: 2, escalateAfter: 300000 },
      high: { repeatCount: 3, escalateAfter: 600000 },
      medium: { repeatCount: 5, escalateAfter: 1800000 },
      low: { repeatCount: 10, escalateAfter: 3600000 }
    };

    this.correlationWindow = 300000;
    this.alertHistory = [];
    this.maxHistory = 1000;
  }

  async analyze(ctx) {
    const alerts = this.getActiveAlerts();
    const grouped = this.correlateAlerts(alerts);
    const prioritized = this.prioritizeAlerts(grouped);
    const aggregated = this.aggregateAlerts(prioritized);
    const actions = this.determineActions(aggregated);

    return {
      skill: this.id,
      timestamp: new Date().toISOString(),
      totalAlerts: alerts.length,
      groupedCount: grouped.length,
      prioritizedAlerts: prioritized.slice(0, 20),
      aggregated,
      actions,
      stats: this.getAlertStats(alerts)
    };
  }

  getActiveAlerts() {
    try {
      const { getAll } = require('../config/database');
      const rows = getAll(
        `SELECT * FROM history WHERE status IN ('pending', 'open') AND timestamp > datetime('now', '-24 hours') ORDER BY timestamp DESC`
      );
      return rows.map(r => ({
        id: r.id,
        type: r.action,
        severity: r.status === 'pending' ? 'high' : 'medium',
        message: r.trigger || r.action,
        source: r.id?.split('-')[0] || 'system',
        timestamp: r.timestamp,
        count: 1
      }));
    } catch {
      return [];
    }
  }

  correlateAlerts(alerts) {
    const groups = new Map();

    for (const alert of alerts) {
      const groupKey = this.getGroupKey(alert);
      
      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          key: groupKey,
          type: alert.type,
          severity: alert.severity,
          alerts: [],
          firstSeen: alert.timestamp,
          lastSeen: alert.timestamp,
          count: 0
        });
      }

      const group = groups.get(groupKey);
      group.alerts.push(alert);
      group.count++;
      
      const alertTime = new Date(alert.timestamp).getTime();
      const firstTime = new Date(group.firstSeen).getTime();
      const lastTime = new Date(group.lastSeen).getTime();
      
      if (alertTime < firstTime) group.firstSeen = alert.timestamp;
      if (alertTime > lastTime) group.lastSeen = alert.timestamp;
    }

    return Array.from(groups.values());
  }

  getGroupKey(alert) {
    const typePrefix = alert.type?.split('_')[0] || alert.source;
    return `${typePrefix}:${alert.message.substring(0, 50)}`;
  }

  prioritizeAlerts(groups) {
    const scored = groups.map(group => {
      let score = 0;

      const severityScores = { critical: 100, high: 75, medium: 50, low: 25 };
      score += severityScores[group.severity] || 25;

      score += Math.min(group.count * 5, 50);

      const age = Date.now() - new Date(group.lastSeen).getTime();
      score += Math.min(age / 60000, 30);

      const isRepeating = group.count > 3;
      if (isRepeating) score += 20;

      return { ...group, score };
    });

    return scored.sort((a, b) => b.score - a.score);
  }

  aggregateAlerts(prioritized) {
    const aggregated = {
      critical: [],
      warning: [],
      info: []
    };

    for (const alert of prioritized) {
      if (alert.severity === 'critical' || alert.score > 120) {
        aggregated.critical.push({
          title: alert.type,
          count: alert.count,
          timeframe: this.getTimeframe(alert.firstSeen, alert.lastSeen),
          action: this.suggestAction(alert)
        });
      } else if (alert.score > 60) {
        aggregated.warning.push({
          title: alert.type,
          count: alert.count,
          timeframe: this.getTimeframe(alert.firstSeen, alert.lastSeen),
          action: this.suggestAction(alert)
        });
      } else {
        aggregated.info.push({
          title: alert.type,
          count: alert.count,
          action: this.suggestAction(alert)
        });
      }
    }

    return aggregated;
  }

  getTimeframe(first, last) {
    const diff = new Date(last).getTime() - new Date(first).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  }

  suggestAction(alert) {
    if (alert.count > 10) return 'Investigate root cause';
    if (alert.count > 5) return 'Review configuration';
    if (alert.severity === 'critical') return 'Immediate action required';
    return 'Monitor closely';
  }

  determineActions(aggregated) {
    const actions = [];

    if (aggregated.critical.length > 0) {
      actions.push({
        type: 'escalate',
        priority: 'critical',
        message: `${aggregated.critical.length} critical alert groups require immediate attention`,
        groups: aggregated.critical.map(c => c.title)
      });
    }

    if (aggregated.warning.length > 3) {
      actions.push({
        type: 'investigate',
        priority: 'high',
        message: `${aggregated.warning.length} warning groups need investigation`
      });
    }

    if (aggregated.info.length > 10) {
      actions.push({
        type: 'dismiss',
        priority: 'low',
        message: `${aggregated.info.length} informational alerts - consider tuning thresholds`
      });
    }

    return actions;
  }

  getAlertStats(alerts) {
    const byType = {};
    const bySeverity = { critical: 0, high: 0, medium: 0, low: 0 };
    const byHour = {};

    for (const alert of alerts) {
      byType[alert.type] = (byType[alert.type] || 0) + 1;
      bySeverity[alert.severity] = (bySeverity[alert.severity] || 0) + 1;
      
      const hour = new Date(alert.timestamp).getHours();
      byHour[hour] = (byHour[hour] || 0) + 1;
    }

    const peakHour = Object.entries(byHour).sort((a, b) => b[1] - a[1])[0];

    return {
      total: alerts.length,
      byType,
      bySeverity,
      peakHour: peakHour ? `${peakHour[0]}:00 (${peakHour[1]} alerts)` : 'N/A',
      noiseRatio: alerts.length > 50 ? 'high' : alerts.length > 20 ? 'medium' : 'low'
    };
  }

  addAlert(alert) {
    this.alertHistory.push({
      ...alert,
      receivedAt: new Date().toISOString()
    });
    
    if (this.alertHistory.length > this.maxHistory) {
      this.alertHistory.shift();
    }
  }

  getStatus() {
    return {
      skill: this.id,
      alertHistorySize: this.alertHistory.length,
      escalationRules: Object.keys(this.escalationRules),
      correlationWindow: this.correlationWindow
    };
  }
}

module.exports = new AlertAggregationSkill();