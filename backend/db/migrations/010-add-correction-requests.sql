-- ============================================================================
-- Migration: 010-add-correction-requests
-- Description: Add correction_requests table for DPDP Act §11 compliance
-- Version: 1.0
-- Created: 2026-02-01
--
-- DPDP Act 2023, Section 11: Right to Correction and Erasure
-- "The Data Principal shall have the right to correction of inaccurate
--  or misleading personal data, completion of incomplete data, and
--  updating of personal data."
--
-- This table tracks correction requests submitted by Data Principals.
-- ============================================================================


-- ============================================================================
-- UP: Apply changes
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.correction_requests (
    request_id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id text NOT NULL,
    -- What data field(s) need correction
    field_name text NOT NULL,
    -- Current value (as known to DP)
    current_value text,
    -- Requested corrected value
    corrected_value text NOT NULL,
    -- Reason for correction
    reason text NOT NULL,
    -- Supporting evidence / notes
    additional_notes text,
    -- Workflow status
    status text NOT NULL DEFAULT 'PENDING'
      CHECK (status IN ('PENDING', 'IN_PROGRESS', 'APPROVED', 'REJECTED', 'COMPLETED')),
    -- Timestamps
    created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- Review/resolution fields
    reviewed_at timestamp with time zone,
    reviewer_id text,
    review_notes text,
    completed_at timestamp with time zone
);

COMMENT ON TABLE public.correction_requests IS 'DPDP §11 correction requests. Data Principals can request correction of inaccurate, incomplete, or outdated personal data.';
COMMENT ON COLUMN public.correction_requests.field_name IS 'Name of the data field to be corrected (e.g., name, email, phone, address)';
COMMENT ON COLUMN public.correction_requests.current_value IS 'Current value of the field as known to the Data Principal (optional)';
COMMENT ON COLUMN public.correction_requests.corrected_value IS 'Requested corrected/updated value';
COMMENT ON COLUMN public.correction_requests.reason IS 'Reason for correction: INACCURATE, INCOMPLETE, OUTDATED, MISLEADING';

-- Index for efficient user queries
CREATE INDEX IF NOT EXISTS idx_correction_requests_user_id
  ON public.correction_requests (user_id);

-- Index for admin filtering by status
CREATE INDEX IF NOT EXISTS idx_correction_requests_status
  ON public.correction_requests (status);


-- ============================================================================
-- DOWN: Rollback changes (reference only)
-- ============================================================================
-- BEGIN DOWN

-- DROP INDEX IF EXISTS idx_correction_requests_status;
-- DROP INDEX IF EXISTS idx_correction_requests_user_id;
-- DROP TABLE IF EXISTS public.correction_requests;

-- END DOWN
