const crypto = require('crypto');
const { runQuery, getOne } = require('../config/database');

const AUDIT_CHAIN_KEY = process.env.AUDIT_CHAIN_KEY || process.env.HMAC_SECRET || process.env.JWT_SECRET;

let lastAuditHash = null;

async function getLastAuditHash() {
  if (lastAuditHash) return lastAuditHash;
  const row = await getOne('SELECT hash FROM audit_logs ORDER BY timestamp DESC LIMIT 1');
  lastAuditHash = row ? row.hash : 'GENESIS';
  return lastAuditHash;
}

function computeAuditHash(prevHash, data) {
  const payload = `${prevHash}.${data.timestamp}.${data.action}.${data.user_id}.${data.details}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

async function logTamperProofAudit(action, userId, details, ip) {
  const prevHash = await getLastAuditHash();
  const timestamp = new Date().toISOString();
  const entry = { timestamp, action, user_id: userId, details };
  const hash = computeAuditHash(prevHash, entry);

  await runQuery(
    `INSERT INTO audit_logs (id, action, user_id, details, ip, timestamp, prev_hash, hash) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [crypto.randomUUID(), action, userId, details, ip, timestamp, prevHash, hash]
  );

  lastAuditHash = hash;
  return { timestamp, hash, prevHash };
}

async function verifyAuditChain() {
  const rows = await getAll('SELECT id, timestamp, action, user_id, details, prev_hash, hash FROM audit_logs ORDER BY timestamp');
  let isValid = true;
  let expectedPrev = 'GENESIS';

  for (const row of rows) {
    const computed = computeAuditHash(expectedPrev, {
      timestamp: row.timestamp,
      action: row.action,
      user_id: row.user_id,
      details: row.details
    });

    if (computed !== row.hash) {
      isValid = false;
      break;
    }
    expectedPrev = row.hash;
  }

  return { valid: isValid, totalEntries: rows.length };
}

function getAuditHashMiddleware(req, res, next) {
  req.auditLog = async (action, details) => {
    const userId = req.user ? req.user.id : 'system';
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    return logTamperProofAudit(action, userId, details, ip);
  };
  next();
}

module.exports = {
  computeAuditHash,
  logTamperProofAudit,
  verifyAuditChain,
  getAuditHashMiddleware
};