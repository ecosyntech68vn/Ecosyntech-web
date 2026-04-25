/**
 * Pricing Middleware - Enforce plan limits
 */

const { PLANS, PricingService } = require('../services/pricingService');

function planMiddleware(requiredFeature) {
  return (req, res, next) => {
    const userPlan = req.user?.plan || 'BASE';
    const pricing = new PricingService(userPlan);
    
    if (!pricing.canAccess(requiredFeature)) {
      return res.status(403).json({
        ok: false,
        error: 'FEATURE_NOT_INCLUDED',
        message: `Tính năng "${requiredFeature}" không có trong gói ${userPlan}`,
        upgradeRequired: true,
        availablePlans: pricing.getAvailablePlans()
      });
    }
    
    // Check limits
    if (req.deviceCount !== undefined) {
      const check = pricing.checkLimit('devices', req.deviceCount);
      if (!check.allowed) {
        return res.status(403).json({
          ok: false,
          error: 'DEVICE_LIMIT_EXCEEDED',
          current: check.current,
          max: check.max,
          upgradeRequired: true
        });
      }
    }
    
    // Attach pricing to request for downstream use
    req.pricing = pricing;
    next();
  };
}

module.exports = { planMiddleware };