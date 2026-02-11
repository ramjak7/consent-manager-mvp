-- ============================================================================
-- Migration: 007-add-erasure-requests
-- Description: Add erasure_requests table for DPDP Section 12(1) compliance
-- Version: 1.0
-- Created: 2026-02-11
-- ============================================================================

-- ============================================================================
-- UP: Apply changes
-- ============================================================================

-- TABLE: erasure_requests
-- Tracks data subject requests for erasure (right to be forgotten)
CREATE TABLE IF NOT EXISTS public.erasure_requests (
    request_id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text NOT NULL,
    reason text NOT NULL,
    additional_notes text,
    status text NOT NULL DEFAULT 'PENDING',
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    reviewed_at timestamp without time zone,
    reviewer_id text,
    review_notes text,
    completed_at timestamp without time zone,
    CONSTRAINT erasure_requests_status_check CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED'))
);

COMMENT ON TABLE public.erasure_requests IS 'Tracks data subject erasure requests (DPDP Section 12(1) - Right to erasure)';
COMMENT ON COLUMN public.erasure_requests.request_id IS 'Unique identifier for this erasure request';
COMMENT ON COLUMN public.erasure_requests.user_id IS 'Data principal identifier requesting erasure';
COMMENT ON COLUMN public.erasure_requests.reason IS 'Reason for erasure request';
COMMENT ON COLUMN public.erasure_requests.additional_notes IS 'Optional additional context from the data principal';
COMMENT ON COLUMN public.erasure_requests.status IS 'PENDING | IN_PROGRESS | COMPLETED | REJECTED';
COMMENT ON COLUMN public.erasure_requests.created_at IS 'When the request was submitted';
COMMENT ON COLUMN public.erasure_requests.updated_at IS 'Last status change timestamp';
COMMENT ON COLUMN public.erasure_requests.reviewed_at IS 'When request was reviewed by admin';
COMMENT ON COLUMN public.erasure_requests.reviewer_id IS 'Admin/staff who reviewed the request';
COMMENT ON COLUMN public.erasure_requests.review_notes IS 'Admin notes (e.g., rejection reason, retention obligations)';
COMMENT ON COLUMN public.erasure_requests.completed_at IS 'When erasure was completed';

-- Index for efficient user lookups
CREATE INDEX IF NOT EXISTS idx_erasure_requests_user_id 
    ON public.erasure_requests (user_id);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_erasure_requests_status 
    ON public.erasure_requests (status);

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_erasure_requests_created_at 
    ON public.erasure_requests (created_at DESC);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_erasure_request_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at on any UPDATE
DROP TRIGGER IF EXISTS erasure_request_updated_at ON public.erasure_requests;
CREATE TRIGGER erasure_request_updated_at
    BEFORE UPDATE ON public.erasure_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.update_erasure_request_timestamp();

-- ============================================================================
-- DOWN: Rollback changes
-- ============================================================================
-- BEGIN DOWN

-- DROP TRIGGER IF EXISTS erasure_request_updated_at ON public.erasure_requests;
-- DROP FUNCTION IF EXISTS public.update_erasure_request_timestamp();
-- DROP INDEX IF EXISTS idx_erasure_requests_created_at;
-- DROP INDEX IF EXISTS idx_erasure_requests_status;
-- DROP INDEX IF EXISTS idx_erasure_requests_user_id;
-- DROP TABLE IF EXISTS public.erasure_requests;

-- END DOWN
