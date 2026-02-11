-- ============================================================================
-- Migration: 001-init-schema
-- Description: Initialize core consent management schema
-- Version: 1.0
-- Created: 2026-01-31
-- 
-- This is the foundational schema for the Consent Manager MVP.
-- It creates:
--   - pgcrypto extension (for uuid_generate_v4 and cryptographic functions)
--   - audit_logs table (immutable append-only compliance log)
--   - consents table (versioned consent records)
--   - Enforcement triggers and indexes
-- ============================================================================


-- ============================================================================
-- UP: Apply changes
-- ============================================================================

-- Create pgcrypto extension if not already present
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


-- ============================================================================
-- FUNCTION: prevent_audit_mutation
-- Enforces immutability of audit logs
-- ============================================================================

CREATE OR REPLACE FUNCTION public.prevent_audit_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs are immutable';
END;
$$;


-- ============================================================================
-- TABLE: audit_logs
-- Immutable append-only audit trail for compliance
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
    audit_id uuid NOT NULL PRIMARY KEY,
    event_type text NOT NULL,
    consent_id text NOT NULL,
    user_id text NOT NULL,
    "timestamp" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    details jsonb NOT NULL,
    prev_hash text,
    hash text NOT NULL
);

COMMENT ON TABLE public.audit_logs IS 'Immutable append-only audit log for compliance and forensics. Hash chain prevents tampering.';
COMMENT ON COLUMN public.audit_logs.audit_id IS 'Unique identifier for this audit event';
COMMENT ON COLUMN public.audit_logs.event_type IS 'Type of event (CONSENT_REQUESTED, CONSENT_APPROVED, CONSENT_REVOKED, etc.)';
COMMENT ON COLUMN public.audit_logs.consent_id IS 'Reference to consent being audited';
COMMENT ON COLUMN public.audit_logs.user_id IS 'Data principal identifier';
COMMENT ON COLUMN public.audit_logs."timestamp" IS 'When event occurred';
COMMENT ON COLUMN public.audit_logs.details IS 'Event-specific metadata (JSONB)';
COMMENT ON COLUMN public.audit_logs.prev_hash IS 'Hash of previous audit log entry (null for first)';
COMMENT ON COLUMN public.audit_logs.hash IS 'SHA-256 hash chain of this entry and prev_hash';


-- ============================================================================
-- TABLE: consents
-- Versioned consent records with state machine
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.consents (
    consent_id uuid NOT NULL PRIMARY KEY,
    user_id text NOT NULL,
    purpose text NOT NULL,
    data_types jsonb NOT NULL,
    valid_until date NOT NULL,
    status text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    consent_group_id text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    approval_token text,
    approval_expires_at timestamp without time zone,
    CONSTRAINT approval_token_unique UNIQUE (approval_token)
);

COMMENT ON TABLE public.consents IS 'Versioned consent records. Each row is a single version. Multiple rows per user+purpose represent history.';
COMMENT ON COLUMN public.consents.consent_id IS 'Unique identifier for this consent version';
COMMENT ON COLUMN public.consents.user_id IS 'Data principal identifier';
COMMENT ON COLUMN public.consents.purpose IS 'Purpose of consent (e.g., marketing, analytics)';
COMMENT ON COLUMN public.consents.data_types IS 'Array of data categories (JSONB)';
COMMENT ON COLUMN public.consents.valid_until IS 'Expiry date (DPDP §6 requirement)';
COMMENT ON COLUMN public.consents.status IS 'State: REQUESTED, ACTIVE, REJECTED, REVOKED, EXPIRED';
COMMENT ON COLUMN public.consents.consent_group_id IS 'Stable identifier: {user_id}:{purpose} (for grouping versions)';
COMMENT ON COLUMN public.consents.version IS 'Monotonic version counter within a consent_group_id';
COMMENT ON COLUMN public.consents.approval_token IS 'Temporary token for approval (null after approval)';
COMMENT ON COLUMN public.consents.approval_expires_at IS 'When approval token expires';


-- ============================================================================
-- INDEXES
-- ============================================================================

-- Enforce only one ACTIVE consent per (user_id, purpose)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_consent_per_purpose 
    ON public.consents (user_id, purpose) 
    WHERE (status = 'ACTIVE'::text);

COMMENT ON INDEX uniq_active_consent_per_purpose IS 'Business invariant: only one ACTIVE consent per user+purpose. Used by getLatestActiveConsent().';


-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Prevent any modification to audit logs
DROP TRIGGER IF EXISTS audit_no_update ON public.audit_logs;

CREATE TRIGGER audit_no_update 
    BEFORE DELETE OR UPDATE ON public.audit_logs 
    FOR EACH ROW 
    EXECUTE FUNCTION public.prevent_audit_mutation();

COMMENT ON TRIGGER audit_no_update ON public.audit_logs IS 'Enforces immutability: prevents UPDATE and DELETE on audit logs.';


-- ============================================================================
-- PERMISSIONS
-- ============================================================================

-- Audit logs are read-insertable but not modifiable
-- This protects legal evidence from tampering
REVOKE ALL ON TABLE public.audit_logs FROM postgres;
GRANT SELECT, INSERT, REFERENCES, TRIGGER, TRUNCATE, MAINTAIN ON TABLE public.audit_logs TO postgres;


-- ============================================================================
-- DOWN: Rollback changes
-- ============================================================================
-- This section is executed when rolling back the migration
-- BEGIN DOWN

-- DROP TRIGGER audit_no_update ON public.audit_logs;
-- DROP FUNCTION public.prevent_audit_mutation();
-- DROP INDEX IF EXISTS uniq_active_consent_per_purpose;
-- DROP TABLE IF EXISTS public.consents;
-- DROP TABLE IF EXISTS public.audit_logs;
-- DROP EXTENSION IF EXISTS pgcrypto;

-- END DOWN
