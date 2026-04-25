/**
 * EcoSynTech Pricing Plans - 4 Product Tiers
 * 
 * BASE (Miễn phí) - Lite version
 * PRO (99K/tháng) - Pro version  
 * PRO_MAX (199K/tháng) - Pro Max
 * PREMIUM (299K/tháng) - Premium
 * 
 * @version 1.0.0
 */

const PLANS = {
  BASE: {
    name: 'BASE',
    price: 0,
    period: 'forever',
    maxDevices: 3,
    maxSensors: 5,
    features: {
      dashboard: true,
      sensors: true,
      basicAlerts: true,
      manualControl: true,
      history7Days: true,
      exportCSV: false,
      aiPredictions: false,
      diseaseDetection: false,
      federatedLearning: false,
      qrTraceability: false,
      multiFarm: false,
      teamAccess: false,
      apiAccess: false,
      prioritySupport: false
    }
  },
  
  PRO: {
    name: 'PRO',
    price: 99000,
    period: 'month',
    maxDevices: 8,
    maxSensors: 15,
    features: {
      dashboard: true,
      sensors: true,
      basicAlerts: true,
      manualControl: true,
      history30Days: true,
      exportCSV: true,
      aiPredictions: true,
      diseaseDetection: true,
      federatedLearning: false,
      qrTraceability: true,
      multiFarm: false,
      teamAccess: false,
      apiAccess: false,
      prioritySupport: false
    }
  },
  
  PRO_MAX: {
    name: 'PRO_MAX',
    price: 199000,
    period: 'month',
    maxDevices: 20,
    maxSensors: 40,
    features: {
      dashboard: true,
      sensors: true,
      basicAlerts: true,
      manualControl: true,
      history90Days: true,
      exportCSV: true,
      aiPredictions: true,
      diseaseDetection: true,
      federatedLearning: true,
      qrTraceability: true,
      multiFarm: true,
      teamAccess: true,
      apiAccess: false,
      prioritySupport: false
    }
  },
  
  PREMIUM: {
    name: 'PREMIUM',
    price: 299000,
    period: 'month',
    maxDevices: 50,
    maxSensors: 100,
    features: {
      dashboard: true,
      sensors: true,
      basicAlerts: true,
      manualControl: true,
      historyUnlimited: true,
      exportCSV: true,
      aiPredictions: true,
      diseaseDetection: true,
      federatedLearning: true,
      qrTraceability: true,
      multiFarm: true,
      teamAccess: true,
      apiAccess: true,
      prioritySupport: true
    }
  }
};

const PLAN_TIERS = ['BASE', 'PRO', 'PRO_MAX', 'PREMIUM'];

class PricingService {
  constructor(currentPlan = 'BASE') {
    this.currentPlan = currentPlan;
  }
  
  getPlan(planName) {
    return PLANS[planName] || PLANS.BASE;
  }
  
  getCurrentPlan() {
    return PLANS[this.currentPlan];
  }
  
  canAccess(feature) {
    const plan = this.getCurrentPlan();
    return plan.features[feature] === true;
  }
  
  checkLimit(type, currentCount) {
    const plan = this.getCurrentPlan();
    const limit = type === 'devices' ? plan.maxDevices : plan.maxSensors;
    return {
      allowed: currentCount < limit,
      current: currentCount,
      max: limit,
      upgradeRequired: currentCount >= limit
    };
  }
  
  getAvailablePlans() {
    return PLAN_TIERS.map(tier => ({
      tier,
      name: PLANS[tier].name,
      price: PLANS[tier].price,
      period: PLANS[tier].period
    }));
  }
  
  getStatus() {
    return {
      currentPlan: this.currentPlan,
      features: PLANS[this.currentPlan].features,
      limits: {
        devices: PLANS[this.currentPlan].maxDevices,
        sensors: PLANS[this.currentPlan].maxSensors
      }
    };
  }
}

module.exports = { PLANS, PLAN_TIERS, PricingService };