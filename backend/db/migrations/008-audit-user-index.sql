-- Migration 008: Add index on audit_logs.user_id for P1-4 performance fix
-- Supports getAuditLogsByUserId() SQL-level filtering instead of O(n) in-memory scan

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id_timestamp ON audit_logs(user_id, timestamp DESC);
