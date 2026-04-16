const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

function getJwtConfig() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'test') {
      return {
        secret: 'test-jwt-secret-for-testing-only',
        expiresIn: '1h',
        refreshExpiresIn: '7d'
      };
    }
    throw new Error('JWT_SECRET environment variable is required');
  }
  return {
    secret,
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    refreshExpiresIn: process.env.REFRESH_EXPIRES_IN || '7d'
  };
}

function generateAccessToken(user) {
  const config = getJwtConfig();
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role
    },
    config.secret,
    { expiresIn: config.expiresIn }
  );
}

function generateRefreshToken(user) {
  const config = getJwtConfig();
  return jwt.sign(
    {
      sub: user.id,
      type: 'refresh'
    },
    config.secret,
    { expiresIn: config.refreshExpiresIn }
  );
}

function verifyToken(token) {
  try {
    const config = getJwtConfig();
    return jwt.verify(token, config.secret);
  } catch (err) {
    return null;
  }
}

function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const token = authHeader.substring(7);
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired access token' });
  }

  req.user = decoded;
  next();
}

function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (decoded) {
      req.user = decoded;
    }
  }
  
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
}

// API Key authentication for devices
function apiKeyAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }

  const { getOne } = require('../config/database');
  const keyRecord = getOne('SELECT * FROM api_keys WHERE key = ? AND expires_at > datetime("now")', [apiKey]);

  if (!keyRecord) {
    logger.warn(`[Auth] Invalid API key: ${apiKey.substring(0, 8)}...`);
    return res.status(401).json({ error: 'Invalid or expired API key' });
  }

  req.apiKey = keyRecord;
  req.deviceId = keyRecord.device_id;
  next();
}

// HMAC signature authentication for ESP32 (envelope-based)
function hmacAuth(req, res, next) {
  try {
    const payload = req.body?.payload;
    const signature = req.body?.signature;
    if (!payload || !signature) {
      return res.status(401).json({ error: 'Payload and signature required' });
    }
    const verification = require('../utils/envelope').verifyEnvelope(payload, signature);
    if (!verification.valid) {
      return res.status(401).json({ error: verification.error });
    }
    req.deviceEnvelope = payload;
    next();
  } catch (err) {
    logger.error('[Auth] hmacAuth error:', err);
    return res.status(500).json({ error: 'Authentication error' });
  }
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  auth,
  optionalAuth,
  requireRole,
  apiKeyAuth,
  hmacAuth
};
