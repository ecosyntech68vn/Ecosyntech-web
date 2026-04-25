/**
 * Pricing API Routes
 */

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { PLANS, PricingService } = require('../services/pricingService');

// GET /api/pricing/plans - Get all available plans
router.get('/plans', async (req, res) => {
  try {
    const pricing = new PricingService('BASE');
    res.json({
      ok: true,
      data: pricing.getAvailablePlans()
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// GET /api/pricing/current - Get current plan status
router.get('/current', auth, async (req, res) => {
  try {
    const userPlan = req.user?.plan || 'BASE';
    const pricing = new PricingService(userPlan);
    res.json({
      ok: true,
      data: pricing.getStatus()
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// POST /api/pricing/upgrade - Upgrade plan
router.post('/upgrade', auth, async (req, res) => {
  try {
    const { plan } = req.body;
    if (!PLANS[plan]) {
      return res.status(400).json({ ok: false, error: 'Invalid plan' });
    }
    
    // TODO: Integrate with payment gateway here
    // Update user plan in DB after payment confirmed
    
    res.json({
      ok: true,
      message: `Đã nâng cấp lên gói ${PLANS[plan].name}`,
      newPlan: PLANS[plan].name
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// GET /api/pricing/check-feature - Check feature access
router.get('/check-feature', auth, async (req, res) => {
  try {
    const { feature } = req.query;
    const userPlan = req.user?.plan || 'BASE';
    const pricing = new PricingService(userPlan);
    
    res.json({
      ok: true,
      feature,
      allowed: pricing.canAccess(feature)
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

module.exports = router;