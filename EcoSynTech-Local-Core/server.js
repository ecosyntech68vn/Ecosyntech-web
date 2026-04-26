/**
 * EcoSynTech Local Core V3.0
 * Related: EcoSynTech Cloud (GAS V10.0.1, FW V9.2.1)
 * 
 * Copyright © 2024-2025 EcoSynTech. All rights reserved.
 */

require('dotenv').config();
// Initialize OpenTelemetry observability if available (non-blocking)
require('./src/config/otel_setup');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const http = require('http');
const os = require('os');
const bonjour = require('bonjour');

const nodeEnv = process.env.NODE_ENV || 'development';
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET && nodeEnv === 'production') {
  console.error('FATAL: JWT_SECRET is required in production environment!');
  console.error('Please set JWT_SECRET environment variable before starting.');
  process.exit(1);
}

const config = require('./src/config');
const logger = require('./src/config/logger');
const envValidator = require('./src/config/envValidator');
const { initDatabase, closeDatabase, getAll, getOne, runQuery, saveDatabase, getDriverType } = require('./src/config/database');
const { errorHandler, notFoundHandler } = require('./src/middleware/errorHandler');
const { initWebSocket, broadcast } = require('./src/websocket');

const optimization = require('./src/optimization');

const sensorsRoutes = require('./src/routes/sensors');
const { rateLimitPerDevice } = require('./src/middleware/deviceRateLimit');
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
const adminRoutes = require('./src/routes/admin');
const firmwareRoutes = require('./src/routes/firmware');
const rbacRoutes = require('./src/routes/rbac');
const otaRoutes = require('./src/routes/ota');
const salesRoutes = require('./src/routes/sales');
const healthReportRoutes = require('./src/routes/health-report');
const farmsRoutes = require('./src/routes/farms');
const farmosCoreRoutes = require('./src/routes/farmos-core');
const dashboardRoutes = require('./src/routes/dashboard');
const dashboardApiRoutes = require('./routes/dashboard-api');
const workersRoutes = require('./src/routes/workers');
const supplyChainRoutes = require('./src/routes/supply-chain');
const aiModelLoader = require('./src/bootstrap/modelLoader');
const inventoryRoutes = require('./src/routes/inventory');
const financeRoutes = require('./src/routes/finance');
const systemInfoRoutes = require('./src/routes/system-info');
const aiRoutes = require('./src/routes/ai');
const bootstrapApi = require('./src/bootstrap/bootstrap_api');
const cropsRoutes = require('./src/routes/crops');
const journalRoutes = require('./src/routes/journal');
const backupRoutes = require('./src/routes/backup');
const healthReportService = require('./src/services/healthReportService');
const waterOptimizationService = require('./src/services/waterOptimizationService');
const { responseSignatureMiddleware } = require('./src/middleware/response-sign');
const { getAuditHashMiddleware } = require('./src/middleware/audit-tamper-proof');
const { requestDeduplication } = require('./src/middleware/requestDeduplication');
const { responseOptimizer } = require('./src/middleware/responseOptimizer');
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

  app.get('/dashboard/main', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard-main.html'));
  });

  app.get('/dashboard/devices', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard-devices.html'));
  });

  app.get('/dashboard/monitoring', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard-monitoring.html'));
  });

  app.get('/dashboard/alerts', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard-alerts.html'));
  });

  app.get('/dashboard/automation', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard-automation.html'));
  });

  app.get('/dashboard/maintenance', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard-maintenance.html'));
  });

  app.get('/dashboard/traceability', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard-traceability.html'));
  });

  app.get('/dashboard/energy', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard-energy.html'));
  });

  app.get('/dashboard/multifarm', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard-multifarm.html'));
  });

  app.get('/dashboard/reports', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard-reports.html'));
  });

  app.get('/dashboard/sales', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard-sales.html'));
  });

  app.get('/dashboard/inventory', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard-inventory.html'));
  });

  app.get('/dashboard/marketing', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard-marketing.html'));
  });

  app.get('/dashboard/hr', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard-hr.html'));
  });

  app.get('/dashboard/ai', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard-ai.html'));
  });

  app.get('/dashboard/system', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard-system.html'));
  });

  // Bootstrap UI (admin)
  app.get('/bootstrap', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'bootstrap.html'));
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

  app.use(express.json({ limit: '10mb',strict: false }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use((req, res, next) => {
    if (req.body && typeof req.body === 'object') {
      for (const key of Object.keys(req.body)) {
        if (typeof req.body[key] === 'string') {
          req.body[key] = req.body[key]
            .replace(/<script/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+=/gi, '');
        }
      }
    }
    next();
  });
  
  const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' }
  });
  app.use('/api/', limiter);
  app.use('/api/', requestDeduplication);
  app.use(responseOptimizer);
  
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
  
  const { telemetryAccess } = require('./src/middleware/telemetry_rbac');
  app.get('/api/health', telemetryAccess, (req, res) => {
    const memUsage = process.memoryUsage();
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
    const isHealthy = heapUsedMB < 512;
    
    const healthStatus = {
      status: isHealthy ? 'healthy' : 'degraded',
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
      environment: config.nodeEnv,
      checks: {
        memory: {
          status: isHealthy ? 'ok' : 'warning',
          used: heapUsedMB.toFixed(2) + 'MB'
        },
        websocket: 'enabled'
      }
    };
    
    res.status(isHealthy ? 200 : 503).json(healthStatus);
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

  app.use('/api/sensors', rateLimitPerDevice, sensorsRoutes);
  app.use('/api/devices', devicesRoutes);
  app.use('/api/rules', rulesRoutes);
  app.use('/api/schedules', schedulesRoutes);
  app.use('/api/history', telemetryAccess, historyRoutes);
  app.use('/api/alerts', telemetryAccess, alertsRoutes);
  app.use('/api/webhooks', telemetryAccess, webhooksRoutes);
  app.use('/api/stats', telemetryAccess, statsRoutes);
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
  // Admin RBAC endpoint
  app.use('/api/admin', adminRoutes);
  app.use('/api/rbac', rbacRoutes);
  app.use('/api/ota', otaRoutes);
  app.use('/api/sales', salesRoutes);
  app.use('/api/health-report', healthReportRoutes);
  app.use('/api/farms', farmsRoutes);
  app.use('/api', farmosCoreRoutes); // /organizations, /plans, /assets, /logs, /quantities
app.use('/api/dashboard', dashboardRoutes);
// Mount additional mock API routes for dashboard data
app.use('/api/dashboard', dashboardApiRoutes);
  app.use('/api/workers', workersRoutes);
  app.use('/api/supply-chain', supplyChainRoutes);
  // Initialize lightweight/optional AI models lazily on startup to keep boot fast
  // In test environment, skip heavy AI bootstrap to keep tests fast and deterministic
  if (process.env.NODE_ENV !== 'test') {
    aiModelLoader.initialize().then(() => {
      // models initialized
    }).catch((err) => {
      console.error('[BOOTSTRAP] AI model bootstrap error on startup:', err?.message || err);
    });
  } else {
    // Warm-up skip: ensure a microtask yield for test readiness
    Promise.resolve().then(() => {
      // No-op in test to avoid long boot times
    });
  }
  app.use('/api/inventory', inventoryRoutes);
  app.use('/api/finance', financeRoutes);
  app.use('/api/system', systemInfoRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/crops', cropsRoutes);
  app.use('/api/journal', journalRoutes);
  // Bootstrap management API (admin only)
  app.use('/api/bootstrap', bootstrapApi);
  app.use('/api/backup', backupRoutes);

  // Swagger API Documentation
  const apiDoc = require('./src/services/apiDoc');
  apiDoc.setupSwagger(app);

  // Health endpoints for deployment health and readiness
  app.get('/health', telemetryAccess, (req, res) => {
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

  app.get('/readiness', telemetryAccess, async (req, res) => {
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
  
  const exportMiddleware = (process.env.NODE_ENV === 'test') ? ((req, res, next) => next()) : telemetryAccess;
  app.post('/api/export', exportMiddleware, (req, res) => {
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
    envValidator.checkRequiredStartup();
    
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

    const autoBackupScheduler = require('./src/services/autoBackupScheduler');
    autoBackupScheduler.startScheduler();

    startSensorSimulation();
    
    healthReportService.start();
    waterOptimizationService.start();
    
    server.listen(config.port, () => {
      // mDNS advertisement for device discovery
      try {
        const mdns = bonjour();
        mdns.publish({
          name: 'ecosyntech-farmos',
          type: '_ecosyntech._tcp',
          port: config.port,
          txt: { version: pkg.version, nodeEnv: config.nodeEnv }
        });
        logger.info('[mDNS] Advertising _ecosyntech._tcp:' + config.port);
      } catch (e) {
        logger.warn('[mDNS] Not available:', e.message);
      }
      
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
    ║  POST /api/webhooks/sensor-alert                           ║
    ║  POST /api/webhooks/device-status                          ║
    ║  POST /api/webhooks/rule-triggered                        ║
    ║  POST /api/webhooks/schedule-run                          ║
    ╠══════════════════════════════════════════════════════════════╣
    ║  API Docs: /api-docs (Swagger UI)                        ║
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
    
    process.on('uncaughtException', async (err) => {
      logger.error('Uncaught Exception:', err);
      const alertService = require('./src/services/telegramAlertService');
      await alertService.notifyError(err, { type: 'uncaughtException' });
      process.exit(1);
    });
    
    process.on('unhandledRejection', async (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      const alertService = require('./src/services/telegramAlertService');
      await alertService.notifyError(new Error(String(reason)), { type: 'unhandledRejection' });
    });
    
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
}

let sensorCache = null;
let lastSensorUpdate = 0;
const SENSOR_CACHE_TTL = 2000;

function startSensorSimulation() {
  const sensors = ['temperature', 'humidity', 'soil', 'light', 'water', 'co2', 'ec', 'ph'];
  
  setInterval(() => {
    try {
      const now = Date.now();
      if (!sensorCache || now - lastSensorUpdate > SENSOR_CACHE_TTL) {
        sensorCache = getAll('SELECT * FROM sensors');
        lastSensorUpdate = now;
      }
      
      const updates = [];
      const broadcasts = [];
      
      sensorCache.forEach(current => {
        if (!sensors.includes(current.type)) return;
        
        const variance = current.type === 'ph' ? 0.1 : (current.type === 'ec' ? 0.05 : 1);
        const delta = (Math.random() - 0.5) * variance;
        let newValue = current.value + delta;
        
        if (current.type === 'temperature') {
          newValue = Math.max(current.min_value, Math.min(current.max_value, newValue));
        } else if (current.type === 'soil' || current.type === 'water') {
          newValue = Math.max(0, Math.min(100, newValue));
        }
        
        const roundedValue = parseFloat(newValue.toFixed(current.type === 'ph' || current.type === 'ec' ? 2 : 1));
        
        if (Math.abs(roundedValue - current.value) > 0.01) {
          updates.push({ type: current.type, value: roundedValue });
          broadcasts.push({
            type: 'sensor-update',
            data: { type: current.type, value: roundedValue, unit: current.unit },
            timestamp: new Date().toISOString()
          });
        }
      });
      
      if (updates.length > 0) {
        updates.forEach(u => {
          runQuery(
            'UPDATE sensors SET value = ?, timestamp = datetime("now") WHERE type = ?',
            [u.value, u.type]
          );
        });
        
        broadcasts.forEach(b => broadcast(b));
      }
      
      checkRules();
    } catch (err) {
      logger.error('Sensor simulation error:', err);
    }
  }, 5000);
}

let rulesCache = null;
let rulesCacheTime = 0;
const RULES_CACHE_TTL = 30000;

function checkRules() {
  try {
    const now = Date.now();
    if (!rulesCache || now - rulesCacheTime > RULES_CACHE_TTL) {
      const rawRules = getAll('SELECT * FROM rules WHERE enabled = 1');
      rulesCache = rawRules.map(r => ({
        ...r,
        _condition: JSON.parse(r.condition),
        _action: JSON.parse(r.action)
      }));
      rulesCacheTime = now;
    }
    
    const sensors = getAll('SELECT * FROM sensors');
    const sensorMap = {};
    sensors.forEach(s => { sensorMap[s.type] = s; });
    
    rulesCache.forEach(rule => {
      const condition = rule._condition;
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
        const triggerTime = rule.last_triggered ? new Date(rule.last_triggered).getTime() : 0;
        
        if (!rule.last_triggered || (now - triggerTime) >= rule.cooldown_minutes * 60 * 1000) {
          runQuery(
            'UPDATE rules SET trigger_count = trigger_count + 1, last_triggered = datetime("now") WHERE id = ?',
            [rule.id]
          );
          
          const action = rule._action;
          
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
