/**
 * Unified Payment API Routes
 * Supports: VNPay, MoMo, SePay
 */

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { PricingService, PLANS } = require('../services/pricingService');
const { PaymentService: VNPayService } = require('../services/paymentService');
const { MoMoService } = require('../services/momoService');
const { SepayService } = require('../services/sepayService');

const vnPay = new VNPayService();
const momo = new MoMoService();
const sepay = new SepayService();

// Helper: generate order ID
function generateOrderId(prefix = 'ECO') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

// GET /api/payment/methods - Get available payment methods
router.get('/methods', async (req, res) => {
  res.json({
    ok: true,
    data: [
      {
        id: 'vnpay',
        name: 'VNPay',
        logo: '/images/vnpay.png',
        banks: 40,
        description: 'Thanh toán qua ngân hàng nội địa'
      },
      {
        id: 'momo',
        name: 'MoMo',
        logo: '/images/momo.png',
        description: 'Ví điện tử MoMo'
      },
      {
        id: 'sepay',
        name: 'SePay',
        logo: '/images/sepay.png',
        banks: [
          { code: 'VCB', name: 'Vietcombank' },
          { code: 'TCB', name: 'Techcombank' },
          { code: 'ACB', name: 'ACB' },
          { code: 'BIDV', name: 'BIDV' },
          { code: 'CTG', name: 'VietinBank' },
          { code: 'MB', name: 'MB Bank' },
          { code: 'SHB', name: 'SHB' },
          { code: 'LPB', name: 'LienViet Post Bank' }
        ],
        description: 'SePay - Chuyển khoản ngân hàng'
      }
    ]
  });
});

// POST /api/payment/create - Create payment link
router.post('/create', auth, async (req, res) => {
  try {
    const { method, plan } = req.body;
    const userId = req.user?.id || 'unknown';
    
    // Validate plan
    if (!PLANS[plan]) {
      return res.status(400).json({ ok: false, error: 'Invalid plan' });
    }
    
    const orderId = generateOrderId();
    
    let result;
    
    switch (method) {
      case 'vnpay':
        result = await vnPay.createPayment(orderId, plan, userId);
        break;
        
      case 'momo':
        result = await momo.createPayment(orderId, plan);
        break;
        
      case 'sepay':
        result = await sepay.createPayment(orderId, plan);
        break;
        
      default:
        return res.status(400).json({ ok: false, error: 'Unsupported payment method' });
    }
    
    res.json({
      ok: true,
      orderId,
      plan,
      method,
      ...result
    });
    
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// GET /api/payment/status/:orderId - Check payment status
router.get('/status/:orderId', auth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { method } = req.query;
    
    let result;
    
    switch (method) {
      case 'vnpay':
        result = await vnPay.queryTransaction(orderId);
        break;
      case 'sepay':
        result = await sepay.checkStatus(orderId);
        break;
      case 'momo':
        // MoMo doesn't have direct query API
        result = { ok: false, error: 'MoMo requires webhook callback' };
        break;
      default:
        result = { ok: false, error: 'Unknown method' };
    }
    
    res.json({ ok: true, data: result });
    
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// VNPay return/callback
router.get('/vnpay-return', async (req, res) => {
  try {
    const result = vnPay.handleCallback(req.query);
    
    if (result.ok) {
      // Update user plan in DB
      // await updateUserPlan(result.transactionId, userId);
      
      res.redirect(`/payment/success?order=${result.transactionId}`);
    } else {
      res.redirect(`/payment/failed?error=${result.error}`);
    }
    
  } catch (error) {
    res.redirect('/payment/failed?error=SYSTEM_ERROR');
  }
});

// SePay return/callback
router.get('/sepay-return', async (req, res) => {
  try {
    const result = sepay.handleCallback(req.query);
    
    if (result.ok) {
      res.redirect(`/payment/success?order=${result.orderId}`);
    } else {
      res.redirect(`/payment/failed?error=${result.error}`);
    }
    
  } catch (error) {
    res.redirect('/payment/failed?error=SYSTEM_ERROR');
  }
});

// Webhook endpoints (IPN)
router.post('/vnpay-ipn', async (req, res) => {
  try {
    const result = vnPay.handleCallback(req.body);
    
    if (result.ok) {
      // Update user plan
      console.log('[Payment] VNPay success:', result.transactionId);
    }
    
    res.json({ result: 'ok' });
    
  } catch (error) {
    console.error('[Payment] VNPay IPN error:', error);
    res.status(500).json({ result: 'error' });
  }
});

router.post('/sepay-ipn', async (req, res) => {
  try {
    const result = sepay.handleCallback(req.body);
    
    if (result.ok) {
      console.log('[Payment] SePay success:', result.orderId);
    }
    
    res.json({ result: 'ok' });
    
  } catch (error) {
    console.error('[Payment] SePay IPN error:', error);
    res.status(500).json({ result: 'error' });
  }
});

router.post('/momo-ipn', async (req, res) => {
  try {
    const { resultCode, orderId, transId } = req.body;
    
    if (resultCode === 0) {
      console.log('[Payment] MoMo success:', orderId);
      // Update user plan here
    }
    
    res.json({ result: 'ok' });
    
  } catch (error) {
    console.error('[Payment] MoMo IPN error:', error);
    res.status(500).json({ result: 'error' });
  }
});

module.exports = router;