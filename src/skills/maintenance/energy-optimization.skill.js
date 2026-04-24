'use strict';

class EnergyOptimizationSkill {
  constructor() {
    this.id = 'energy-optimization';
    this.name = 'Energy Optimization';
    this.description = 'Smart power management for IoT devices based on usage patterns and schedules';
    
    this.powerConsumption = new Map();
    this.peakHours = [6, 7, 8, 9, 17, 18, 19, 20, 21];
    this.offPeakHours = [0, 1, 2, 3, 4, 5, 22, 23];
    
    this.devicePowerProfiles = {
      pump: { active: 150, idle: 5, sleep: 0.5 },
      sensor: { active: 0.5, idle: 0.1, sleep: 0.01 },
      camera: { active: 5, idle: 1, sleep: 0.1 },
      gateway: { active: 10, idle: 3, sleep: 0.5 },
      valve: { active: 20, idle: 2, sleep: 0.1 }
    };

    this.schedule = [];
    this.optimizationEnabled = true;
  }

  async analyze(ctx) {
    const devices = this.getDevices();
    const currentHour = new Date().getHours();
    const isPeakHour = this.peakHours.includes(currentHour);
    
    const powerAnalysis = await this.analyzePowerConsumption(devices);
    const scheduleOptimization = this.optimizeSchedule(devices);
    const costProjection = this.projectCosts(powerAnalysis);
    const recommendations = this.generateRecommendations(devices, powerAnalysis, isPeakHour);

    return {
      skill: this.id,
      timestamp: new Date().toISOString(),
      currentStatus: {
        hour: currentHour,
        isPeakHour,
        totalPower: powerAnalysis.totalWatts.toFixed(2),
        deviceCount: devices.length
      },
      powerAnalysis,
      scheduleOptimization,
      costProjection,
      recommendations,
      savings: this.calculateSavings(powerAnalysis, scheduleOptimization)
    };
  }

  async analyzePowerConsumption(devices) {
    let totalWatts = 0;
    let activeDevices = 0;
    const byType = {};

    for (const device of devices) {
      const profile = this.devicePowerProfiles[device.type] || { active: 1, idle: 0.1, sleep: 0.01 };
      const state = device.status === 'online' ? 'active' : 'idle';
      const watts = profile[state] || profile.active;
      
      totalWatts += watts;
      activeDevices++;

      if (!byType[device.type]) {
        byType[device.type] = { count: 0, watts: 0 };
      }
      byType[device.type].count++;
      byType[device.type].watts += watts;

      this.powerConsumption.set(device.id, { watts, timestamp: Date.now() });
    }

    return {
      totalWatts,
      activeDevices,
      byType,
      efficiency: devices.length > 0 ? (activeDevices / devices.length * 100).toFixed(1) : 0
    };
  }

  optimizeSchedule(devices) {
    const schedule = [];
    const now = Date.now();

    const schedulableDevices = devices.filter(d => 
      d.type === 'pump' || d.type === 'valve' || d.type === 'camera'
    );

    for (const device of schedulableDevices) {
      const optimalSlots = this.findOptimalTimeSlots(device);
      const currentSchedule = device.schedule || {};
      
      schedule.push({
        deviceId: device.id,
        type: device.type,
        currentSchedule: currentSchedule,
        optimalSlots,
        recommendedAction: this.recommendScheduleChange(device, optimalSlots),
        potentialSavings: this.estimateSavings(device, optimalSlots)
      });
    }

    return {
      optimizedSchedules: schedule,
      totalPotentialSavings: schedule.reduce((sum, s) => sum + s.potentialSavings, 0)
    };
  }

  findOptimalTimeSlots(device) {
    const slots = [];
    const hour = new Date().getHours();
    
    for (let h = 0; h < 24; h++) {
      const isOffPeak = this.offPeakHours.includes(h);
      const isNight = h >= 22 || h <= 4;
      const score = (isOffPeak ? 30 : 0) + (isNight ? 20 : 0) + (h >= 5 && h <= 6 ? 15 : 0);
      
      slots.push({ hour: h, score, recommended: score > 30 });
    }

    return slots.filter(s => s.recommended).slice(0, 4);
  }

  recommendScheduleChange(device, optimalSlots) {
    if (optimalSlots.length === 0) return 'maintain';
    
    const currentHour = new Date().getHours();
    const currentInOptimal = optimalSlots.some(s => s.hour === currentHour);
    
    if (!currentInOptimal && optimalSlots.length > 0) {
      return {
        action: 'reschedule',
        message: `Move ${device.id} to hour ${optimalSlots[0].hour}`,
        newHour: optimalSlots[0].hour
      };
    }
    
    return { action: 'maintain', message: 'Current schedule is optimal' };
  }

  estimateSavings(device, optimalSlots) {
    const profile = this.devicePowerProfiles[device.type];
    if (!profile) return 0;
    
    const peakRate = 0.15;
    const offPeakRate = 0.05;
    
    const currentCost = profile.active * peakRate * (this.peakHours.includes(new Date().getHours()) ? 2 : 1);
    const optimalCost = profile.active * offPeakRate * 2;
    
    return Math.max(0, currentCost - optimalCost);
  }

  projectCosts(powerAnalysis) {
    const hoursInDay = 24;
    const daysInMonth = 30;
    
    let dailyCost = 0;
    for (let h = 0; h < 24; h++) {
      const rate = this.peakHours.includes(h) ? 0.15 : 0.05;
      const hourFactor = this.peakHours.includes(h) ? 1.5 : 0.8;
      dailyCost += powerAnalysis.totalWatts * rate * hourFactor / 1000;
    }

    return {
      daily: dailyCost.toFixed(2),
      monthly: (dailyCost * daysInMonth).toFixed(2),
      yearly: (dailyCost * daysInMonth * 12).toFixed(2),
      currency: 'USD'
    };
  }

  generateRecommendations(devices, powerAnalysis, isPeakHour) {
    const recommendations = [];

    const highPowerDevices = devices.filter(d => {
      const profile = this.devicePowerProfiles[d.type];
      return profile && profile.active > 50;
    });

    if (isPeakHour && highPowerDevices.length > 0) {
      recommendations.push({
        type: 'shift',
        priority: 'high',
        message: `Defer ${highPowerDevices.length} high-power devices to off-peak hours`,
        devices: highPowerDevices.map(d => d.id)
      });
    }

    const idleDevices = devices.filter(d => d.status === 'offline');
    if (idleDevices.length > devices.length * 0.2) {
      recommendations.push({
        type: 'reduce',
        priority: 'medium',
        message: `Enable sleep mode for ${idleDevices.length} idle devices`,
        potentialSavings: `${(idleDevices.length * 0.1).toFixed(2)} W`
      });
    }

    const unusedDevices = devices.filter(d => !d.lastSeen || Date.now() - new Date(d.lastSeen).getTime() > 7 * 24 * 60 * 60 * 1000);
    if (unusedDevices.length > 0) {
      recommendations.push({
        type: 'decommission',
        priority: 'low',
        message: `Consider removing ${unusedDevices.length} unused devices`,
        potentialSavings: `${(unusedDevices.length * 5).toFixed(2)} W`
      });
    }

    if (powerAnalysis.efficiency < 50) {
      recommendations.push({
        type: 'optimize',
        priority: 'medium',
        message: 'Device efficiency below 50%, review network configuration'
      });
    }

    return recommendations;
  }

  calculateSavings(powerAnalysis, scheduleOptimization) {
    const currentDailyCost = parseFloat(this.projectCosts(powerAnalysis).daily);
    const optimizedDailyCost = currentDailyCost * 0.7;
    
    return {
      daily: (currentDailyCost - optimizedDailyCost).toFixed(2),
      monthly: ((currentDailyCost - optimizedDailyCost) * 30).toFixed(2),
      percentage: '30',
      currency: 'USD'
    };
  }

  getDevices() {
    try {
      const { getAll } = require('../config/database');
      return getAll('SELECT * FROM devices');
    } catch {
      return [];
    }
  }

  getStatus() {
    return {
      skill: this.id,
      optimizationEnabled: this.optimizationEnabled,
      peakHours: this.peakHours,
      offPeakHours: this.offPeakHours,
      powerProfiles: Object.keys(this.devicePowerProfiles)
    };
  }

  setPowerProfile(deviceType, profile) {
    this.devicePowerProfiles[deviceType] = profile;
  }
}

module.exports = new EnergyOptimizationSkill();