/**
 * ============================================================================
 * src/server/routes.js - Route Registry
 * 
 * Design: Modular route registration per domain
 * Standards: ISO 27001, 5S Organization
 * 
 * MỤC ĐÍCH:
 *   - Tập trung tất cả route registrations
 *   - Dễ dàng thêm/sửa/xóa routes
 *   - Theo dõi all API endpoints trong 1 file
 * ============================================================================
 */

'use strict';

const path = require('path');
const docsRoutes = require('../routes/docs');

function registerRoutes(app) {
  // ============================================================
  // CORE ROUTES - Essential for operation
  // ============================================================
  
  // Health check (no auth required)
  app.get('/api/health', (req, res) => {
    res.json({
      ok: true,
      version: process.env.npm_package_version || 'dev',
      uptime_sec: Math.round(process.uptime()),
      timestamp: new Date().toISOString()
    });
  });

  // Public docs
  app.use('/api/docs', docsRoutes);

  // ============================================================
  // AUTHENTICATION - A.9 Access Control
  // ============================================================
  app.use('/api/auth', require('../routes/auth'));

  // ============================================================
  // IoT DEVICE MANAGEMENT - A.8 Technology Controls
  // ============================================================
  app.use('/api/sensors', require('../routes/sensors'));
  app.use('/api/devices', require('../routes/devices'));
  app.use('/api/device', require('../routes/deviceAction'));
  app.use('/api/firmware', require('../routes/firmware'));
  app.use('/api/ota', require('../routes/ota'));

  // ============================================================
  // DATA & ANALYTICS - A.12 Operations Security
  // ============================================================
  app.use('/api/history', require('../routes/history'));
  app.use('/api/stats', require('../routes/stats'));
  app.use('/api/analytics', require('../routes/analytics'));
  app.use('/api/dashboard', require('../routes/dashboard'));

  // ============================================================
  // ALERTS & MONITORING - A.16 Incident Management
  // ============================================================
  app.use('/api/alerts', require('../routes/alerts'));
  app.use('/api/incidents', require('../routes/incidents'));
  app.use('/api/issues', require('../routes/issues'));

  // ============================================================
  // AUTOMATION - A.8.3 Information Access Restriction
  // ============================================================
  app.use('/api/rules', require('../routes/rules'));
  app.use('/api/schedules', require('../routes/schedules'));

  // ============================================================
  // SUPPLY CHAIN & TRACEABILITY - A.8.24 Use of Cryptography
  // ============================================================
  app.use('/api/traceability', require('../routes/traceability'));
  app.use('/api/supply-chain', require('../routes/supply-chain'));

  // ============================================================
  // ADMINISTRATION - A.9.4 System Access
  // ============================================================
  app.use('/api/admin', require('../routes/admin'));
  app.use('/api/rbac', require('../routes/rbac'));
  app.use('/api/farms', require('../routes/farms'));
  app.use('/api/workers', require('../routes/workers'));

  // ============================================================
  // AGRICULTURE SPECIFIC
  // ============================================================
  app.use('/api/agriculture', require('../routes/agriculture'));
  app.use('/api/crops', require('../routes/crops'));
  app.use('/api/journal', require('../routes/journal'));

  // ============================================================
  // INVENTORY & FINANCE
  // ============================================================
  app.use('/api/inventory', require('../routes/inventory'));
  app.use('/api/finance', require('../routes/finance'));

  // ============================================================
  // BACKUP & RECOVERY - A.12.3 Backup
  // ============================================================
  app.use('/api/backup', require('../routes/backup'));

  // ============================================================
  // AI & ML - A.12.4 Logging
  // ============================================================
  app.use('/api/ai', require('../routes/ai'));

  // ============================================================
  // SYSTEM
  // ============================================================
  app.use('/api/system-info', require('../routes/system-info'));

  // ============================================================
  // LEGACY / COMPATIBILITY
  // ============================================================
  app.use('/api/webhook', require('../routes/webhook'));
  app.use('/api/webhooks', require('../routes/webhooks'));
  app.use('/api/health-report', require('../routes/health-report'));
  app.use('/api/devicemgmt', require('../routes/devicemgmt'));
  app.use('/api/security', require('../routes/security'));
  app.use('/api/security-status', require('../routes/security-status'));
  app.use('/api/sales', require('../routes/sales'));
  app.use('/api/payment', require('../routes/payment'));
  app.use('/api/checkout', require('../routes/checkout'));
  app.use('/api/compliance', require('../routes/compliance'));
  app.use('/api/farmos-core', require('../routes/farmos-core'));

  // Bootstrap APIs (nếu có)
  try {
    const bootstrapApi = require('../bootstrap/bootstrap_api');
    app.use('/api/bootstrap', bootstrapApi);
  } catch (e) {
    // Optional
  }

  // Model loader (nếu có)
  try {
    const modelLoader = require('../bootstrap/modelLoader');
    app.use('/api/models', modelLoader);
  } catch (e) {
    // Optional
  }

  // ============================================================
  // STATIC FILES - Dashboard & UI
  // ============================================================
  app.use(express.static(path.join(__dirname, '../../public')));
  
  // SPA fallback
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(__dirname, '../../public/index.html'));
    }
  });
}

module.exports = registerRoutes;