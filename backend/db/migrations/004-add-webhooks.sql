-- ============================================================================
-- Migration: 004-add-webhooks
-- Description: Add webhook system for Data Fiduciary event notifications
-- Version: 1.0
-- Created: 2026-02-11
-- 
-- Implements P0-4: Webhook System
-- Reference: COMPREHENSIVE_AUDIT_REPORT.md Section B.4
-- 
-- This migration creates:
--   - webhooks table for DF webhook registration
--   - webhook_deliveries table for delivery tracking and retry logic
--   - Indexes for efficient lookup
-- ============================================================================


-- ============================================================================
-- TABLE: webhooks
-- Stores registered webhook endpoints for Data Fiduciaries
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.webhooks (
    webhook_id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    url text NOT NULL,
    events jsonb NOT NULL,
    secret text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb
);

COMMENT ON TABLE public.webhooks IS 'Registered webhook endpoints for event notifications to Data Fiduciaries';
COMMENT ON COLUMN public.webhooks.webhook_id IS 'Unique identifier for this webhook';
COMMENT ON COLUMN public.webhooks.name IS 'Human-readable name for the webhook';
COMMENT ON COLUMN public.webhooks.url IS 'HTTPS endpoint URL to receive webhook events';
COMMENT ON COLUMN public.webhooks.events IS 'Array of event types this webhook subscribes to (e.g., ["CONSENT_REVOKED", "CONSENT_EXPIRED"])';
COMMENT ON COLUMN public.webhooks.secret IS 'Shared secret for HMAC-SHA256 signature verification';
COMMENT ON COLUMN public.webhooks.active IS 'Whether this webhook is currently active';
COMMENT ON COLUMN public.webhooks.metadata IS 'Additional metadata (contact info, description, etc.)';


-- ============================================================================
-- TABLE: webhook_deliveries
-- Tracks webhook delivery attempts with retry logic
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
    delivery_id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id uuid NOT NULL REFERENCES public.webhooks(webhook_id) ON DELETE CASCADE,
    event_type text NOT NULL,
    payload jsonb NOT NULL,
    status text NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    last_attempt_at timestamp with time zone,
    next_retry_at timestamp with time zone,
    response_status integer,
    response_body text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    delivered_at timestamp with time zone,
    CONSTRAINT valid_status CHECK (status IN ('PENDING', 'DELIVERED', 'FAILED', 'CANCELLED'))
);

COMMENT ON TABLE public.webhook_deliveries IS 'Tracks webhook delivery attempts with retry logic and failure tracking';
COMMENT ON COLUMN public.webhook_deliveries.delivery_id IS 'Unique identifier for this delivery attempt';
COMMENT ON COLUMN public.webhook_deliveries.webhook_id IS 'Reference to the webhook being invoked';
COMMENT ON COLUMN public.webhook_deliveries.event_type IS 'Type of event being delivered (CONSENT_REVOKED, etc.)';
COMMENT ON COLUMN public.webhook_deliveries.payload IS 'JSON payload sent to webhook';
COMMENT ON COLUMN public.webhook_deliveries.status IS 'Delivery status: PENDING, DELIVERED, FAILED, CANCELLED';
COMMENT ON COLUMN public.webhook_deliveries.attempts IS 'Number of delivery attempts made';
COMMENT ON COLUMN public.webhook_deliveries.last_attempt_at IS 'Timestamp of most recent delivery attempt';
COMMENT ON COLUMN public.webhook_deliveries.next_retry_at IS 'Timestamp for next retry attempt (exponential backoff)';
COMMENT ON COLUMN public.webhook_deliveries.response_status IS 'HTTP status code from webhook endpoint';
COMMENT ON COLUMN public.webhook_deliveries.response_body IS 'Response body from webhook endpoint (truncated to 1KB)';


-- ============================================================================
-- INDEXES
-- ============================================================================

-- Lookup webhooks by active status
CREATE INDEX IF NOT EXISTS idx_webhooks_active 
    ON public.webhooks (active) 
    WHERE active = true;

-- Lookup delivery attempts needing retry
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_retry 
    ON public.webhook_deliveries (next_retry_at, status) 
    WHERE status = 'PENDING' AND next_retry_at IS NOT NULL;

-- Lookup deliveries by webhook
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_id 
    ON public.webhook_deliveries (webhook_id, created_at DESC);

-- Lookup deliveries by status
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status 
    ON public.webhook_deliveries (status, created_at DESC);


-- ============================================================================
-- DOWN: Rollback changes
-- ============================================================================
-- This section is executed when rolling back the migration
-- BEGIN DOWN

-- DROP INDEX IF EXISTS idx_webhook_deliveries_status;
-- DROP INDEX IF EXISTS idx_webhook_deliveries_webhook_id;
-- DROP INDEX IF EXISTS idx_webhook_deliveries_retry;
-- DROP INDEX IF EXISTS idx_webhooks_active;
-- DROP TABLE IF EXISTS public.webhook_deliveries;
-- DROP TABLE IF EXISTS public.webhooks;

-- END DOWN
