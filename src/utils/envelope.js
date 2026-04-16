const crypto = require('crypto');

const NONCE_WINDOW_SEC = 1200;
const seenNonces = new Map();

function getHmacSecret() {
  const secret = process.env.HMAC_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'test') {
      return 'test-hmac-secret-for-testing-only';
    }
    throw new Error('HMAC_SECRET environment variable is required');
  }
  return secret;
}

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
  return crypto.createHmac('sha256', getHmacSecret()).update(message).digest('hex');
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
