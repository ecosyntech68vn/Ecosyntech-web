const crypto = require('crypto');

const HMAC_SECRET = process.env.HMAC_SECRET || process.env.JWT_SECRET;

function computeHmacSha256(message, key) {
  if (!key) return null;
  return crypto.createHmac('sha256', key).update(message).digest('hex');
}

function canonicalStringify(obj) {
  if (obj === null || obj === undefined) return 'null';
  if (typeof obj !== 'object') return String(obj);
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalStringify).join(',') + ']';
  }
  const keys = Object.keys(obj).sort();
  const pairs = keys.map(k => `"${k}":${canonicalStringify(obj[k])}`);
  return '{' + pairs.join(',') + '}';
}

function responseSignatureMiddleware(req, res, next) {
  if (!HMAC_SECRET) {
    return next();
  }

  const originalJson = res.json.bind(res);

  res.json = function(data) {
    const timestamp = new Date().toISOString();
    const payload = canonicalStringify(data);
    const message = `${timestamp}.${req.method}.${req.originalUrl}.${payload}`;
    const signature = computeHmacSha256(message, HMAC_SECRET);

    res.set({
      'X-Response-Signature': signature,
      'X-Response-Timestamp': timestamp
    });

    return originalJson(data);
  };

  next();
}

function verifyResponseSignature(data, signature, timestamp, method, url) {
  if (!HMAC_SECRET || !signature) return false;
  const payload = canonicalStringify(data);
  const message = `${timestamp}.${method}.${url}.${payload}`;
  const expected = computeHmacSha256(message, HMAC_SECRET);
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

module.exports = {
  computeHmacSha256,
  canonicalStringify,
  responseSignatureMiddleware,
  verifyResponseSignature
};