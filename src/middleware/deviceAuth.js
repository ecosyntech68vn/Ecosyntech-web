"use strict";
const crypto = require('crypto');

// In-memory store for device secrets and nonce tracking (simple prototype)
// In production, replace with DB-backed secrets/nonce store synchronized with GAS provisioning.
const DEV_SECRETS = {
  // Example: ESP32 devices mapped to a secret here. Extend as needed.
  // This is a placeholder; real secrets should be injected via provisioning process.
  'ECOSYNTECH0001': '0123456789abcdef0123456789abcdef01234567'
};

const NONCE_STORE = new Map(); // deviceId => Set of nonces

function canonicalJson(payload) {
  if (!payload || typeof payload !== 'object') return '{}';
  const keys = Object.keys(payload).sort();
  const obj = {};
  for (const k of keys) obj[k] = payload[k];
  return JSON.stringify(obj);
}

function lookupDeviceSecret(did) {
  return DEV_SECRETS[did] || null;
}

async function wasNonceUsed(did, nonce) {
  const set = NONCE_STORE.get(did);
  if (!set) return false;
  return set.has(nonce);
}

async function rememberNonce(did, nonce, ttlMs) {
  let set = NONCE_STORE.get(did);
  if (!set) {
    set = new Set();
    NONCE_STORE.set(did, set);
  }
  set.add(nonce);
  // Simple TTL prune (no persistent TTL store; socket burst is unlikely in tests)
  setTimeout(() => {
    set.delete(nonce);
  }, ttlMs || 600000);
}

module.exports = async function deviceAuthMiddleware(req, res, next) {
  // Expect firmware payload at top level
  const did = req.body._did || req.body.device_id;
  const sig = req.body.signature;
  const ts = parseInt(req.body._ts, 10);
  const nonce = req.body._nonce;

  if (!did || !sig || !ts || !nonce) {
    return res.status(401).json({ ok: false, code: 'MISSING_AUTH' });
  }

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > 300) {
    return res.status(401).json({ ok: false, code: 'TS_OUT_OF_WINDOW' });
  }

  const secret = lookupDeviceSecret(did);
  if (!secret) return res.status(401).json({ ok: false, code: 'UNKNOWN_DEVICE' });

  const payload = req.body.payload || req.body; // try best effort
  const canon = canonicalJson(payload);
  const msg = did + '|' + nonce + '|' + ts + '|' + canon;
  const expected = crypto.createHmac('sha256', secret).update(msg).digest('hex');

  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return res.status(401).json({ ok: false, code: 'SIG_INVALID' });
    }
  } catch (e) {
    return res.status(401).json({ ok: false, code: 'SIG_INVALID' });
  }

  const reused = await wasNonceUsed(did, nonce);
  if (reused) {
    return res.status(401).json({ ok: false, code: 'NONCE_REUSED' });
  }
  await rememberNonce(did, nonce, 600000);
  req.deviceId = did;
  next();
};
