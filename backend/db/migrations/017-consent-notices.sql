-- Migration 017: Consent Notices table (Notice Builder)
-- Supports multilingual consent notices with versioning

BEGIN;

CREATE TABLE IF NOT EXISTS consent_notices (
    notice_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
    title           TEXT NOT NULL,
    slug            TEXT NOT NULL,
    version         INTEGER NOT NULL DEFAULT 1,
    description     TEXT,
    content         JSONB NOT NULL DEFAULT '{}',
    purposes        JSONB NOT NULL DEFAULT '[]',
    data_categories JSONB NOT NULL DEFAULT '[]',
    retention_days  INTEGER DEFAULT 2555,
    status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','published','archived')),
    published_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by      TEXT,
    UNIQUE(org_id, slug, version)
);

CREATE INDEX idx_consent_notices_org_id ON consent_notices(org_id);
CREATE INDEX idx_consent_notices_status ON consent_notices(status);
CREATE INDEX idx_consent_notices_slug ON consent_notices(org_id, slug);

COMMIT;
