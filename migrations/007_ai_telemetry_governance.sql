-- Migration: AI Telemetry Governance
-- ISO 27001:2022 A.14.3 Data Quality, A.14.4 Data Governance
-- Aligns with IoT_DATA_TAXONOMY.md data classification

CREATE TABLE IF NOT EXISTS ai_prediction_audit (
  id TEXT PRIMARY KEY,
  prediction_type TEXT NOT NULL,
  model_id TEXT,
  input_hash TEXT,
  output_hash TEXT,
  quality_score REAL,
  quality_grade TEXT,
  input_sources TEXT,
  data_classification TEXT DEFAULT 'Internal',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_prediction_audit_type ON ai_prediction_audit(prediction_type);
CREATE INDEX IF NOT EXISTS idx_ai_prediction_audit_created ON ai_prediction_audit(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_prediction_audit_model ON ai_prediction_audit(model_id);

CREATE TABLE IF NOT EXISTS data_quality_logs (
  id TEXT PRIMARY KEY,
  data_type TEXT NOT NULL,
  field_name TEXT,
  value REAL,
  quality TEXT NOT NULL,
  reason TEXT,
  threshold_min REAL,
  threshold_max REAL,
  logged_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_data_quality_logs_type ON data_quality_logs(data_type);
CREATE INDEX IF NOT EXISTS idx_data_quality_logs_quality ON data_quality_logs(quality);
CREATE INDEX IF NOT EXISTS idx_data_quality_logs_logged ON data_quality_logs(logged_at);