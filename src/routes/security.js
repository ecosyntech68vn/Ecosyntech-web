const express = require('express');
const router = express.Router();
const { getAll, getOne, runQuery } = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');
const { auth: authenticate } = require('../middleware/auth');
const { verifyAuditChain } = require('../middleware/audit-tamper-proof');
const { v4: uuidv4 } = require('uuid');

router.get('/ip-whitelist', authenticate, asyncHandler(async (req, res) => {
  const ips = getAll('SELECT * FROM ip_whitelist ORDER BY created_at DESC');
  res.json({ success: true, ips });
}));

router.post('/ip-whitelist', authenticate, asyncHandler(async (req, res) => {
  const { ip, description, expires_at } = req.body;
  const id = uuidv4();
  
  runQuery(
    'INSERT INTO ip_whitelist (id, ip, description, expires_at, created_at) VALUES (?, ?, ?, ?, ?)',
    [id, ip, description, expires_at, new Date().toISOString()]
  );
  
  res.json({ success: true, id, message: 'IP added to whitelist' });
}));

router.delete('/ip-whitelist/:id', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  runQuery('DELETE FROM ip_whitelist WHERE id = ?', [id]);
  res.json({ success: true, message: 'IP removed from whitelist' });
}));

router.get('/audit-log', authenticate, asyncHandler(async (req, res) => {
  const { startDate, endDate, userId, action, limit = 100 } = req.query;
  
  let sql = 'SELECT * FROM audit_logs WHERE 1=1';
  const params = [];
  
  if (startDate) { sql += ' AND timestamp >= ?'; params.push(startDate); }
  if (endDate) { sql += ' AND timestamp <= ?'; params.push(endDate); }
  if (userId) { sql += ' AND user_id = ?'; params.push(userId); }
  if (action) { sql += ' AND action LIKE ?'; params.push(`%${action}%`); }
  
  sql += ' ORDER BY timestamp DESC LIMIT ?';
  params.push(parseInt(limit));
  
  const logs = getAll(sql, params);
  res.json({ success: true, logs });
}));

router.post('/audit-log', authenticate, asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'manager') {
    return res.status(403).json({ error: 'Admin or Manager role required' });
  }
  
  const { action, userId, details, ip } = req.body;
  
  runQuery(
    'INSERT INTO audit_logs (id, action, user_id, details, ip, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
    [uuidv4(), action, userId, JSON.stringify(details || {}), ip || 'unknown', new Date().toISOString()]
  );
  
  res.json({ success: true });
}));

router.get('/security-scan', authenticate, asyncHandler(async (req, res) => {
  const failedLogins = getOne(
    'SELECT COUNT(*) as count FROM audit_logs WHERE action = ? AND timestamp >= datetime("now", "-1 hour")',
    ['login_failed']
  );
  
  const suspiciousIPs = getAll(`
    SELECT ip, COUNT(*) as count FROM audit_logs 
    WHERE action = 'login_failed' AND timestamp >= datetime('now', '-1 hour')
    GROUP BY ip HAVING count > 5
  `);
  
  const rateLimitHits = getOne(
    'SELECT COUNT(*) as count FROM audit_logs WHERE action = ? AND timestamp >= datetime("now", "-1 hour")',
    ['rate_limit_exceeded']
  );
  
  const inactiveSessions = getAll(`
    SELECT * FROM sessions WHERE last_activity < datetime('now', '-1 hour')
  `);
  
  res.json({
    success: true,
    security: {
      failedLoginsLastHour: failedLogins?.count || 0,
      suspiciousIPs,
      rateLimitHitsLastHour: rateLimitHits?.count || 0,
      inactiveSessions: inactiveSessions.length,
      recommendations: [
        ...(failedLogins?.count > 10 ? ['Consider blocking suspicious IPs'] : []),
        ...(rateLimitHits?.count > 50 ? ['Review rate limiting configuration'] : []),
        ...(inactiveSessions.length > 0 ? ['Clean up inactive sessions'] : [])
      ]
    }
  });
}));

router.get('/sessions', authenticate, asyncHandler(async (req, res) => {
  const sessions = getAll('SELECT * FROM sessions ORDER BY last_activity DESC');
  res.json({ success: true, sessions });
}));

router.delete('/sessions/:id', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  runQuery('DELETE FROM sessions WHERE id = ?', [id]);
  res.json({ success: true, message: 'Session terminated' });
}));

router.delete('/sessions', authenticate, asyncHandler(async (req, res) => {
  runQuery('DELETE FROM sessions WHERE last_activity < datetime("now", "-1 hour")');
  res.json({ success: true, message: 'Inactive sessions cleared' });
}));

router.get('/api-keys', authenticate, asyncHandler(async (req, res) => {
  const keys = getAll(`
    SELECT ak.*, d.name as device_name, u.name as user_name
    FROM api_keys ak
    LEFT JOIN devices d ON ak.device_id = d.id
    LEFT JOIN users u ON ak.user_id = u.id
    ORDER BY ak.created_at DESC
  `);
  res.json({ success: true, keys: keys.map(k => ({ ...k, key: k.key.substring(0, 8) + '****' })) });
}));

router.post('/api-keys', authenticate, asyncHandler(async (req, res) => {
  const { name, deviceId, userId, permissions, expires_at } = req.body;
  const key = 'ek_' + uuidv4().replace(/-/g, '');
  const id = uuidv4();
  
  runQuery(
    'INSERT INTO api_keys (id, key, device_id, user_id, name, permissions, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [id, key, deviceId, userId, name, JSON.stringify(permissions || []), expires_at, new Date().toISOString()]
  );
  
  res.json({ success: true, key, message: 'API key created. Store it securely - it will not be shown again.' });
}));

router.delete('/api-keys/:id', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  runQuery('DELETE FROM api_keys WHERE id = ?', [id]);
  res.json({ success: true, message: 'API key revoked' });
}));

router.get('/rate-limit-status', authenticate, asyncHandler(async (req, res) => {
  const settings = getOne('SELECT value FROM settings WHERE key = \'rate_limit_config\'');
  const stats = getOne(`
    SELECT COUNT(*) as hits FROM audit_logs 
    WHERE action = 'rate_limit_check' AND timestamp >= datetime('now', '-1 hour')
  `);
  
  res.json({
    success: true,
    rateLimit: {
      config: settings ? JSON.parse(settings.value) : { windowMs: 900000, maxRequests: 100 },
      hitsLastHour: stats?.count || 0
    }
  });
}));

router.put('/rate-limit-config', authenticate, asyncHandler(async (req, res) => {
  const { windowMs, maxRequests } = req.body;
  
  runQuery(
    'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)',
    ['rate_limit_config', JSON.stringify({ windowMs, maxRequests }), new Date().toISOString()]
  );
  
  res.json({ success: true, message: 'Rate limit configuration updated' });
}));

router.get('/audit-chain-verify', authenticate, asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin role required' });
  }
  
  const result = await verifyAuditChain();
  res.json({
    success: true,
    chainValid: result.valid,
    totalEntries: result.totalEntries,
    message: result.valid ? 'Audit chain is valid - no tampering detected' : 'WARNING: Audit chain compromised!'
  });
}));

module.exports = router;