const logger = require('../config/logger');

const rateLimits = new Map();
const DEVICE_LIMITS = {
  free: 100,
  basic: 500,
  premium: 2000,
  enterprise: 10000
};

const DEFAULT_LIMIT = DEVICE_LIMITS.free;
const WINDOW_MS = 60 * 1000;

function getDeviceTier(deviceId) {
  return 'free';
}

function rateLimitPerDevice(req, res, next) {
  const deviceId = req.headers['x-device-id'] || req.ip;
  const tier = getDeviceTier(deviceId);
  const limit = DEVICE_LIMITS[tier] || DEFAULT_LIMIT;
  
  const key = `ratelimit:${deviceId}`;
  const now = Date.now();
  
  if (!rateLimits.has(key)) {
    rateLimits.set(key, { count: 0, resetAt: now + WINDOW_MS });
  }
  
  const rl = rateLimits.get(key);
  
  if (now > rl.resetAt) {
    rl.count = 0;
    rl.resetAt = now + WINDOW_MS;
  }
  
  rl.count++;
  
  const remaining = Math.max(0, limit - rl.count);
  const resetSeconds = Math.ceil((rl.resetAt - now) / 1000);
  
  res.setHeader('X-RateLimit-Limit', limit);
  res.setHeader('X-RateLimit-Remaining', remaining);
  res.setHeader('X-RateLimit-Reset', resetSeconds);
  
  if (rl.count > limit) {
    logger.warn(`[RateLimit] Device ${deviceId} exceeded limit: ${rl.count}/${limit}`);
    return res.status(429).json({
      error: 'Rate limit exceeded',
      retryAfter: resetSeconds
    });
  }
  
  next();
}

function cleanupRateLimits() {
  const now = Date.now();
  for (const [key, rl] of rateLimits) {
    if (now > rl.resetAt) {
      rateLimits.delete(key);
    }
  }
}

if (process.env.NODE_ENV !== 'test') {
  setInterval(cleanupRateLimits, 60000);
}

module.exports = {
  rateLimitPerDevice,
  getDeviceTier,
  DEVICE_LIMITS
};
