const logger = require('./logger');

const DRIVER_TYPE = process.env.DB_TYPE || 'sqlite';

let db = null;
let SQL = null;
let pool = null;

async function initDatabase() {
  const config = require('./index');
  
  if (DRIVER_TYPE === 'postgresql') {
    return initPostgresDatabase();
  }
  
  return initSqliteDatabase();
}

async function initSqliteDatabase() {
  const initSqlJs = require('sql.js');
  const fs = require('fs');
  const path = require('path');
  
  const dbPath = process.env.DB_PATH || './data/ecosyntech.db';
  const dbDir = path.dirname(dbPath);
  
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  
  SQL = await initSqlJs();
  
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
    logger.info('[SQLite] Loaded existing database');
  } else {
    db = new SQL.Database();
    logger.info('[SQLite] Created new database');
  }
  
  createTables();
  seedInitialData();
  saveDatabase();
  
  logger.info('[SQLite] Database initialized successfully');
  return db;
}

function createTables() {
  if (!db) return;
  
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    tenant_id TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS farms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    location TEXT,
    area REAL,
    owner_id TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS devices (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    farm_id TEXT,
    status TEXT DEFAULT 'offline',
    last_seen TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS sensors (
    id TEXT PRIMARY KEY,
    device_id TEXT,
    type TEXT NOT NULL,
    value REAL,
    unit TEXT,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    details_json TEXT,
    ip_address TEXT,
    user_agent TEXT,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    prev_hash TEXT,
    hash TEXT
  )`);

  db.run(`CREATE INDEX IF NOT EXISTS idx_devices_farm ON devices(farm_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_sensors_device ON sensors(device_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_audit_logs_hash ON audit_logs(hash)`);
}

function seedInitialData() {
  if (!db) return;
  const bcrypt = require('bcryptjs');
  const hashedPassword = bcrypt.hashSync('admin123', 10);
  
  db.run(`INSERT OR IGNORE INTO users (id, email, password, name, role) VALUES (?, ?, ?, ?, ?)`,
    ['usr_admin', 'admin@ecosyntech.com', hashedPassword, 'Administrator', 'admin']);
  
  logger.info('[SQLite] Seeded initial data');
}

function saveDatabase() {
  if (!db) return;
  const fs = require('fs');
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(process.env.DB_PATH || './data/ecosyntech.db', buffer);
}

function runQuery(sql, params = []) {
  if (DRIVER_TYPE === 'postgresql' && pool) {
    return runPostgresQuery(sql, params);
  }
  if (!db) return { changes: 0 };
  try {
    db.run(sql, params);
    return { changes: db.getRowsModified() };
  } catch (err) {
    logger.error('[SQLite] Query error:', err);
    throw err;
  }
}

function getOne(sql, params = []) {
  if (DRIVER_TYPE === 'postgresql' && pool) {
    return getOnePostgres(sql, params);
  }
  if (!db) return null;
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
    logger.error('[SQLite] GetOne error:', err);
    return null;
  }
}

function getAll(sql, params = []) {
  if (DRIVER_TYPE === 'postgresql' && pool) {
    return getAllPostgres(sql, params);
  }
  if (!db) return [];
  try {
    const results = [];
    const stmt = db.prepare(sql);
    stmt.bind(params);
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  } catch (err) {
    logger.error('[SQLite] GetAll error:', err);
    return [];
  }
}

function closeDatabase() {
  if (DRIVER_TYPE === 'postgresql' && pool) {
    return pool.end();
  }
  if (db) {
    saveDatabase();
    db.close();
    db = null;
  }
}

async function initPostgresDatabase() {
  const { Pool } = require('pg');
  
  pool = new Pool({
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT || '5432', 10),
    database: process.env.PG_DATABASE || 'ecosyntech',
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD,
    max: 20,
  });
  
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      tenant_id TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  await pool.query(`
    CREATE TABLE IF NOT EXISTS farms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      location TEXT,
      area REAL,
      owner_id TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  await pool.query(`
    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      farm_id TEXT,
      status TEXT DEFAULT 'offline',
      last_seen TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sensors (
      id TEXT PRIMARY KEY,
      device_id TEXT,
      type TEXT NOT NULL,
      value REAL,
      unit TEXT,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      details_json TEXT,
      ip_address TEXT,
      user_agent TEXT,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      prev_hash TEXT,
      hash TEXT
    )
  `);
  
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_devices_farm ON devices(farm_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_sensors_device ON sensors(device_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_hash ON audit_logs(hash)`);
  
  logger.info('[PostgreSQL] Database initialized');
  return pool;
}

async function runPostgresQuery(sql, params = []) {
  if (!pool) throw new Error('PostgreSQL not initialized');
  const result = await pool.query(sql, params);
  return result;
}

async function getOnePostgres(sql, params = []) {
  const result = await runPostgresQuery(sql, params);
  return result.rows[0] || null;
}

async function getAllPostgres(sql, params = []) {
  const result = await runPostgresQuery(sql, params);
  return result.rows;
}

module.exports = {
  getDriverType: () => DRIVER_TYPE,
  isPostgreSQL: () => DRIVER_TYPE === 'postgresql',
  isSqlite: () => DRIVER_TYPE === 'sqlite',
  initDatabase,
  saveDatabase,
  runQuery,
  getOne,
  getAll,
  closeDatabase
};