const crypto = require('crypto');

// Canonical envelope utilities: sign and verify payloads with nonce replay guard

const NONCE_WINDOW_SEC = 1200; // 20 minutes
let seenNonces = new Map();

function cleanupNonces() {
  const now = Date.now();
  for (const [key, ts] of seenNonces.entries()) {
    if (now - ts > NONCE_WINDOW_SEC * 1000) seenNonces.delete(key);
  }
}

function canonicalStringify(obj) {
  if (obj === null || obj === undefined) return 'null';
  if (typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(canonicalStringify).join(',') + ']';
  const keys = Object.keys(obj).sort();
  return '{' + keys.map(k => `"${k}":${canonicalStringify(obj[k])}`).join(',') + '}';
}

function hmacHex(message) {
  const secret = process.env.HMAC_SECRET || 'CEOTAQUANGTHUAN_TADUYANH_CTYTNHHDUYANH_ECOSYNTECH_2026';
  return crypto.createHmac('sha256', secret).update(message).digest('hex');
}

function signEnvelope(payload) {
  // Returns envelope with signature
  return { payload, signature: hmacHex(canonicalStringify(payload)) };
}

function verifyEnvelope(payload, signature) {
  if (!payload || typeof payload !== 'object') return { valid: false, error: 'Invalid payload' };
  if (!signature) return { valid: false, error: 'Missing signature' };
  if (!payload._did) return { valid: false, error: 'Missing device id' };
  if (!payload._ts) return { valid: false, error: 'Missing timestamp' };
  if (!payload._nonce) return { valid: false, error: 'Missing nonce' };

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(payload._ts)) > NONCE_WINDOW_SEC) {
    return { valid: false, error: 'Timestamp expired' };
  }

  cleanupNonces();
  const nonceKey = `${payload._did}:${payload._nonce}`;
  if (seenNonces.has(nonceKey)) {
    return { valid: false, error: 'Replay detected' };
  }

  const expected = hmacHex(canonicalStringify(payload));
  if (expected !== signature) {
    return { valid: false, error: 'Invalid signature' };
  }

  seenNonces.set(nonceKey, Date.now());
  return { valid: true };
}

module.exports = {
  signEnvelope,
  verifyEnvelope
};
