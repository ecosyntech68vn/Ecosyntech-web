/**
 * Order Service
 * Manages e-commerce orders
 */

const crypto = require('crypto');

class OrderService {
  constructor() {
    this.orders = new Map();
    this.sequence = 0;
  }

  generateOrderId() {
    this.sequence++;
    const seq = String(this.sequence).padStart(6, '0');
    const timestamp = Date.now().toString(36).toUpperCase();
    return `ORD-${timestamp.slice(-6)}${seq}`;
  }

  createOrder(userId, items, paymentMethod, total) {
    const orderId = this.generateOrderId();
    const order = {
      id: orderId,
      userId,
      items,
      paymentMethod,
      total,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.orders.set(orderId, order);
    return order;
  }

  getOrder(orderId) {
    return this.orders.get(orderId);
  }

  updateOrderStatus(orderId, status) {
    const order = this.orders.get(orderId);
    if (order) {
      order.status = status;
      order.updatedAt = new Date().toISOString();
    }
    return order;
  }

  getUserOrders(userId) {
    const orders = [];
    for (const [id, order] of this.orders) {
      if (order.userId === userId) {
        orders.push(order);
      }
    }
    return orders;
  }
}

module.exports = new OrderService();