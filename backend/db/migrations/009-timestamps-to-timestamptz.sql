-- ============================================================================
-- Migration: 009-timestamps-to-timestamptz
-- Description: Convert all timestamp/date columns to TIMESTAMP WITH TIME ZONE
-- Version: 1.0
-- Created: 2026-02-01
--
-- WHY: The DPDP Act 2023 requires precise temporal records for consent
-- lifecycle events. DATE loses time-of-day precision, and
-- TIMESTAMP WITHOUT TIME ZONE is ambiguous across deployments in
-- different regions. TIMESTAMP WITH TIME ZONE (timestamptz) ensures
-- unambiguous UTC storage regardless of server timezone.
--
-- Columns changed:
--   consents.valid_until:        date → timestamptz
--   consents.created_at:         timestamp → timestamptz
--   consents.approval_expires_at: timestamp → timestamptz
--   audit_logs.timestamp:        timestamp → timestamptz
-- ============================================================================


-- ============================================================================
-- UP: Apply changes
-- ============================================================================

-- 1. consents.valid_until: DATE → TIMESTAMPTZ
--    Existing DATE values become midnight UTC on that date.
ALTER TABLE public.consents
  ALTER COLUMN valid_until
  SET DATA TYPE timestamp with time zone
  USING valid_until::timestamp with time zone;

COMMENT ON COLUMN public.consents.valid_until IS 'Expiry timestamp with timezone (DPDP §6 requirement). Upgraded from DATE for sub-day precision.';

-- 2. consents.created_at: TIMESTAMP → TIMESTAMPTZ
ALTER TABLE public.consents
  ALTER COLUMN created_at
  SET DATA TYPE timestamp with time zone
  USING created_at AT TIME ZONE 'UTC';

ALTER TABLE public.consents
  ALTER COLUMN created_at
  SET DEFAULT CURRENT_TIMESTAMP;

-- 3. consents.approval_expires_at: TIMESTAMP → TIMESTAMPTZ
ALTER TABLE public.consents
  ALTER COLUMN approval_expires_at
  SET DATA TYPE timestamp with time zone
  USING approval_expires_at AT TIME ZONE 'UTC';

-- 4. audit_logs.timestamp: TIMESTAMP → TIMESTAMPTZ
--    Temporarily disable the immutability trigger for the ALTER
ALTER TABLE public.audit_logs DISABLE TRIGGER audit_no_update;

ALTER TABLE public.audit_logs
  ALTER COLUMN "timestamp"
  SET DATA TYPE timestamp with time zone
  USING "timestamp" AT TIME ZONE 'UTC';

ALTER TABLE public.audit_logs
  ALTER COLUMN "timestamp"
  SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE public.audit_logs ENABLE TRIGGER audit_no_update;

COMMENT ON COLUMN public.audit_logs."timestamp" IS 'When event occurred (UTC timestamptz). Upgraded for unambiguous timezone handling.';


-- ============================================================================
-- DOWN: Rollback changes (reference only)
-- ============================================================================
-- BEGIN DOWN

-- ALTER TABLE public.consents ALTER COLUMN valid_until SET DATA TYPE date USING valid_until::date;
-- ALTER TABLE public.consents ALTER COLUMN created_at SET DATA TYPE timestamp without time zone USING created_at::timestamp;
-- ALTER TABLE public.consents ALTER COLUMN approval_expires_at SET DATA TYPE timestamp without time zone USING approval_expires_at::timestamp;
-- ALTER TABLE public.audit_logs DISABLE TRIGGER audit_no_update;
-- ALTER TABLE public.audit_logs ALTER COLUMN "timestamp" SET DATA TYPE timestamp without time zone USING "timestamp"::timestamp;
-- ALTER TABLE public.audit_logs ENABLE TRIGGER audit_no_update;

-- END DOWN
