require('dotenv').config();

module.exports = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
  
  database: {
    path: process.env.DB_PATH || './data/ecosyntech.db'
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? null : 'dev-secret-change-me'),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
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

  opsSchedulerDisabled: process.env.OPS_SCHEDULER_DISABLED === 'true',
  opsHotReloadEnabled: process.env.OPS_HOT_RELOAD_ENABLED === 'true',
  opsSchedulerInterval: parseInt(process.env.OPS_SCHEDULER_INTERVAL || '600000', 10),
  
  webhook: {
    secret: process.env.WEBHOOK_SECRET || 'webhook-secret'
  },

  blockchain: {
    enabled: process.env.BLOCKCHAIN_ENABLED === 'true',
    type: process.env.BLOCKCHAIN_TYPE || 'aptos',
    network: process.env.APTOS_NETWORK || 'testnet',
    moduleAddress: process.env.APTOS_MODULE_ADDRESS || '0x1',
    privateKey: process.env.APTOS_PRIVATE_KEY || ''
  },

  qrcode: {
    enabled: process.env.QR_CODE_ENABLED !== 'false',
    baseUrl: process.env.QR_CODE_BASE_URL || 'https://ecosyntech.com'
  }
};
