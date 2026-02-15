-- ============================================================================
-- Migration: 012-add-purpose-versioning
-- Description: Add purpose versioning table for DPDP Act compliance
-- Version: 1.0
-- Created: 2026-02-01
--
-- DPDP Act 2023 §6: Consent must be specific to a clearly stated purpose.
-- When purposes evolve (e.g., "marketing" gets expanded), the DF must
-- track which version of the purpose definition a consent was granted for.
--
-- This migration creates:
-- 1. purposes table with version tracking
-- 2. FK reference from consents to purposes (optional, via purpose_id)
-- ============================================================================


-- ============================================================================
-- UP: Apply changes
-- ============================================================================

-- 1. Purpose definitions with version tracking
CREATE TABLE IF NOT EXISTS public.purposes (
    purpose_id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    -- Stable slug identifier (e.g., "marketing", "analytics")
    code text NOT NULL,
    -- Version number (monotonic within a code)
    version integer NOT NULL DEFAULT 1,
    -- Human-readable name
    name text NOT NULL,
    -- Detailed description shown to Data Principals
    description text NOT NULL,
    -- Legal basis under DPDP Act
    legal_basis text NOT NULL DEFAULT 'CONSENT',
    -- Data categories this purpose covers
    data_categories jsonb NOT NULL DEFAULT '[]'::jsonb,
    -- Whether this version is the currently active one
    is_active boolean NOT NULL DEFAULT true,
    -- Retention period in days (informational)
    retention_days integer NOT NULL DEFAULT 2555,  -- ~7 years
    -- Timestamps
    created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- Who created this version
    created_by text,

    -- Only one active version per purpose code
    CONSTRAINT uniq_purpose_code_version UNIQUE (code, version)
);

COMMENT ON TABLE public.purposes IS 'Versioned purpose definitions. Each purpose code can have multiple versions. Only the is_active=true version is presented to DPs for new consents.';
COMMENT ON COLUMN public.purposes.code IS 'Stable machine-readable identifier for this purpose (e.g., marketing, analytics, kyc)';
COMMENT ON COLUMN public.purposes.version IS 'Monotonic version number. New version created when description changes.';
COMMENT ON COLUMN public.purposes.legal_basis IS 'Legal basis: CONSENT, LEGITIMATE_USE, EMPLOYMENT, STATE_FUNCTION';
COMMENT ON COLUMN public.purposes.data_categories IS 'JSON array of data categories this purpose processes';

-- Ensure only one active version per code
CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_purpose_per_code
  ON public.purposes (code)
  WHERE is_active = true;

-- 2. Add optional purpose_id FK column to consents
--    Existing consents have NULL purpose_id (backward compatible)
ALTER TABLE public.consents
  ADD COLUMN IF NOT EXISTS purpose_id uuid REFERENCES public.purposes(purpose_id);

-- Index for joining
CREATE INDEX IF NOT EXISTS idx_consents_purpose_id
  ON public.consents (purpose_id)
  WHERE purpose_id IS NOT NULL;

-- 3. Seed initial purpose definitions from existing consent data
INSERT INTO public.purposes (code, version, name, description, legal_basis, data_categories)
SELECT DISTINCT
  LOWER(REPLACE(purpose, ' ', '_')),
  1,
  purpose,
  'Purpose: ' || purpose || ' (auto-generated from existing consents)',
  'CONSENT',
  '[]'::jsonb
FROM public.consents
WHERE purpose IS NOT NULL
ON CONFLICT (code, version) DO NOTHING;


-- ============================================================================
-- DOWN: Rollback changes (reference only)
-- ============================================================================
-- BEGIN DOWN

-- ALTER TABLE public.consents DROP COLUMN IF EXISTS purpose_id;
-- DROP INDEX IF EXISTS uniq_active_purpose_per_code;
-- DROP TABLE IF EXISTS public.purposes;

-- END DOWN
