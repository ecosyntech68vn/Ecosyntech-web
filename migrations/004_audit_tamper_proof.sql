-- Migration: Audit Tamper-Proof Enhancement
-- Adds hash chain for tamper-evident audit logs

ALTER TABLE audit_logs ADD COLUMN prev_hash TEXT;
ALTER TABLE audit_logs ADD COLUMN hash TEXT;

-- Add index for fast hash chain verification
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_hash ON audit_logs(hash);

-- Verification trigger to ensure chain integrity
-- (SQLite doesn't support triggers well, so we rely on application-level verification)