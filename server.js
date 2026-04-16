require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const http = require('http');

const config = require('./src/config');
const logger = require('./src/config/logger');
const { initDatabase, closeDatabase, getAll, getOne, runQuery, saveDatabase } = require('./src/config/database');
const { errorHandler, notFoundHandler } = require('./src/middleware/errorHandler');
const { initWebSocket, broadcast } = require('./src/websocket');

const sensorsRoutes = require('./src/routes/sensors');
const devicesRoutes = require('./src/routes/devices');
const rulesRoutes = require('./src/routes/rules');
const schedulesRoutes = require('./src/routes/schedules');
const historyRoutes = require('./src/routes/history');
const alertsRoutes = require('./src/routes/alerts');
const webhooksRoutes = require('./src/routes/webhooks');
const statsRoutes = require('./src/routes/stats');
const authRoutes = require('./src/routes/auth');
const webhookRoutes = require('./src/routes/webhook');
const traceabilityRoutes = require('./src/routes/traceability');
const metrics = require('./src/metrics');
// Legacy firmware contract is deprecated and not mounted to avoid dual webhook streams
// (ESP32 should use /api/webhook/esp32 going forward)

function createApp() {
  const app = express();
  
  app.set('webhookSecret', config.webhook.secret);
  
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  }));
  
  app.use(cors({
    origin: config.cors.origin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-EcoSynTech-Signature'],
    credentials: true
  }));
  
  app.use(compression());
  
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  
  const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' }
  });
  app.use('/api/', limiter);

  // Attach metrics endpoint and basic HTTP metrics
  metrics.attachMetrics(app);
  
  app.use((req, res, next) => {
    res.setHeader('X-Response-Time', Date.now());
    logger.info(`${req.method} ${req.path}`, {
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
    // HTTP metrics
    const start = process.hrtime();
    res.on('finish', () => {
      const diff = process.hrtime(start);
      const seconds = diff[0] + diff[1] / 1e9;
      if (metrics && metrics.httpRequestsTotal && metrics.httpRequestDurationSeconds) {
        metrics.httpRequestsTotal.inc({ method: req.method, path: req.path, status: res.statusCode });
        metrics.httpRequestDurationSeconds.observe({ method: req.method, path: req.path, status: res.statusCode }, seconds);
      }
    });
    next();
  });
  
app.get('/api/health', (req, res) => {
    // Basic health + envelope/webhook readiness indicators
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.nodeEnv,
      version: '2.0.0',
      envelope_ready: true,
      webhook_ready: true,
      db_ready: true,
      ws_ready: true
    });
  });

  // Lightweight readiness endpoint
  app.get('/api/healthz', (req, res) => {
    res.json({ status: 'ok', envelope_ready: true, webhook_ready: true, db_ready: true, ws_ready: true });
  });
  
  app.get('/api/version', (req, res) => {
    res.json({
      api: '2.0.0',
      server: 'Express',
      websocket: 'enabled',
      database: 'sql.js'
    });
  });
  
  app.use('/api/sensors', sensorsRoutes);
  app.use('/api/devices', devicesRoutes);
  app.use('/api/rules', rulesRoutes);
  app.use('/api/schedules', schedulesRoutes);
  app.use('/api/history', historyRoutes);
  app.use('/api/alerts', alertsRoutes);
  app.use('/api/webhooks', webhooksRoutes);
  app.use('/api/stats', statsRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/webhook', webhookRoutes);
  app.use('/api/traceability', traceabilityRoutes);

  // Health endpoints for deployment health and readiness
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString(), version: require('./package.json').version });
  });

  app.get('/readiness', async (req, res) => {
    try {
      // Use DB helper to perform a lightweight check if DB is initialized
      if (typeof getOne === 'function') {
        // If DB not initialized, this will throw
        getOne('SELECT 1');
      }
      res.status(200).json({ status: 'ready' });
    } catch (err) {
      res.status(503).json({ status: 'not_ready', error: err?.message || String(err) });
    }
  });
  
  app.post('/api/export', (req, res) => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      version: '2.0.0',
      sensors: {},
      devices: [],
      rules: [],
      schedules: [],
      history: [],
      alerts: []
    };
    
    const sensors = getAll('SELECT * FROM sensors');
    sensors.forEach(s => {
      exportData.sensors[s.type] = {
        value: s.value,
        unit: s.unit,
        min: s.min_value,
        max: s.max_value,
        timestamp: s.timestamp
      };
    });
    
    exportData.devices = getAll('SELECT * FROM devices').map(d => ({
      ...d,
      config: JSON.parse(d.config || '{}')
    }));
    
    exportData.rules = getAll('SELECT * FROM rules').map(r => ({
      ...r,
      condition: JSON.parse(r.condition),
      action: JSON.parse(r.action)
    }));
    
    exportData.schedules = getAll('SELECT * FROM schedules').map(s => ({
      ...s,
      zones: JSON.parse(s.zones),
      days: JSON.parse(s.days)
    }));
    
    exportData.history = getAll('SELECT * FROM history ORDER BY timestamp DESC LIMIT 100');
    exportData.alerts = getAll('SELECT * FROM alerts ORDER BY timestamp DESC LIMIT 50');
    
    res.json(exportData);
  });
  
  app.post('/api/import', (req, res) => {
    const { sensors, devices, rules, schedules } = req.body;
    
    if (sensors) {
      Object.entries(sensors).forEach(([type, data]) => {
        runQuery(
          'UPDATE sensors SET value = ?, unit = ?, min_value = ?, max_value = ? WHERE type = ?',
          [data.value, data.unit, data.min, data.max, type]
        );
      });
    }
    
    if (rules && Array.isArray(rules)) {
      rules.forEach(rule => {
        runQuery(
          'UPDATE rules SET name = ?, description = ?, enabled = ?, condition = ?, action = ? WHERE id = ?',
          [
            rule.name,
            rule.description || '',
            rule.enabled ? 1 : 0,
            JSON.stringify(rule.condition),
            JSON.stringify(rule.action),
            rule.id
          ]
        );
      });
    }
    
    res.json({ success: true, message: 'Data imported successfully' });
  });
  
  app.use(notFoundHandler);
  app.use(errorHandler);
  
  return app;
}

async function startServer() {
  try {
    await initDatabase();
    
    const app = createApp();
    
    const server = http.createServer(app);
    
    initWebSocket(server);
    
    startSensorSimulation();
    
    server.listen(config.port, () => {
      logger.info(`
╔══════════════════════════════════════════════════════════════╗
║           EcoSynTech IoT Backend Server v2.0.0               ║
╠══════════════════════════════════════════════════════════════╣
║  Status:      Running                                        ║
║  Port:        ${String(config.port).padEnd(48)}║
║  Environment: ${config.nodeEnv.padEnd(48)}║
║  WebSocket:   Enabled (/ws)                                  ║
║  Database:    sql.js (SQLite in memory)                      ║
╠══════════════════════════════════════════════════════════════╣
║  API Endpoints:                                              ║
║    GET  /api/health            - Health check                ║
║    GET  /api/sensors           - Get all sensors             ║
║    GET  /api/devices           - Get all devices             ║
║    POST /api/devices/:id/cmd   - Send device command         ║
║    GET  /api/rules            - Get automation rules          ║
║    POST /api/rules            - Create rule                  ║
║    GET  /api/schedules        - Get schedules                ║
║    GET  /api/history           - Get activity history         ║
║    GET  /api/alerts            - Get alerts                  ║
║    GET  /api/stats             - Get system statistics        ║
║    POST /api/export            - Export all data              ║
║    POST /api/import            - Import data                  ║
║    POST /api/auth/register     - Register new user           ║
║    POST /api/auth/login        - Login                        ║
║                                                              ║
║  Webhooks:                                                    ║
║    POST /api/webhooks/sensor-alert                           ║
║    POST /api/webhooks/device-status                          ║
║    POST /api/webhooks/rule-triggered                        ║
║    POST /api/webhooks/schedule-run                          ║
╚══════════════════════════════════════════════════════════════╝
      `);
    });
    
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      server.close(() => {
        closeDatabase();
        logger.info('Server closed');
        process.exit(0);
      });
    });
    
    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully');
      server.close(() => {
        closeDatabase();
        logger.info('Server closed');
        process.exit(0);
      });
    });
    
    process.on('uncaughtException', (err) => {
      logger.error('Uncaught Exception:', err);
      process.exit(1);
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });
    
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
}

function startSensorSimulation() {
  const sensors = ['temperature', 'humidity', 'soil', 'light', 'water', 'co2', 'ec', 'ph'];
  
  setInterval(() => {
    try {
      sensors.forEach(sensor => {
        const current = getOne('SELECT * FROM sensors WHERE type = ?', [sensor]);
        if (!current) return;
        
        const variance = sensor === 'ph' ? 0.1 : (sensor === 'ec' ? 0.05 : 1);
        const delta = (Math.random() - 0.5) * variance;
        let newValue = current.value + delta;
        
        if (sensor === 'temperature') {
          newValue = Math.max(current.min_value, Math.min(current.max_value, newValue));
        } else if (sensor === 'soil' || sensor === 'water') {
          newValue = Math.max(0, Math.min(100, newValue));
        }
        
        const roundedValue = parseFloat(newValue.toFixed(sensor === 'ph' || sensor === 'ec' ? 2 : 1));
        
        runQuery(
          'UPDATE sensors SET value = ?, timestamp = datetime("now") WHERE type = ?',
          [roundedValue, sensor]
        );
        
        broadcast({
          type: 'sensor-update',
          data: { type: sensor, value: roundedValue, unit: current.unit },
          timestamp: new Date().toISOString()
        });
      });
      
      checkRules();
    } catch (err) {
      logger.error('Sensor simulation error:', err);
    }
  }, 5000);
}

function checkRules() {
  try {
    const rules = getAll('SELECT * FROM rules WHERE enabled = 1');
    const sensors = getAll('SELECT * FROM sensors');
    
    const sensorMap = {};
    sensors.forEach(s => { sensorMap[s.type] = s; });
    
    rules.forEach(rule => {
      const condition = JSON.parse(rule.condition);
      const sensor = sensorMap[condition.sensor];
      
      if (!sensor) return;
      
      let triggered = false;
      const value = sensor.value;
      const threshold = parseFloat(condition.value);
      
      switch (condition.operator) {
        case '<': triggered = value < threshold; break;
        case '>': triggered = value > threshold; break;
        case '<=': triggered = value <= threshold; break;
        case '>=': triggered = value >= threshold; break;
        case '==': triggered = value === threshold; break;
      }
      
      if (triggered) {
        const now = new Date();
        const lastTriggered = rule.last_triggered ? new Date(rule.last_triggered) : null;
        
        if (!lastTriggered || (now - lastTriggered) >= rule.cooldown_minutes * 60 * 1000) {
          runQuery(
            'UPDATE rules SET trigger_count = trigger_count + 1, last_triggered = datetime("now") WHERE id = ?',
            [rule.id]
          );
          
          const action = JSON.parse(rule.action);
          
          if (action.type === 'alert') {
            const alertId = `alert-${Date.now()}`;
            runQuery(
              'INSERT INTO alerts (id, type, severity, sensor, value, message, timestamp) VALUES (?, ?, ?, ?, ?, ?, datetime("now"))',
              [
                alertId,
                'rule',
                value < threshold ? 'warning' : 'danger',
                condition.sensor,
                value,
                `Rule "${rule.name}" triggered`
              ]
            );
            
            const alert = getOne('SELECT * FROM alerts WHERE id = ?', [alertId]);
            broadcast({ type: 'alert', action: 'created', data: alert });
          }
          
          const historyEntry = {
            id: `history-${Date.now()}`,
            action: `${action.type} (${action.target})`,
            trigger: `${condition.sensor} ${condition.operator} ${threshold}`,
            status: 'success',
            timestamp: new Date().toISOString()
          };
          
          runQuery(
            'INSERT INTO history (id, action, trigger, status, timestamp) VALUES (?, ?, ?, ?, ?)',
            [historyEntry.id, historyEntry.action, historyEntry.trigger, historyEntry.status, historyEntry.timestamp]
          );
          
          broadcast({ type: 'rule-triggered', data: { rule: rule.id, action: action.type } });
          broadcast({ type: 'history', action: 'added', data: historyEntry });
          
          logger.info(`Rule triggered: ${rule.name}`);
        }
      }
    });
  } catch (err) {
    logger.error('Rule check error:', err);
  }
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

module.exports = { createApp };
