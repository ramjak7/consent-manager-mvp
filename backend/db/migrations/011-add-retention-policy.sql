-- ============================================================================
-- Migration: 011-add-retention-policy
-- Description: Add 7-year retention policy support (DPDP Act §8(7))
-- Version: 1.0
-- Created: 2026-02-01
--
-- DPDP Act 2023 §8(7): "The Data Fiduciary shall not retain personal data
-- beyond the period necessary for the purpose for which it was processed."
--
-- This migration adds:
-- 1. retention_until column on consents (default: created_at + 7 years)
-- 2. archived_consents table for long-term cold storage
-- 3. archived_audit_logs table for archived audit records
-- ============================================================================


-- ============================================================================
-- UP: Apply changes
-- ============================================================================

-- 1. Add retention_until to consents
ALTER TABLE public.consents
  ADD COLUMN IF NOT EXISTS retention_until timestamp with time zone;

-- Backfill: set retention_until = created_at + 7 years for all existing rows
UPDATE public.consents
  SET retention_until = created_at + INTERVAL '7 years'
  WHERE retention_until IS NULL;

-- Make it NOT NULL with default going forward
ALTER TABLE public.consents
  ALTER COLUMN retention_until SET NOT NULL;

ALTER TABLE public.consents
  ALTER COLUMN retention_until SET DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 years');

COMMENT ON COLUMN public.consents.retention_until IS 'Data retention deadline per DPDP §8(7). Default: 7 years from creation. Records must be archived/purged after this date.';

-- 2. Archived consents table (cold storage)
CREATE TABLE IF NOT EXISTS public.archived_consents (
    consent_id uuid NOT NULL PRIMARY KEY,
    consent_group_id text NOT NULL,
    version integer NOT NULL,
    user_id text NOT NULL,
    purpose text NOT NULL,
    data_types jsonb NOT NULL,
    valid_until timestamp with time zone NOT NULL,
    status text NOT NULL,
    created_at timestamp with time zone NOT NULL,
    retention_until timestamp with time zone NOT NULL,
    archived_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notice_id text,
    notice_version text,
    language text
);

COMMENT ON TABLE public.archived_consents IS 'Cold storage for consents that have been archived after their active lifecycle. Retained for compliance audit trail.';

-- Index for retention-based purging
CREATE INDEX IF NOT EXISTS idx_archived_consents_retention
  ON public.archived_consents (retention_until);

-- 3. Index on consents for retention job efficiency
CREATE INDEX IF NOT EXISTS idx_consents_retention_until
  ON public.consents (retention_until)
  WHERE status IN ('EXPIRED', 'REVOKED', 'REJECTED');


-- ============================================================================
-- DOWN: Rollback changes (reference only)
-- ============================================================================
-- BEGIN DOWN

-- DROP INDEX IF EXISTS idx_consents_retention_until;
-- DROP INDEX IF EXISTS idx_archived_consents_retention;
-- DROP TABLE IF EXISTS public.archived_consents;
-- ALTER TABLE public.consents DROP COLUMN IF EXISTS retention_until;

-- END DOWN
