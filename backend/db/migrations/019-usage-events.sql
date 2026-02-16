-- Migration 019: Usage Events table (Analytics & Billing Metering)
-- Tracks API usage per organization for analytics dashboards and billing

BEGIN;

CREATE TABLE IF NOT EXISTS usage_events (
    event_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
    event_type      TEXT NOT NULL,
    endpoint        TEXT,
    method          TEXT,
    status_code     INTEGER,
    response_time_ms INTEGER,
    user_id         TEXT,
    api_key_id      UUID,
    metadata        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_usage_events_org_created ON usage_events(org_id, created_at);
CREATE INDEX idx_usage_events_type ON usage_events(event_type);
CREATE INDEX idx_usage_events_org_type ON usage_events(org_id, event_type, created_at);

-- Aggregation helper view: daily usage summary per org
CREATE OR REPLACE VIEW usage_daily_summary AS
SELECT
    org_id,
    DATE(created_at) AS day,
    event_type,
    COUNT(*) AS event_count,
    AVG(response_time_ms)::INTEGER AS avg_response_ms,
    MAX(response_time_ms) AS max_response_ms
FROM usage_events
GROUP BY org_id, DATE(created_at), event_type;

COMMIT;
