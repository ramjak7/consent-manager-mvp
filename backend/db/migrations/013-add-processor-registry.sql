-- ============================================================================
-- Migration: 013-add-processor-registry
-- Description: Add data processor/vendor registry (DPDP Act §8(2))
-- Version: 1.0
-- Created: 2026-02-01
--
-- DPDP Act 2023 §8(2): "The Data Fiduciary shall engage, appoint, use
-- or otherwise involve a Data Processor to process personal data on its
-- behalf only under a valid contract."
--
-- This tracks which third-party processors handle personal data,
-- what purposes they serve, and their contractual status.
-- ============================================================================


-- ============================================================================
-- UP: Apply changes
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.processors (
    processor_id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    -- Organization name of the processor
    name text NOT NULL,
    -- Legal entity type
    entity_type text NOT NULL DEFAULT 'COMPANY'
      CHECK (entity_type IN ('COMPANY', 'INDIVIDUAL', 'GOVERNMENT', 'NGO')),
    -- Contact information
    contact_email text,
    contact_phone text,
    -- Registered address
    address text,
    country text NOT NULL DEFAULT 'IN',
    -- Data processing agreement (DPA) details
    dpa_signed boolean NOT NULL DEFAULT false,
    dpa_signed_date timestamp with time zone,
    dpa_expiry_date timestamp with time zone,
    -- Purposes this processor is authorized for (maps to purpose codes)
    authorized_purposes jsonb NOT NULL DEFAULT '[]'::jsonb,
    -- Data categories this processor can access
    authorized_data_categories jsonb NOT NULL DEFAULT '[]'::jsonb,
    -- Whether cross-border data transfer is involved
    cross_border_transfer boolean NOT NULL DEFAULT false,
    transfer_countries jsonb DEFAULT '[]'::jsonb,
    -- Processor status
    status text NOT NULL DEFAULT 'ACTIVE'
      CHECK (status IN ('ACTIVE', 'SUSPENDED', 'TERMINATED', 'PENDING_REVIEW')),
    -- Audit trail
    created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by text,
    -- Notes
    notes text
);

COMMENT ON TABLE public.processors IS 'Registry of Data Processors per DPDP §8(2). Tracks third-party vendors that process personal data on behalf of the Data Fiduciary.';
COMMENT ON COLUMN public.processors.authorized_purposes IS 'JSON array of purpose codes this processor is authorized to process data for';
COMMENT ON COLUMN public.processors.dpa_signed IS 'Whether a valid Data Processing Agreement is in place';
COMMENT ON COLUMN public.processors.cross_border_transfer IS 'Whether this processor transfers data outside India (DPDP §16)';

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_processors_status
  ON public.processors (status);

-- Link table: which processors are involved with which purposes
CREATE TABLE IF NOT EXISTS public.processor_purposes (
    processor_id uuid NOT NULL REFERENCES public.processors(processor_id) ON DELETE CASCADE,
    purpose_id uuid NOT NULL REFERENCES public.purposes(purpose_id) ON DELETE CASCADE,
    assigned_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    assigned_by text,
    PRIMARY KEY (processor_id, purpose_id)
);

COMMENT ON TABLE public.processor_purposes IS 'Many-to-many link between processors and purposes. Tracks which processors handle data for which purposes.';


-- ============================================================================
-- DOWN: Rollback changes (reference only)
-- ============================================================================
-- BEGIN DOWN

-- DROP TABLE IF EXISTS public.processor_purposes;
-- DROP INDEX IF EXISTS idx_processors_status;
-- DROP TABLE IF EXISTS public.processors;

-- END DOWN
