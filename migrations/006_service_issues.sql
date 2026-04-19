-- Migration: Service Issue Tracking
-- Full issue lifecycle management

CREATE TABLE IF NOT EXISTS service_issues (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT DEFAULT 'medium',
  category TEXT DEFAULT 'other',
  status TEXT DEFAULT 'new',
  affected_farm TEXT,
  affected_device TEXT,
  affected_sensor TEXT,
  steps_to_reproduce TEXT,
  expected_behavior TEXT,
  actual_behavior TEXT,
  root_cause TEXT,
  fix_applied TEXT,
  reported_by TEXT,
  assigned_to TEXT,
  acknowledged_at TEXT,
  diagnosed_at TEXT,
  fixed_at TEXT,
  verified_at TEXT,
  closed_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_issues_status ON service_issues(status);
CREATE INDEX IF NOT EXISTS idx_issues_severity ON service_issues(severity);
CREATE INDEX IF NOT EXISTS idx_issues_category ON service_issues(category);
CREATE INDEX IF NOT EXISTS idx_issues_created ON service_issues(created_at);
CREATE INDEX IF NOT EXISTS idx_issues_assigned ON service_issues(assigned_to);