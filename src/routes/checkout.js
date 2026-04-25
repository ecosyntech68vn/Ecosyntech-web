/**
 * Order & Cart API Routes - Complete E-commerce Flow
 */

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const cartService = require('../services/cartService');
const orderService = require('../services/orderService');
const { PLANS } = require('../services/pricingService');

const { SepayService } = require('../services/sepayService');
const { MoMoService } = require('../services/momoService');
const { PaymentService: VNPayService } = require('../services/paymentService');

const sepay = new SepayService();
const momo = new MoMoService();
const vnPay = new VNPayService();

// ========================================================
// CART ENDPOINTS
// ========================================================

// GET /api/cart - Get current cart
router.get('/cart', auth, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.sub;
    const summary = cartService.getCartSummary(userId);
    res.json({ ok: true, data: summary });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// POST /api/cart/add - Add item to cart
router.post('/cart/add', auth, async (req, res) => {
  try {
    const { plan, duration } = req.body;
    const userId = req.user?.id || req.user?.sub;

    if (!PLANS[plan]) {
      return res.status(400).json({ ok: false, error: 'Invalid plan' });
    }

    const summary = cartService.addItem(userId, plan, duration || 1);
    res.json({ ok: true, data: summary });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// POST /api/cart/remove - Remove item from cart
router.post('/cart/remove', auth, async (req, res) => {
  try {
    const { plan } = req.body;
    const userId = req.user?.id || req.user?.sub;
    
    const summary = cartService.removeItem(userId, plan);
    res.json({ ok: true, data: summary });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// POST /api/cart/update - Update item quantity
router.post('/cart/update', auth, async (req, res) => {
  try {
    const { plan, quantity } = req.body;
    const userId = req.user?.id || req.user?.sub;
    
    const summary = cartService.updateQuantity(userId, plan, quantity);
    res.json({ ok: true, data: summary });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// POST /api/cart/clear - Clear cart
router.post('/cart/clear', auth, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.sub;
    cartService.clearCart(userId);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ========================================================
// CHECKOUT ENDPOINTS
// ========================================================

// POST /api/checkout/create - Create checkout session
router.post('/checkout/create', auth, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.sub;
    const { method } = req.body; // vnpay, momo, sepay

    // Validate cart
    const validation = cartService.validateCart(userId);
    if (!validation.valid) {
      return res.status(400).json({ ok: false, errors: validation.errors });
    }

    // Get checkout data
    const checkoutData = cartService.getCheckoutData(userId);
    
    // Create order
    const order = orderService.createOrder(userId, checkoutData, method);
    
    // Get payment URL based on method
    let paymentUrl = null;
    
    switch (method) {
      case 'sepay':
        const sepayResult = await sepay.createPayment(order.orderId, checkoutData.items[0]?.plan || 'PRO');
        paymentUrl = sepayResult.paymentUrl || sepayResult.link;
        break;
        
      case 'momo':
        const momoResult = await momo.createPayment(order.orderId, checkoutData.items[0]?.plan || 'PRO');
        paymentUrl = momoResult.payUrl || momoResult.payURL;
        break;
        
      case 'vnpay':
        const vnpResult = await vnPay.createPayment(order.orderId, checkoutData.total, `Order ${order.orderId}`);
        paymentUrl = vnpResult.paymentUrl;
        break;
        
      default:
        return res.status(400).json({ ok: false, error: 'Unsupported payment method' });
    }

    res.json({
      ok: true,
      data: {
        orderId: order.orderId,
        paymentUrl,
        amount: checkoutData.total,
        method,
        expiresAt: checkoutData.validUntil
      }
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// GET /api/checkout/confirm/:orderId - Confirm payment success
router.get('/checkout/confirm/:orderId', auth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = orderService.getOrder(orderId);
    
    if (!order) {
      return res.status(404).json({ ok: false, error: 'Order not found' });
    }

    if (order.status === 'paid') {
      return res.json({
        ok: true,
        message: 'Payment already confirmed',
        data: order
      });
    }

    // Update to paid
    orderService.markAsPaid(orderId, order.transactionId || 'manual-confirm', {});
    
    // Clear cart after successful payment
    const userId = req.user?.id || req.user?.sub;
    cartService.clearCart(userId);

    res.json({
      ok: true,
      message: 'Payment confirmed successfully',
      data: {
        orderId: order.orderId,
        items: order.items,
        total: order.total
      }
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ========================================================
// ORDER ENDPOINTS
// ========================================================

// GET /api/orders - Get order history
router.get('/orders', auth, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.sub;
    const history = orderService.getOrderHistory(userId);
    res.json({ ok: true, data: history });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// GET /api/orders/:orderId - Get order details
router.get('/orders/:orderId', auth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = orderService.getOrder(orderId);
    
    if (!order) {
      return res.status(404).json({ ok: false, error: 'Order not found' });
    }

    res.json({ ok: true, data: order });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// GET /api/orders/stats - Get order statistics
router.get('/orders/stats', auth, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.sub;
    const stats = orderService.getOrderStats(userId);
    res.json({ ok: true, data: stats });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ========================================================
// PAYMENT WEBHOOKS (Automated)
// ========================================================

// SePay webhook
router.post('/webhook/sepay', async (req, res) => {
  try {
    const result = sepay.handleCallback(req.body);
    
    if (result.ok) {
      orderService.markAsPaid(result.orderId, result.bankTransactionId, req.body);
    }
    
    res.json({ result: 'ok' });
  } catch (error) {
    res.status(500).json({ result: 'error' });
  }
});

// VNPay webhook
router.post('/webhook/vnpay', async (req, res) => {
  try {
    const result = vnPay.handleCallback(req.body);
    
    if (result.ok) {
      orderService.markAsPaid(result.transactionId, result.bankTransactionId, req.body);
    }
    
    res.json({ result: 'ok' });
  } catch (error) {
    res.status(500).json({ result: 'error' });
  }
});

// MoMo webhook
router.post('/webhook/momo', async (req, res) => {
  try {
    const { resultCode, orderId, transId } = req.body;
    
    if (resultCode === 0) {
      orderService.markAsPaid(orderId, transId, req.body);
    }
    
    res.json({ result: 'ok' });
  } catch (error) {
    res.status(500).json({ result: 'error' });
  }
});

module.exports = router;