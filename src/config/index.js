require('dotenv').config();

function requireEnvOrDefault(name, defaultValue) {
  return process.env[name] || defaultValue;
}

module.exports = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
  
  database: {
    path: process.env.DB_PATH || './data/ecosyntech.db'
  },
  
  jwt: {
    secret: requireEnvOrDefault('JWT_SECRET', 'dev-secret-change-me'),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },
  
  hmac: {
    secret: requireEnvOrDefault('HMAC_SECRET', '')
  },
  
  mqtt: {
    brokerUrl: process.env.MQTT_BROKER_URL || 'wss://broker.hivemq.com:8884/mqtt',
    username: process.env.MQTT_USERNAME || '',
    password: process.env.MQTT_PASSWORD || ''
  },
  
  cors: {
    origin: process.env.CORS_ORIGIN || '*'
  },
  
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10)
  },
  
  webhook: {
    secret: process.env.WEBHOOK_SECRET || ''
  }
};
