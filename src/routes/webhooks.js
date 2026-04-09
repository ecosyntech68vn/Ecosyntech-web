const express = require('express');
const router = express.Router();
const { getAll, getOne, runQuery } = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../config/logger');
const crypto = require('crypto');

function verifyWebhookSignature(req, res, next) {
  const signature = req.headers['x-ecosyntech-signature'];
  const secret = req.app.get('webhookSecret') || process.env.WEBHOOK_SECRET;
  
  if (!signature || !secret) {
    return res.status(401).json({ error: 'Missing signature' });
  }
  
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(req.body))
    .digest('hex');
  
  if (signature !== expectedSignature) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  next();
}

router.post('/sensor-alert', verifyWebhookSignature, asyncHandler(async (req, res) => {
  const { sensor, value, severity, message } = req.body;
  
  logger.info(`[Webhook] Sensor Alert: ${sensor} = ${value} (${severity})`);
  
  const id = `alert-${Date.now()}`;
  
  runQuery(
    'INSERT INTO alerts (id, type, severity, sensor, value, message, timestamp) VALUES (?, ?, ?, ?, ?, ?, datetime("now"))',
    [id, 'webhook', severity || 'warning', sensor, value, message || `Sensor ${sensor} alert`]
  );
  
  const alert = getOne('SELECT * FROM alerts WHERE id = ?', [id]);
  
  res.json({ success: true, webhookId: id, alert });
}));

router.post('/device-status', verifyWebhookSignature, asyncHandler(async (req, res) => {
  const { deviceId, status } = req.body;
  
  logger.info(`[Webhook] Device Status: ${deviceId} is ${status}`);
  
  const device = getOne('SELECT * FROM devices WHERE id = ?', [deviceId]);
  
  if (device) {
    runQuery(
      'UPDATE devices SET status = ?, last_seen = datetime("now"), updated_at = datetime("now") WHERE id = ?',
      [status, deviceId]
    );
    
    const historyEntry = {
      id: `history-${Date.now()}`,
      action: `Device ${device.name} ${status === 'online' ? 'connected' : 'disconnected'}`,
      trigger: 'Webhook',
      status: 'success',
      timestamp: new Date().toISOString()
    };
    
    runQuery(
      'INSERT INTO history (id, action, trigger, status, timestamp) VALUES (?, ?, ?, ?, ?)',
      [historyEntry.id, historyEntry.action, historyEntry.trigger, historyEntry.status, historyEntry.timestamp]
    );
  }
  
  res.json({ success: true, deviceId, status });
}));

router.post('/rule-triggered', verifyWebhookSignature, asyncHandler(async (req, res) => {
  const { ruleId, action, result } = req.body;
  
  logger.info(`[Webhook] Rule Triggered: ${ruleId} - ${action}`);
  
  if (ruleId) {
    runQuery(
      'UPDATE rules SET trigger_count = trigger_count + 1, last_triggered = datetime("now") WHERE id = ?',
      [ruleId]
    );
    
    const historyEntry = {
      id: `history-${Date.now()}`,
      action: `Rule triggered: ${action || 'unknown'}`,
      trigger: `Rule ${ruleId}`,
      status: result || 'success',
      timestamp: new Date().toISOString()
    };
    
    runQuery(
      'INSERT INTO history (id, action, trigger, status, timestamp) VALUES (?, ?, ?, ?, ?)',
      [historyEntry.id, historyEntry.action, historyEntry.trigger, historyEntry.status, historyEntry.timestamp]
    );
  }
  
  res.json({ success: true, ruleId, action });
}));

router.post('/schedule-run', verifyWebhookSignature, asyncHandler(async (req, res) => {
  const { scheduleId, name, zones, result } = req.body;
  
  logger.info(`[Webhook] Schedule Run: ${name} (${scheduleId})`);
  
  const historyEntry = {
    id: `history-${Date.now()}`,
    action: `Schedule executed: ${name || scheduleId}`,
    trigger: 'Scheduled',
    status: result || 'success',
    timestamp: new Date().toISOString()
  };
  
  runQuery(
    'INSERT INTO history (id, action, trigger, status, timestamp) VALUES (?, ?, ?, ?, ?)',
    [historyEntry.id, historyEntry.action, historyEntry.trigger, historyEntry.status, historyEntry.timestamp]
  );
  
  res.json({ success: true, scheduleId, zones });
}));

router.post('/sensor-data', verifyWebhookSignature, asyncHandler(async (req, res) => {
  const { type, value, timestamp } = req.body;
  
  logger.info(`[Webhook] Sensor Data: ${type} = ${value}`);
  
  const sensor = getOne('SELECT * FROM sensors WHERE type = ?', [type]);
  
  if (sensor) {
    runQuery(
      'UPDATE sensors SET value = ?, timestamp = ? WHERE type = ?',
      [value, timestamp || new Date().toISOString(), type]
    );
  }
  
  res.json({ success: true, type, value });
}));

module.exports = router;
