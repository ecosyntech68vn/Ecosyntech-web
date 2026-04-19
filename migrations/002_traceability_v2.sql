-- EcoSynTech FarmOS PRO - Migration 002: Traceability Engine v2
-- Version: 5.0.0
-- Created: 2026-04-19

-- =====================================================
-- TRACEABILITY v2 TABLES
-- =====================================================

-- Batches (v2)
CREATE TABLE IF NOT EXISTS tb_batches (
  id TEXT PRIMARY KEY,
  org_id TEXT,
  farm_id TEXT,
  area_id TEXT,
  season_id TEXT,
  asset_id TEXT,
  product_name TEXT NOT NULL,
  product_type TEXT,
  batch_code TEXT UNIQUE,
  harvest_date TEXT,
  produced_quantity REAL,
  unit TEXT DEFAULT 'kg',
  quality_grade TEXT,
  status TEXT DEFAULT 'created',
  metadata_json TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Batch Events
CREATE TABLE IF NOT EXISTS tb_batch_events (
  id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  actor_type TEXT DEFAULT 'user',
  actor_id TEXT,
  related_log_id TEXT,
  related_quantity_id TEXT,
  related_inventory_id TEXT,
  location_json TEXT,
  note TEXT,
  event_time TEXT DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (batch_id) REFERENCES tb_batches(id)
);

-- Batch Inputs (seeds, fertilizer, etc)
CREATE TABLE IF NOT EXISTS tb_batch_inputs (
  id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL,
  input_type TEXT NOT NULL,
  input_name TEXT,
  supplier_name TEXT,
  quantity REAL,
  unit TEXT,
  used_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (batch_id) REFERENCES tb_batches(id)
);

-- Batch Quality Checks
CREATE TABLE IF NOT EXISTS tb_batch_quality_checks (
  id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL,
  check_type TEXT NOT NULL,
  result TEXT,
  score REAL,
  details_json TEXT,
  checked_by TEXT,
  checked_at TEXT DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (batch_id) REFERENCES tb_batches(id)
);

-- Packages
CREATE TABLE IF NOT EXISTS tb_packages (
  id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL,
  package_code TEXT UNIQUE,
  barcode TEXT UNIQUE,
  qr_code TEXT UNIQUE,
  net_weight REAL,
  unit TEXT DEFAULT 'kg',
  packaging_type TEXT,
  packed_at TEXT DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'created',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (batch_id) REFERENCES tb_batches(id)
);

-- Shipments
CREATE TABLE IF NOT EXISTS tb_shipments (
  id TEXT PRIMARY KEY,
  org_id TEXT,
  shipment_code TEXT UNIQUE,
  customer_name TEXT,
  destination TEXT,
  transport_type TEXT,
  status TEXT DEFAULT 'preparing',
  shipped_at TEXT,
  delivered_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Shipment Items
CREATE TABLE IF NOT EXISTS tb_shipment_items (
  id TEXT PRIMARY KEY,
  shipment_id TEXT NOT NULL,
  package_id TEXT NOT NULL,
  quantity REAL,
  unit TEXT DEFAULT 'kg',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (shipment_id) REFERENCES tb_shipments(id),
  FOREIGN KEY (package_id) REFERENCES tb_packages(id)
);

-- Recall Incidents
CREATE TABLE IF NOT EXISTS tb_recall_incidents (
  id TEXT PRIMARY KEY,
  batch_id TEXT,
  incident_type TEXT,
  severity TEXT,
  description TEXT,
  status TEXT DEFAULT 'open',
  created_by TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  resolved_at TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (batch_id) REFERENCES tb_batches(id)
);

-- QR Codes (for public verification)
CREATE TABLE IF NOT EXISTS tb_qr_codes (
  id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  code_type TEXT DEFAULT 'qr',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_tb_batches_farm ON tb_batches(farm_id);
CREATE INDEX IF NOT EXISTS idx_tb_batches_status ON tb_batches(status);
CREATE INDEX IF NOT EXISTS idx_tb_batches_batch_code ON tb_batches(batch_code);
CREATE INDEX IF NOT EXISTS idx_tb_batch_events_batch ON tb_batch_events(batch_id);
CREATE INDEX IF NOT EXISTS idx_tb_batch_events_time ON tb_batch_events(event_time);
CREATE INDEX IF NOT EXISTS idx_tb_packages_batch ON tb_packages(batch_id);
CREATE INDEX IF NOT EXISTS idx_tb_packages_code ON tb_packages(package_code);
CREATE INDEX IF NOT EXISTS idx_tb_shipments_status ON tb_shipments(status);
CREATE INDEX IF NOT EXISTS idx_tb_incidents_batch ON tb_recall_incidents(batch_id);
CREATE INDEX IF NOT EXISTS idx_tb_incidents_status ON tb_recall_incidents(status);

-- Migration Complete