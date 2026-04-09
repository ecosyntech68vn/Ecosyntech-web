const express = require('express');
const router = express.Router();
const { getAll, getOne, runQuery } = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../config/logger');
const { broadcast } = require('../websocket');

router.get('/', asyncHandler(async (req, res) => {
  const rules = getAll('SELECT * FROM rules ORDER BY name');
  
  const result = rules.map(rule => ({
    id: rule.id,
    name: rule.name,
    description: rule.description,
    enabled: !!rule.enabled,
    condition: JSON.parse(rule.condition),
    action: JSON.parse(rule.action),
    cooldownMinutes: rule.cooldown_minutes,
    triggerCount: rule.trigger_count,
    lastTriggered: rule.last_triggered
  }));
  
  res.json(result);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const rule = getOne('SELECT * FROM rules WHERE id = ?', [req.params.id]);
  
  if (!rule) {
    return res.status(404).json({ error: 'Rule not found' });
  }
  
  res.json({
    id: rule.id,
    name: rule.name,
    description: rule.description,
    enabled: !!rule.enabled,
    condition: JSON.parse(rule.condition),
    action: JSON.parse(rule.action),
    cooldownMinutes: rule.cooldown_minutes,
    triggerCount: rule.trigger_count,
    lastTriggered: rule.last_triggered
  });
}));

router.post('/', asyncHandler(async (req, res) => {
  const { name, description, condition, action, cooldownMinutes } = req.body;
  
  if (!name || !condition || !action) {
    return res.status(400).json({ error: 'name, condition, and action are required' });
  }
  
  const id = `rule-${Date.now()}`;
  
  runQuery(
    'INSERT INTO rules (id, name, description, enabled, condition, action, cooldown_minutes) VALUES (?, ?, ?, 1, ?, ?, ?)',
    [id, name, description || '', JSON.stringify(condition), JSON.stringify(action), cooldownMinutes || 30]
  );
  
  const rule = getOne('SELECT * FROM rules WHERE id = ?', [id]);
  
  logger.info(`Rule created: ${name} (${id})`);
  broadcast({ type: 'rule', action: 'created', data: rule });
  
  res.status(201).json({
    id: rule.id,
    name: rule.name,
    description: rule.description,
    enabled: !!rule.enabled,
    condition: JSON.parse(rule.condition),
    action: JSON.parse(rule.action),
    cooldownMinutes: rule.cooldown_minutes,
    triggerCount: 0,
    lastTriggered: null
  });
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const rule = getOne('SELECT * FROM rules WHERE id = ?', [req.params.id]);
  
  if (!rule) {
    return res.status(404).json({ error: 'Rule not found' });
  }
  
  const { name, description, enabled, condition, action, cooldownMinutes } = req.body;
  
  runQuery(
    'UPDATE rules SET name = ?, description = ?, enabled = ?, condition = ?, action = ?, cooldown_minutes = ?, updated_at = datetime("now") WHERE id = ?',
    [
      name || rule.name,
      description !== undefined ? description : rule.description,
      enabled !== undefined ? (enabled ? 1 : 0) : rule.enabled,
      condition ? JSON.stringify(condition) : rule.condition,
      action ? JSON.stringify(action) : rule.action,
      cooldownMinutes || rule.cooldown_minutes,
      req.params.id
    ]
  );
  
  const updatedRule = getOne('SELECT * FROM rules WHERE id = ?', [req.params.id]);
  
  logger.info(`Rule updated: ${req.params.id}`);
  broadcast({ type: 'rule', action: 'updated', data: updatedRule });
  
  res.json({
    id: updatedRule.id,
    name: updatedRule.name,
    description: updatedRule.description,
    enabled: !!updatedRule.enabled,
    condition: JSON.parse(updatedRule.condition),
    action: JSON.parse(updatedRule.action),
    cooldownMinutes: updatedRule.cooldown_minutes,
    triggerCount: updatedRule.trigger_count,
    lastTriggered: updatedRule.last_triggered
  });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const rule = getOne('SELECT * FROM rules WHERE id = ?', [req.params.id]);
  
  if (!rule) {
    return res.status(404).json({ error: 'Rule not found' });
  }
  
  runQuery('DELETE FROM rules WHERE id = ?', [req.params.id]);
  
  logger.info(`Rule deleted: ${req.params.id}`);
  broadcast({ type: 'rule', action: 'deleted', data: { id: req.params.id } });
  
  res.status(204).send();
}));

router.post('/:id/toggle', asyncHandler(async (req, res) => {
  const rule = getOne('SELECT * FROM rules WHERE id = ?', [req.params.id]);
  
  if (!rule) {
    return res.status(404).json({ error: 'Rule not found' });
  }
  
  const newEnabled = rule.enabled ? 0 : 1;
  
  runQuery('UPDATE rules SET enabled = ? WHERE id = ?', [newEnabled, req.params.id]);
  
  logger.info(`Rule ${req.params.id} ${newEnabled ? 'enabled' : 'disabled'}`);
  broadcast({ type: 'rule', action: 'toggled', data: { id: req.params.id, enabled: !!newEnabled } });
  
  res.json({ success: true, enabled: !!newEnabled });
}));

module.exports = router;
