require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const http = require('http');
const os = require('os');

const nodeEnv = process.env.NODE_ENV || 'development';
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET && nodeEnv === 'production') {
  console.error('FATAL: JWT_SECRET is required in production environment!');
  console.error('Please set JWT_SECRET environment variable before starting.');
  process.exit(1);
}

const config = require('./src/config');
const logger = require('./src/config/logger');
const { initDatabase, closeDatabase, getAll, getOne, runQuery, saveDatabase, getDriverType } = require('./src/config/database-adapters');
const { errorHandler, notFoundHandler } = require('./src/middleware/errorHandler');
const { initWebSocket, broadcast } = require('./src/websocket');

const optimization = require('./src/optimization');

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
const analyticsRoutes = require('./src/routes/analytics');
const devicemgmtRoutes = require('./src/routes/devicemgmt');
const agricultureRoutes = require('./src/routes/agriculture');
const securityRoutes = require('./src/routes/security');
const securityStatusRoutes = require('./src/routes/security-status');
const incidentsRoutes = require('./src/routes/incidents');
const issuesRoutes = require('./src/routes/issues');
const telegramService = require('./src/services/telegramService');
const docsRoutes = require('./src/routes/docs');
const firmwareRoutes = require('./src/routes/firmware');
const rbacRoutes = require('./src/routes/rbac');
const otaRoutes = require('./src/routes/ota');
const salesRoutes = require('./src/routes/sales');
const healthReportRoutes = require('./src/routes/health-report');
const farmsRoutes = require('./src/routes/farms');
const farmosCoreRoutes = require('./src/routes/farmos-core');
const dashboardRoutes = require('./src/routes/dashboard');
const workersRoutes = require('./src/routes/workers');
const supplyChainRoutes = require('./src/routes/supply-chain');
const inventoryRoutes = require('./src/routes/inventory');
const financeRoutes = require('./src/routes/finance');
const systemInfoRoutes = require('./src/routes/system-info');
const aiRoutes = require('./src/routes/ai');
const cropsRoutes = require('./src/routes/crops');
const backupRoutes = require('./src/routes/backup');
const healthReportService = require('./src/services/healthReportService');
const waterOptimizationService = require('./src/services/waterOptimizationService');
const { responseSignatureMiddleware } = require('./src/middleware/response-sign');
const { getAuditHashMiddleware } = require('./src/middleware/audit-tamper-proof');
const path = require('path');

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

  // Static files
  app.use(express.static(path.join(__dirname, 'public')));
  app.use(express.static(path.join(__dirname, '.')));

  // Dashboard pages
  app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
  });

  // Landing page (sales)
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
  });

  // Launcher/quickstart page
  app.get('/start', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'launcher.html'));
  });

  // Products page
  app.get('/products', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'products.html'));
  });

  // Mobile app
  app.get('/mobile', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'mobile.html'));
  });

  // Policies page
  app.get('/policies', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'policies.html'));
  });

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
  
  app.use((req, res, next) => {
    req.startTime = Date.now();
    res.setHeader('X-Response-Time', '0');
    logger.info(`${req.method} ${req.path}`, {
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
    next();
  });

  app.use((req, res, next) => {
    const originalSend = res.send.bind(res);
    res.send = function(body) {
      const duration = Date.now() - (req.startTime || Date.now());
      res.setHeader('X-Response-Time', String(duration));
      return originalSend(body);
    };
    next();
  });

  app.use(responseSignatureMiddleware);
  app.use(getAuditHashMiddleware);
  
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      system: 'EcoSynTech Farm OS',
      version: pkg.version,
      company: {
        name: 'CÔNG TY TNHH CÔNG NGHỆ ECOSYNTECH GLOBAL',
        founder: 'Tạ Quang Thuận',
        phone: '0989516698',
        email: 'kd.ecosyntech@gmail.com'
      },
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.nodeEnv
    });
  });

  app.get('/api/version', (req, res) => {
    res.json({
      api: pkg.version,
      server: 'Express',
      websocket: 'enabled',
      database: 'sql.js'
    });
  });

  const i18n = require('./src/i18n');

  app.get('/api/i18n/languages', (req, res) => {
    res.json(i18n.getSupportedLanguages());
  });

  app.get('/api/i18n/current', (req, res) => {
    res.json({
      language: i18n.getLanguage(),
      default: i18n.DEFAULT_LANGUAGE
    });
  });

  app.post('/api/i18n/set', (req, res) => {
    const { language } = req.body;
    const success = i18n.setLanguage(language);
    res.json({
      ok: success,
      language: i18n.getLanguage(),
      available: i18n.getSupportedLanguages()
    });
  });

  app.get('/api/translations/:lang', (req, res) => {
    const { lang } = req.params;
    const translations = i18n.loadTranslations(lang, './src/i18n') ? i18n.translationCache[lang] : {};
    res.json(translations);
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
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/device-mgmt', devicemgmtRoutes);
  app.use('/api/agriculture', agricultureRoutes);
  app.use('/api/security', securityRoutes);
  app.use('/api/security-status', securityStatusRoutes);
  app.use('/api/incidents', incidentsRoutes);
  app.use('/api/issues', issuesRoutes);
  app.use('/api/docs', docsRoutes);
  app.use('/api/firmware', firmwareRoutes);
  app.use('/api/rbac', rbacRoutes);
  app.use('/api/ota', otaRoutes);
  app.use('/api/sales', salesRoutes);
  app.use('/api/health-report', healthReportRoutes);
  app.use('/api/farms', farmsRoutes);
  app.use('/api', farmosCoreRoutes); // /organizations, /plans, /assets, /logs, /quantities
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/workers', workersRoutes);
  app.use('/api/supply-chain', supplyChainRoutes);
  app.use('/api/inventory', inventoryRoutes);
  app.use('/api/finance', financeRoutes);
  app.use('/api/system', systemInfoRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/crops', cropsRoutes);
  app.use('/api/backup', backupRoutes);

  // Health endpoints for deployment health and readiness
  app.get('/health', (req, res) => {
    var sysInfo = optimization.getSystemInfo();
    var memStatus = optimization.getMemoryStatus();
    var level = optimization.getOptimizationLevel();
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: require('./package.json').version,
      optimization: level,
      memory: memStatus,
      system: sysInfo
    });
  });

  app.get('/api/optimization/status', (req, res) => {
    var result = optimization.optimizeForDevice();
    res.json(result);
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

const pkg = require('./package.json');
const { createOps } = require('./src/ops');

async function startServer() {
  try {
    await initDatabase();
    
    const app = createApp();
    
    const server = http.createServer(app);
    
    initWebSocket(server);
    
    ops = createOps(logger, `http://127.0.0.1:${config.port}`, pkg.version, config);
    app.set('ops', ops);

    ops.incidentBus.on('alert', async (alert) => {
      await ops.handleAlert(alert);
    });

    const deviceMemory = os.totalmem() / 1024 / 1024 / 1024;
    var schedulerInterval = 600000;
    if (deviceMemory < 1.5) {
      schedulerInterval = 1800000;
    } else if (deviceMemory < 1) {
      schedulerInterval = 3600000;
    }

    const schedulerConfig = {
      defaultInterval: schedulerInterval,
      minInterval: 360000,
    };

    if (!config.opsSchedulerDisabled) {
      ops.startScheduler(schedulerConfig);
    }

    if (config.opsHotReloadEnabled) {
      ops.enableHotReload();
    }

    if (logger && logger.info) {
      logger.info('[Ops] Scheduler started with ' + (schedulerInterval/60000).toFixed(0) + 'min interval');
      if (config.opsHotReloadEnabled) {
        logger.info('[Ops] Hot reload enabled');
      }
    }

    startSensorSimulation();
    
    healthReportService.start();
    waterOptimizationService.start();
    
    server.listen(config.port, () => {
      logger.info(`
╔══════════════════════════════════════════════════════════════╗
║           EcoSynTech IoT Backend Server v${pkg.version}               ║
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
