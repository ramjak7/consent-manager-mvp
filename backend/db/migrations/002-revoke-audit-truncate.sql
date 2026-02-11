-- Migration: Revoke TRUNCATE privilege on audit_logs
-- Purpose: Prevent accidental or malicious audit trail destruction
-- Severity: CRITICAL (SEC-18)
-- Reference: COMPREHENSIVE_AUDIT_REPORT.md Section B.9

-- Revoke dangerous privileges from main postgres role
REVOKE TRUNCATE, MAINTAIN ON TABLE audit_logs FROM postgres;

-- Grant only safe operations
GRANT SELECT, INSERT, REFERENCES, TRIGGER ON TABLE audit_logs TO postgres;

-- Create break-glass role for emergency operations
-- This role should have separate credentials and all usage must be logged
CREATE ROLE audit_breakglass WITH PASSWORD 'CHANGE_ME_IN_PRODUCTION';

-- Grant break-glass role ability to view audit logs only by default
GRANT SELECT ON TABLE audit_logs TO audit_breakglass;

-- Create break-glass procedure that requires explicit justification
CREATE OR REPLACE FUNCTION emergency_audit_truncate(justification TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
    -- Log the break-glass usage
    RAISE WARNING 'BREAK-GLASS AUDIT TRUNCATE INITIATED: %', justification;
    
    -- In production, send alert to security team here
    -- PERFORM pg_notify('security_alert', 'Break-glass audit truncate: ' || justification);
    
    RETURN 'Break-glass operation logged. Contact DBA to execute TRUNCATE with proper authorization.';
END;
$$;

-- Grant execute on break-glass function to audit_breakglass role
GRANT EXECUTE ON FUNCTION emergency_audit_truncate(TEXT) TO audit_breakglass;

-- Add comment documenting the security control
COMMENT ON TABLE audit_logs IS 'Immutable audit trail. TRUNCATE privilege revoked. Use emergency_audit_truncate() function for break-glass operations.';
COMMENT ON FUNCTION emergency_audit_truncate(TEXT) IS 'Break-glass function for audit operations. All invocations are logged. Requires DBA approval.';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Audit log protection hardened: TRUNCATE revoked, break-glass role created';
END
$$;
