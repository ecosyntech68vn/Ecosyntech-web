const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const config = require('./index');
const logger = require('./logger');

let db = null;
let SQL = null;

function backupCurrentDatabase() {
  try {
    if (!db) return null;
    const src = config.database.path;
    const dir = path.dirname(src);
    const base = path.basename(src);
    const backupDir = path.resolve(dir, 'backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.resolve(backupDir, `${base}.backup.${ts}.sqlite`);
    // Copy the file (db.export() would require a separate in-memory approach)
    try {
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, backupPath);
        logger.info(`[Migration] DB backup created at ${backupPath}`);
      }
    } catch (err) {
      logger.warn('[Migration] DB backup skipped (copy failed):', err?.message);
    }
    return backupPath;
  } catch (err) {
    logger.error('[Migration] backupCurrentDatabase error:', err);
    return null;
  }
}

async function initDatabase() {
  const dbDir = path.dirname(config.database.path);
  
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  SQL = await initSqlJs();

  if (fs.existsSync(config.database.path)) {
    const fileBuffer = fs.readFileSync(config.database.path);
    db = new SQL.Database(fileBuffer);
    logger.info('Loaded existing database');
  } else {
    db = new SQL.Database();
    logger.info('Created new database');
  }

  createTables();
  seedInitialData();
  applyMigrations();
  saveDatabase();
  
  logger.info('Database initialized successfully');
  return db;
}

// Phase 9 migration: sensor schema alignment
function applyMigrations() {
  try {
    // Phase 9: before applying, create a safe backup in same directory as DB
    if (typeof backupCurrentDatabase === 'function') {
      try { backupCurrentDatabase(); } catch (e) { logger.info('[Migration] backup failed (optional) ' + e?.message); }
    }
    db.run(`CREATE TABLE IF NOT EXISTS migrations (
      name TEXT PRIMARY KEY,
      applied_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);
    const applied = getOne('SELECT 1 FROM migrations WHERE name = ?', ['phase9_sensor_schema']);
    if (applied) {
      logger.info('[Migration] phase9_sensor_schema already applied');
      return;
    }
    try { db.run('ALTER TABLE sensors ADD COLUMN sensor_id TEXT'); } catch (e) { /* ignore if exists */ }
    try {
      const rows = getAll('SELECT id FROM sensors');
      rows.forEach(row => {
        const idVal = String(row.id);
        const dash = idVal.lastIndexOf('-');
        if (dash > 0) {
          const deviceId = idVal.substring(0, dash);
          try { db.run('UPDATE sensors SET sensor_id = ? WHERE id = ?', [deviceId, idVal]); } catch (err) { /* ignore per-row errors */ }
        }
      });
    } catch (err) { /* ignore */ }
    db.run('INSERT INTO migrations (name) VALUES (\'phase9_sensor_schema\')');
    logger.info('[Migration] phase9_sensor_schema applied');
  } catch (err) {
    logger.error('[Migration] phase9_sensor_schema failure:', err);
  }
}

let saveTimer = null;
const SAVE_DEBOUNCE_MS = 1000;

function saveDatabase() {
  if (!db) return;
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      const data = db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(config.database.path, buffer);
      logger.debug('Database saved to disk');
    } catch (err) {
      logger.error('Failed to save database:', err);
    }
  }, SAVE_DEBOUNCE_MS);
}

function flushDatabase() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  if (!db) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(config.database.path, buffer);
  } catch (err) {
    logger.error('Failed to flush database:', err);
  }
}

function createTables() {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      zone TEXT,
      status TEXT DEFAULT 'offline',
      config TEXT DEFAULT '{}',
      last_seen TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS sensors (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      value REAL NOT NULL,
      unit TEXT NOT NULL,
      min_value REAL,
      max_value REAL,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS rules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      enabled INTEGER DEFAULT 1,
      condition TEXT NOT NULL,
      action TEXT NOT NULL,
      cooldown_minutes INTEGER DEFAULT 30,
      trigger_count INTEGER DEFAULT 0,
      last_triggered TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS schedules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      time TEXT NOT NULL,
      duration INTEGER DEFAULT 60,
      zones TEXT DEFAULT '[]',
      enabled INTEGER DEFAULT 1,
      days TEXT DEFAULT '[]',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS history (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      trigger TEXT,
      status TEXT DEFAULT 'success',
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      severity TEXT DEFAULT 'info',
      sensor TEXT,
      value REAL,
      message TEXT,
      acknowledged INTEGER DEFAULT 0,
      acknowledged_at TEXT,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      device_id TEXT,
      user_id TEXT,
      name TEXT,
      permissions TEXT DEFAULT '[]',
      expires_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (device_id) REFERENCES devices(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS commands (
      id TEXT PRIMARY KEY,
      device_id TEXT,
      command TEXT NOT NULL,
      params TEXT DEFAULT '{}',
      status TEXT DEFAULT 'pending',
      result TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      delivered_at TEXT,
      completed_at TEXT,
      FOREIGN KEY (device_id) REFERENCES devices(id)
    )
  `);

  db.run('CREATE INDEX IF NOT EXISTS idx_commands_device_status ON commands(device_id, status)');
  db.run('CREATE INDEX IF NOT EXISTS idx_commands_status ON commands(status)');
  db.run('CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status)');
  db.run('CREATE INDEX IF NOT EXISTS idx_sensors_type ON sensors(type)');
  db.run('CREATE INDEX IF NOT EXISTS idx_rules_enabled ON rules(enabled)');
  db.run('CREATE INDEX IF NOT EXISTS idx_alerts_acknowledged ON alerts(acknowledged)');
  db.run('CREATE INDEX IF NOT EXISTS idx_history_timestamp ON history(timestamp)');
  db.run('CREATE INDEX IF NOT EXISTS idx_api_keys_expires ON api_keys(expires_at)');

  db.run(`
    CREATE TABLE IF NOT EXISTS traceability_batches (
      id TEXT PRIMARY KEY,
      batch_code TEXT UNIQUE NOT NULL,
      product_name TEXT NOT NULL,
      product_type TEXT,
      quantity REAL,
      unit TEXT,
      farm_name TEXT,
      zone TEXT,
      seed_variety TEXT,
      planting_date TEXT,
      expected_harvest TEXT,
      harvest_date TEXT,
      harvest_quantity REAL,
      harvest_notes TEXT,
      status TEXT DEFAULT 'active',
      metadata TEXT DEFAULT '{}',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS traceability_stages (
      id TEXT PRIMARY KEY,
      batch_id TEXT NOT NULL,
      stage_name TEXT NOT NULL,
      stage_type TEXT NOT NULL,
      stage_order INTEGER DEFAULT 0,
      description TEXT,
      performed_by TEXT,
      location TEXT,
      inputs_used TEXT DEFAULT '[]',
      photos TEXT DEFAULT '[]',
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (batch_id) REFERENCES traceability_batches(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS traceability_readings (
      id TEXT PRIMARY KEY,
      batch_id TEXT,
      device_id TEXT,
      sensor_type TEXT,
      value REAL,
      unit TEXT,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (batch_id) REFERENCES traceability_batches(id),
      FOREIGN KEY (device_id) REFERENCES devices(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS rule_history (
      id TEXT PRIMARY KEY,
      rule_id TEXT NOT NULL,
      sensor_value REAL,
      triggered INTEGER DEFAULT 0,
      action_taken TEXT,
      executed_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (rule_id) REFERENCES rules(id)
    )
  `);

  logger.info('Database tables created');
}

function seedInitialData() {
  const deviceCount = db.exec('SELECT COUNT(*) as count FROM devices')[0]?.values[0][0] || 0;
  
  if (deviceCount === 0) {
    const devices = [
      ['device-001', 'SoilSense-001', 'sensor', 'zone1', 'online', JSON.stringify({ thresholdLow: 30, thresholdCritical: 20 }), new Date().toISOString()],
      ['device-002', 'AirPulse-002', 'sensor', 'zone2', 'online', JSON.stringify({ thresholdLow: 60, thresholdCritical: 90 }), new Date().toISOString()],
      ['device-003', 'Pump-Control-01', 'pump', 'all', 'online', JSON.stringify({ autoMode: true }), new Date().toISOString()],
      ['device-004', 'Valve-Zone-03', 'valve', 'zone3', 'online', JSON.stringify({ flowRate: 50 }), new Date().toISOString()],
      ['device-005', 'AirSense-002', 'sensor', 'zone2', 'offline', '{}', new Date(Date.now() - 3600000).toISOString()],
      ['device-006', 'GrowLight-01', 'light', 'zone1', 'online', JSON.stringify({ brightness: 80 }), new Date().toISOString()]
    ];

    const stmt = db.prepare('INSERT INTO devices (id, name, type, zone, status, config, last_seen) VALUES (?, ?, ?, ?, ?, ?, ?)');
    devices.forEach(device => {
      stmt.run(device);
    });
    stmt.free();
  }

  const sensorCount = db.exec('SELECT COUNT(*) as count FROM sensors')[0]?.values[0][0] || 0;
  
  if (sensorCount === 0) {
    const sensors = [
      ['sensor-temp', 'temperature', 28.5, '°C', 18, 32],
      ['sensor-humid', 'humidity', 72, '%', 60, 85],
      ['sensor-soil', 'soil', 45, '%', 30, 70],
      ['sensor-light', 'light', 42.5, 'klux', 20, 60],
      ['sensor-ph', 'ph', 6.8, 'pH', 6.0, 7.5],
      ['sensor-co2', 'co2', 418, 'ppm', 350, 800],
      ['sensor-ec', 'ec', 2.1, 'mS/cm', 1.5, 3.0],
      ['sensor-water', 'water', 78, '%', 20, 100]
    ];

    const stmt = db.prepare('INSERT INTO sensors (id, type, value, unit, min_value, max_value) VALUES (?, ?, ?, ?, ?, ?)');
    sensors.forEach(sensor => {
      stmt.run(sensor);
    });
    stmt.free();
  }

  const ruleCount = db.exec('SELECT COUNT(*) as count FROM rules')[0]?.values[0][0] || 0;
  
  if (ruleCount === 0) {
    const rules = [
      ['rule-1', 'Tưới khi đất khô', 'Tự động tưới khi độ ẩm đất xuống dưới 35%', 1, JSON.stringify({ sensor: 'soil', operator: '<', value: 35 }), JSON.stringify({ type: 'valve_open', target: 'zone1' })],
      ['rule-2', 'Bật quạt khi nóng', 'Kích hoạt quạt thông gió khi nhiệt độ trên 30°C', 1, JSON.stringify({ sensor: 'temperature', operator: '>', value: 30 }), JSON.stringify({ type: 'fan_on', target: 'all' })],
      ['rule-3', 'Cảnh báo nước thấp', 'Thông báo khi mực nước bồn dưới 25%', 1, JSON.stringify({ sensor: 'water', operator: '<', value: 25 }), JSON.stringify({ type: 'alert', target: 'all' })]
    ];

    const stmt = db.prepare('INSERT INTO rules (id, name, description, enabled, condition, action) VALUES (?, ?, ?, ?, ?, ?)');
    rules.forEach(rule => {
      stmt.run(rule);
    });
    stmt.free();
  }

  const scheduleCount = db.exec('SELECT COUNT(*) as count FROM schedules')[0]?.values[0][0] || 0;
  
  if (scheduleCount === 0) {
    const schedules = [
      ['sched-1', 'Lịch tưới sáng', '06:00', 60, JSON.stringify(['zone1', 'zone2', 'zone3']), 1, JSON.stringify(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])],
      ['sched-2', 'Lịch tưới chiều', '17:00', 60, JSON.stringify(['zone4', 'zone5']), 1, JSON.stringify(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])],
      ['sched-3', 'Bón phân định kỳ', '08:00', 45, JSON.stringify(['all']), 0, JSON.stringify(['Tue', 'Fri'])]
    ];

    const stmt = db.prepare('INSERT INTO schedules (id, name, time, duration, zones, enabled, days) VALUES (?, ?, ?, ?, ?, ?, ?)');
    schedules.forEach(schedule => {
      stmt.run(schedule);
    });
    stmt.free();
  }

  // Seed a test user when running in test environment to enable auth tests without manual registration
  try {
    if (process.env.NODE_ENV === 'test') {
      const existingTestUser = getOne('SELECT id FROM users WHERE email = ?', ['test@example.com']);
      if (!existingTestUser) {
        const testId = 'user-test';
        const testEmail = 'test@example.com';
        const testPassword = 'password123';
        const hashedPassword = bcrypt.hashSync(testPassword, 10);
        runQuery(
          'INSERT INTO users (id, email, password, name, role, created_at) VALUES (?, ?, ?, ?, ?, datetime("now"))',
          [testId, testEmail, hashedPassword, 'Test User', 'user']
        );
      }
    }
  } catch (e) {
    // Ignore seed errors in test mode to avoid blocking DB init
  }

  saveDatabase();
}

function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

function runQuery(sql, params = []) {
  if (!db) throw new Error('Database not initialized');
  try {
    db.run(sql, params);
    saveDatabase();
    return { changes: db.getRowsModified() };
  } catch (err) {
    logger.error('Query error:', err);
    throw err;
  }
}

function getOne(sql, params = []) {
  if (!db) throw new Error('Database not initialized');
  try {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return row;
    }
    stmt.free();
    return null;
  } catch (err) {
    logger.error('Query error:', err);
    throw err;
  }
}

function getAll(sql, params = []) {
  if (!db) throw new Error('Database not initialized');
  try {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  } catch (err) {
    logger.error('Query error:', err);
    throw err;
  }
}

function closeDatabase() {
  if (db) {
    flushDatabase();
    db.close();
    db = null;
    logger.info('Database connection closed');
  }
}

function exportDatabase(filePath) {
  if (!db) throw new Error('Database not initialized');
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(filePath, buffer);
  logger.info(`Database exported to ${filePath}`);
}

function importFromFile(filePath) {
  if (!fs.existsSync(filePath)) throw new Error('Backup file not found');
  const buffer = fs.readFileSync(filePath);
  const SQL = require('sql.js');
  db = new SQL.Database(buffer);
  logger.info(`Database imported from ${filePath}`);
  saveDatabase();
}

function statusReport() {
  const counts = {
    devices: getAll('SELECT * FROM devices').length,
    sensors: getAll('SELECT * FROM sensors').length,
    rules: getAll('SELECT * FROM rules').length,
    schedules: getAll('SELECT * FROM schedules').length,
    history: getAll('SELECT * FROM history').length,
    alerts: getAll('SELECT * FROM alerts').length,
    commands: getAll('SELECT * FROM commands').length
  };
  return counts;
}

module.exports = {
  initDatabase,
  getDatabase,
  closeDatabase,
  runQuery,
  getOne,
  getAll,
  saveDatabase,
  flushDatabase,
  exportDatabase,
  importFromFile,
  statusReport,
  applyMigrations,
  backupCurrentDatabase
};
