const express = require('express');
const router = express.Router();
const { getAll, getOne, runQuery } = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../config/logger');
const { broadcast } = require('../websocket');

router.get('/', asyncHandler(async (req, res) => {
  const includeAcknowledged = req.query.includeAcknowledged === 'true';
  
  let query = 'SELECT * FROM alerts ORDER BY timestamp DESC LIMIT 100';
  if (!includeAcknowledged) {
    query = 'SELECT * FROM alerts WHERE acknowledged = 0 ORDER BY timestamp DESC LIMIT 100';
  }
  
  const alerts = getAll(query);
  
  const result = alerts.map(alert => ({
    id: alert.id,
    type: alert.type,
    severity: alert.severity,
    sensor: alert.sensor,
    value: alert.value,
    message: alert.message,
    acknowledged: !!alert.acknowledged,
    acknowledgedAt: alert.acknowledged_at,
    timestamp: alert.timestamp
  }));
  
  res.json(result);
}));

router.post('/', asyncHandler(async (req, res) => {
  const { type, severity, sensor, value, message } = req.body;
  
  if (!type) {
    return res.status(400).json({ error: 'type is required' });
  }
  
  const id = `alert-${Date.now()}`;
  
  runQuery(
    'INSERT INTO alerts (id, type, severity, sensor, value, message, timestamp) VALUES (?, ?, ?, ?, ?, ?, datetime("now"))',
    [id, type, severity || 'info', sensor || null, value || null, message || '']
  );
  
  const alert = getOne('SELECT * FROM alerts WHERE id = ?', [id]);
  
  logger.warn(`Alert created: ${type} - ${message || 'No message'}`);
  broadcast({ type: 'alert', action: 'created', data: alert });
  
  res.status(201).json({
    id: alert.id,
    type: alert.type,
    severity: alert.severity,
    sensor: alert.sensor,
    value: alert.value,
    message: alert.message,
    acknowledged: false,
    timestamp: alert.timestamp
  });
}));

router.post('/:id/acknowledge', asyncHandler(async (req, res) => {
  const alert = getOne('SELECT * FROM alerts WHERE id = ?', [req.params.id]);
  
  if (!alert) {
    return res.status(404).json({ error: 'Alert not found' });
  }
  
  runQuery(
    'UPDATE alerts SET acknowledged = 1, acknowledged_at = datetime("now") WHERE id = ?',
    [req.params.id]
  );
  
  const updatedAlert = getOne('SELECT * FROM alerts WHERE id = ?', [req.params.id]);
  
  logger.info(`Alert ${req.params.id} acknowledged`);
  broadcast({ type: 'alert', action: 'acknowledged', data: updatedAlert });
  
  res.json({
    id: updatedAlert.id,
    acknowledged: !!updatedAlert.acknowledged,
    acknowledgedAt: updatedAlert.acknowledged_at
  });
}));

router.post('/acknowledge-all', asyncHandler(async (req, res) => {
  const result = runQuery('UPDATE alerts SET acknowledged = 1, acknowledged_at = datetime("now") WHERE acknowledged = 0');
  
  logger.info(`${result.changes} alerts acknowledged`);
  broadcast({ type: 'alert', action: 'all-acknowledged' });
  
  res.json({ success: true, count: result.changes });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const alert = getOne('SELECT * FROM alerts WHERE id = ?', [req.params.id]);
  
  if (!alert) {
    return res.status(404).json({ error: 'Alert not found' });
  }
  
  runQuery('DELETE FROM alerts WHERE id = ?', [req.params.id]);
  
  res.status(204).send();
}));

router.delete('/', asyncHandler(async (req, res) => {
  const acknowledgedOnly = req.query.acknowledgedOnly === 'true';
  
  if (acknowledgedOnly) {
    runQuery('DELETE FROM alerts WHERE acknowledged = 1');
  } else {
    runQuery('DELETE FROM alerts');
  }
  
  logger.info('Alerts cleared');
  
  res.status(204).send();
}));

module.exports = router;
