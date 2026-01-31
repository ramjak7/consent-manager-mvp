/**
 * CANONICAL SCHEMA REFERENCE
 * 
 * This file documents the authoritative schema structure.
 * It is generated from the live database schema snapshot and serves as
 * a reference for AI tools and developers.
 * 
 * DO NOT MODIFY THIS FILE DIRECTLY.
 * All schema changes must go through the migration system:
 *   db/migrations/NNN-description.sql
 * 
 * Last synchronized: 2026-01-31
 * Source: db/snapshots/schema_full_v1.sql
 */

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


-- ============================================================================
-- FUNCTIONS
-- ============================================================================

/**
 * prevent_audit_mutation()
 * 
 * Trigger function that enforces immutability of audit logs.
 * Raises an exception on any UPDATE or DELETE attempt.
 * 
 * Used by: trigger audit_no_update on public.audit_logs
 */
CREATE OR REPLACE FUNCTION public.prevent_audit_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs are immutable';
END;
$$;


-- ============================================================================
-- TABLES
-- ============================================================================

/**
 * audit_logs
 * 
 * Immutable append-only audit log for compliance and forensics.
 * 
 * Invariants:
 * - Never modified after insertion (enforced by trigger)
 * - Always in insertion order (by timestamp)
 * - Hash chain prevents tampering (prev_hash -> hash)
 * 
 * Fields:
 *   audit_id (UUID) - Unique identifier for this audit event
 *   event_type (text) - Type of event (CONSENT_REQUESTED, CONSENT_APPROVED, etc.)
 *   consent_id (text) - Reference to consent being audited (may be null for pre-consent events)
 *   user_id (text) - Data principal identifier
 *   timestamp (timestamp) - When event occurred (defaults to NOW())
 *   details (jsonb) - Event-specific metadata (arbitrary structure)
 *   prev_hash (text) - Hash of previous audit log (null for first entry)
 *   hash (text) - SHA-256 hash of this entry + prev_hash
 */
CREATE TABLE public.audit_logs (
    audit_id uuid NOT NULL,
    event_type text NOT NULL,
    consent_id text NOT NULL,
    user_id text NOT NULL,
    "timestamp" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    details jsonb NOT NULL,
    prev_hash text,
    hash text NOT NULL,
    CONSTRAINT audit_logs_pkey PRIMARY KEY (audit_id)
);


/**
 * consents
 * 
 * Versioned consent records. Each row represents a single version of a consent grant.
 * Multiple rows with the same (user_id, purpose) represent history.
 * 
 * Invariants:
 * - Only one ACTIVE consent per (user_id, purpose) - enforced by unique index
 * - approval_token is unique (only one pending approval at a time)
 * - version increments monotonically within a consent_group_id
 * - valid_until is immutable once ACTIVE
 * - Status transitions are: REQUESTED -> (APPROVED -> ACTIVE | REJECTED)
 *                                  ACTIVE -> (EXPIRED | REVOKED)
 * 
 * Fields:
 *   consent_id (uuid) - Unique identifier for this consent version
 *   user_id (text) - Data principal identifier
 *   purpose (text) - Purpose for which consent was granted (e.g., "marketing", "analytics")
 *   data_types (jsonb) - Array of data categories (e.g., ["email", "phone"])
 *   valid_until (date) - Expiry date (DPDP §6 requirement)
 *   status (text) - REQUESTED, ACTIVE, REJECTED, REVOKED, or EXPIRED
 *   created_at (timestamp) - When this version was created
 *   consent_group_id (text) - Stable identifier: "{user_id}:{purpose}" (for grouping versions)
 *   version (integer) - Monotonic version counter within a consent_group_id
 *   approval_token (text) - Temporary token for approval (null after approval)
 *   approval_expires_at (timestamp) - When approval token expires
 * 
 * Constraints:
 *   - PRIMARY KEY: consent_id
 *   - UNIQUE: approval_token (when not null)
 *   - UNIQUE INDEX: (user_id, purpose) WHERE status = 'ACTIVE' - ensures only one active per purpose
 */
CREATE TABLE public.consents (
    consent_id uuid NOT NULL,
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
    CONSTRAINT consents_pkey PRIMARY KEY (consent_id),
    CONSTRAINT approval_token_unique UNIQUE (approval_token)
);


-- ============================================================================
-- INDEXES
-- ============================================================================

/**
 * uniq_active_consent_per_purpose
 * 
 * Enforces business invariant: only one ACTIVE consent per user+purpose
 * 
 * Query performance: Used by getLatestActiveConsent() to find the current consent
 *   SELECT * FROM consents
 *   WHERE user_id = $1 AND purpose = $2 AND status = 'ACTIVE'
 */
CREATE UNIQUE INDEX uniq_active_consent_per_purpose 
    ON public.consents (user_id, purpose) 
    WHERE (status = 'ACTIVE'::text);


-- ============================================================================
-- TRIGGERS
-- ============================================================================

/**
 * audit_no_update
 * 
 * Enforces immutability of audit_logs table.
 * Prevents UPDATE and DELETE operations on audit log entries.
 * 
 * Attached to: public.audit_logs
 * Function: prevent_audit_mutation()
 */
CREATE TRIGGER audit_no_update 
    BEFORE DELETE OR UPDATE ON public.audit_logs 
    FOR EACH ROW 
    EXECUTE FUNCTION public.prevent_audit_mutation();


-- ============================================================================
-- PERMISSIONS / GRANTS
-- ============================================================================

/**
 * Audit logs are read-insertable but not updateable/deletable
 * This prevents accidental or malicious mutations of legal evidence
 */
REVOKE ALL ON TABLE public.audit_logs FROM postgres;
GRANT SELECT, INSERT, REFERENCES, TRIGGER, TRUNCATE, MAINTAIN ON TABLE public.audit_logs TO postgres;


-- ============================================================================
-- SCHEMA VERSION TRACKING
-- ============================================================================

/**
 * This canonical schema is at version 1.0
 * All migrations are tracked in db/migrations/
 */
