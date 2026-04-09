const express = require('express');
const router = express.Router();
const { getAll, getOne, runQuery } = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../config/logger');

router.get('/', asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  
  const history = getAll(`SELECT * FROM history ORDER BY timestamp DESC LIMIT ${limit}`);
  
  const result = history.map(entry => ({
    id: entry.id,
    action: entry.action,
    trigger: entry.trigger,
    status: entry.status,
    timestamp: entry.timestamp
  }));
  
  res.json(result);
}));

router.post('/', asyncHandler(async (req, res) => {
  const { action, trigger, status } = req.body;
  
  if (!action) {
    return res.status(400).json({ error: 'action is required' });
  }
  
  const id = `history-${Date.now()}`;
  
  runQuery(
    'INSERT INTO history (id, action, trigger, status, timestamp) VALUES (?, ?, ?, ?, datetime("now"))',
    [id, action, trigger || 'Manual', status || 'success']
  );
  
  const entry = getOne('SELECT * FROM history WHERE id = ?', [id]);
  
  res.status(201).json({
    id: entry.id,
    action: entry.action,
    trigger: entry.trigger,
    status: entry.status,
    timestamp: entry.timestamp
  });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const entry = getOne('SELECT * FROM history WHERE id = ?', [req.params.id]);
  
  if (!entry) {
    return res.status(404).json({ error: 'History entry not found' });
  }
  
  runQuery('DELETE FROM history WHERE id = ?', [req.params.id]);
  
  res.status(204).send();
}));

router.delete('/', asyncHandler(async (req, res) => {
  runQuery('DELETE FROM history');
  
  logger.info('All history entries cleared');
  
  res.status(204).send();
}));

module.exports = router;
