-- EcoSynTech FarmOS PRO - Migration 001: Initial Schema
-- Version: 5.0.0
-- Created: 2026-04-19

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  phone TEXT,
  org_id TEXT,
  permissions_json TEXT,
  last_login TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Organizations
CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  settings_json TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Farms
CREATE TABLE IF NOT EXISTS farms (
  id TEXT PRIMARY KEY,
  org_id TEXT,
  name TEXT NOT NULL,
  name_vi TEXT,
  location TEXT,
  area_size REAL,
  area_unit TEXT DEFAULT 'hectare',
  status TEXT DEFAULT 'active',
  settings_json TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Areas (within farm)
CREATE TABLE IF NOT EXISTS areas (
  id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL,
  name TEXT NOT NULL,
  name_vi TEXT,
  crop_type TEXT,
  geometry_json TEXT,
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Devices (IoT)
CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  farm_id TEXT,
  area_id TEXT,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT DEFAULT 'offline',
  location TEXT,
  config_json TEXT,
  firmware_version TEXT,
  last_seen TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Sensors
CREATE TABLE IF NOT EXISTS sensors (
  id TEXT PRIMARY KEY,
  device_id TEXT,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  value REAL,
  unit TEXT,
  min_value REAL,
  max_value REAL,
  timestamp TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Workers
CREATE TABLE IF NOT EXISTS workers (
  id TEXT PRIMARY KEY,
  farm_id TEXT,
  name TEXT NOT NULL,
  role TEXT,
  phone TEXT,
  email TEXT,
  status TEXT DEFAULT 'active',
  shift_json TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  farm_id TEXT,
  worker_id TEXT,
  area_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending',
  priority TEXT DEFAULT 'medium',
  due_date TEXT,
  completed_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- INVENTORY & FINANCE
-- =====================================================

-- Inventory Items
CREATE TABLE IF NOT EXISTS inventory_items (
  id TEXT PRIMARY KEY,
  farm_id TEXT,
  name TEXT NOT NULL,
  category TEXT,
  quantity REAL,
  unit TEXT,
  min_quantity REAL,
  max_quantity REAL,
  cost_per_unit REAL,
  expiry_date TEXT,
  supplier_name TEXT,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Finance Entries
CREATE TABLE IF NOT EXISTS finance_entries (
  id TEXT PRIMARY KEY,
  farm_id TEXT,
  type TEXT NOT NULL,
  category TEXT,
  amount REAL NOT NULL,
  description TEXT,
  entry_date TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- SUPPLY CHAIN
-- =====================================================

-- Supply Chain Batches
CREATE TABLE IF NOT EXISTS supply_chain (
  id TEXT PRIMARY KEY,
  farm_id TEXT,
  batch_code TEXT UNIQUE,
  product_name TEXT NOT NULL,
  product_type TEXT,
  quantity REAL,
  unit TEXT,
  status TEXT DEFAULT 'pending',
  harvest_date TEXT,
  harvested_by TEXT,
  washed BOOLEAN DEFAULT 0,
  sorted BOOLEAN DEFAULT 0,
  packed BOOLEAN DEFAULT 0,
  packed_at TEXT,
  shipped_date TEXT,
  destination TEXT,
  transport_type TEXT,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- AUTOMATION
-- =====================================================

-- Rules (Automation)
CREATE TABLE IF NOT EXISTS rules (
  id TEXT PRIMARY KEY,
  farm_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  enabled INTEGER DEFAULT 1,
  condition TEXT NOT NULL,
  action TEXT NOT NULL,
  cooldown_minutes INTEGER DEFAULT 30,
  hysteresis REAL DEFAULT 0,
  time_window TEXT,
  priority TEXT DEFAULT 'normal',
  target_device TEXT,
  trigger_count INTEGER DEFAULT 0,
  last_triggered TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Schedules
CREATE TABLE IF NOT EXISTS schedules (
  id TEXT PRIMARY KEY,
  farm_id TEXT,
  device_id TEXT,
  name TEXT NOT NULL,
  schedule_json TEXT,
  enabled INTEGER DEFAULT 1,
  last_run TEXT,
  next_run TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- ALERTS & LOGGING
-- =====================================================

-- Alerts
CREATE TABLE IF NOT EXISTS alerts (
  id TEXT PRIMARY KEY,
  farm_id TEXT,
  device_id TEXT,
  title TEXT NOT NULL,
  message TEXT,
  severity TEXT DEFAULT 'info',
  status TEXT DEFAULT 'open',
  acknowledged_by TEXT,
  acknowledged_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- History / Activity Logs
CREATE TABLE IF NOT EXISTS history (
  id TEXT PRIMARY KEY,
  farm_id TEXT,
  device_id TEXT,
  action TEXT NOT NULL,
  details TEXT,
  value REAL,
  timestamp TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  details_json TEXT,
  ip_address TEXT,
  user_agent TEXT,
  timestamp TEXT DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- API & SECURITY
-- =====================================================

-- API Keys
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  key_hash TEXT UNIQUE NOT NULL,
  name TEXT,
  scope_json TEXT,
  expires_at TEXT,
  last_used TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  token_hash TEXT UNIQUE NOT NULL,
  expires_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- INDEXES (Performance)
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_farms_org ON farms(org_id);
CREATE INDEX IF NOT EXISTS idx_areas_farm ON areas(farm_id);
CREATE INDEX IF NOT EXISTS idx_devices_farm ON devices(farm_id);
CREATE INDEX IF NOT EXISTS idx_devices_type ON devices(type);
CREATE INDEX IF NOT EXISTS idx_sensors_type ON sensors(type);
CREATE INDEX IF NOT EXISTS idx_tasks_farm ON tasks(farm_id);
CREATE INDEX IF NOT EXISTS idx_tasks_worker ON tasks(worker_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_inventory_farm ON inventory_items(farm_id);
CREATE INDEX IF NOT EXISTS idx_finance_farm ON finance_entries(farm_id);
CREATE INDEX IF NOT EXISTS idx_finance_type ON finance_entries(type);
CREATE INDEX IF NOT EXISTS idx_supply_farm ON supply_chain(farm_id);
CREATE INDEX IF NOT EXISTS idx_history_farm ON history(farm_id);
CREATE INDEX IF NOT EXISTS idx_history_device ON history(device_id);
CREATE INDEX IF NOT EXISTS idx_alerts_farm ON alerts(farm_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);

-- =====================================================
-- FARMOS CORE EXTENDED TABLES
-- =====================================================

-- Plans (Seasonal Plans)
CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  season TEXT,
  year INTEGER,
  start_date TEXT,
  end_date TEXT,
  crop_id TEXT,
  status TEXT DEFAULT 'draft',
  progress REAL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Assets
CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  farm_id TEXT,
  area_id TEXT,
  parent_id TEXT,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  model TEXT,
  serial_number TEXT,
  purchase_date TEXT,
  purchase_price REAL,
  location TEXT,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Asset History
CREATE TABLE IF NOT EXISTS asset_history (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL,
  action TEXT NOT NULL,
  description TEXT,
  performed_by TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (asset_id) REFERENCES assets(id)
);

-- Quantities (Yield/Production Records)
CREATE TABLE IF NOT EXISTS quantities (
  id TEXT PRIMARY KEY,
  farm_id TEXT,
  area_id TEXT,
  crop_id TEXT,
  type TEXT NOT NULL,
  quantity REAL NOT NULL,
  unit TEXT,
  quality_grade TEXT,
  notes TEXT,
  record_date TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (area_id) REFERENCES areas(id),
  FOREIGN KEY (crop_id) REFERENCES crops(id)
);

-- Logs (Activity Logs)
CREATE TABLE IF NOT EXISTS logs (
  id TEXT PRIMARY KEY,
  farm_id TEXT,
  area_id TEXT,
  asset_id TEXT,
  worker_id TEXT,
  type TEXT NOT NULL,
  description TEXT,
  value REAL,
  attachments_json TEXT,
  timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (farm_id) REFERENCES farms(id),
  FOREIGN KEY (area_id) REFERENCES areas(id),
  FOREIGN KEY (asset_id) REFERENCES assets(id),
  FOREIGN KEY (worker_id) REFERENCES workers(id)
);

-- =====================================================
-- INDEXES FOR CORE TABLES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_plans_farm ON plans(farm_id);
CREATE INDEX IF NOT EXISTS idx_plans_status ON plans(status);
CREATE INDEX IF NOT EXISTS idx_assets_farm ON assets(farm_id);
CREATE INDEX IF NOT EXISTS idx_assets_area ON assets(area_id);
CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(type);
CREATE INDEX IF NOT EXISTS idx_assets_parent ON assets(parent_id);
CREATE INDEX IF NOT EXISTS idx_quantities_farm ON quantities(farm_id);
CREATE INDEX IF NOT EXISTS idx_quantities_area ON quantities(area_id);
CREATE INDEX IF NOT EXISTS idx_quantities_crop ON quantities(crop_id);
CREATE INDEX IF NOT EXISTS idx_quantities_type ON quantities(type);
CREATE INDEX IF NOT EXISTS idx_quantities_date ON quantities(record_date);
CREATE INDEX IF NOT EXISTS idx_logs_farm ON logs(farm_id);
CREATE INDEX IF NOT EXISTS idx_logs_area ON logs(area_id);
CREATE INDEX IF NOT EXISTS idx_logs_asset ON logs(asset_id);
CREATE INDEX IF NOT EXISTS idx_logs_type ON logs(type);
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp);

-- Migration Complete
-- Run seeders separately: seeders/001_crops.sql, seeders/002_aquaculture.sql