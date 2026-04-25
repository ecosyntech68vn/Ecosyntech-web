/**
 * Shopping Cart Service
 */

const { PLANS } = require('../services/pricingService');

class CartService {
  constructor() {
    this.carts = new Map(); // userId -> cart items
  }

  getCart(userId) {
    if (!this.carts.has(userId)) {
      this.carts.set(userId, []);
    }
    return this.carts.get(userId);
  }

  addItem(userId, plan, duration = 1) {
    const cart = this.getCart(userId);
    const existing = cart.findIndex(item => item.plan === plan);
    
    if (existing >= 0) {
      cart[existing].duration += duration;
      cart[existing].quantity = (cart[existing].quantity || 1) + 1;
    } else {
      cart.push({
        plan,
        duration,
        quantity: 1,
        addedAt: new Date().toISOString()
      });
    }
    
    this.carts.set(userId, cart);
    return this.getCartSummary(userId);
  }

  removeItem(userId, plan) {
    const cart = this.getCart(userId);
    const filtered = cart.filter(item => item.plan !== plan);
    this.carts.set(userId, filtered);
    return this.getCartSummary(userId);
  }

  updateQuantity(userId, plan, quantity) {
    const cart = this.getCart(userId);
    const item = cart.find(i => i.plan === plan);
    
    if (item) {
      if (quantity <= 0) {
        return this.removeItem(userId, plan);
      }
      item.quantity = quantity;
    }
    
    this.carts.set(userId, cart);
    return this.getCartSummary(userId);
  }

  clearCart(userId) {
    this.carts.set(userId, []);
    return { ok: true };
  }

  getCartSummary(userId) {
    const cart = this.getCart(userId);
    
    const items = cart.map(item => {
      const planInfo = PLANS[item.plan];
      const monthlyPrice = planInfo?.price || 0;
      const total = monthlyPrice * item.duration * item.quantity;
      
      return {
        plan: item.plan,
        planName: planInfo?.name || item.plan,
        quantity: item.quantity,
        duration: item.duration,
        monthlyPrice,
        total,
        features: planInfo?.features || {}
      };
    });

    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const itemsCount = items.reduce((sum, item) => sum + item.quantity, 0);

    return {
      userId,
      items,
      itemsCount,
      subtotal,
      total: subtotal,
      currency: 'VND',
      validUntil: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 min
    };
  }

  validateCart(userId) {
    const summary = this.getCartSummary(userId);
    const errors = [];

    if (summary.itemsCount === 0) {
      errors.push('Cart is empty');
    }

    for (const item of summary.items) {
      if (!PLANS[item.plan]) {
        errors.push(`Invalid plan: ${item.plan}`);
      }
      if (item.quantity < 1) {
        errors.push('Quantity must be at least 1');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  getCheckoutData(userId) {
    const validation = this.validateCart(userId);
    if (!validation.valid) {
      return { ok: false, errors: validation.errors };
    }

    const summary = this.getCartSummary(userId);
    const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    return {
      ok: true,
      orderId,
      items: summary.items,
      subtotal: summary.subtotal,
      total: summary.total,
      currency: summary.currency,
      validUntil: summary.validUntil
    };
  }
}

module.exports = new CartService();