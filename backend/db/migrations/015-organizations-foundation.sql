-- Migration 015: Organizations Foundation
-- Creates organizations, org_branding, and api_keys tables
-- Foundation for multi-tenancy, white-labeling, and API key authentication

BEGIN;

-- ============================================================
-- 1. Organizations table
-- ============================================================
CREATE TABLE IF NOT EXISTS organizations (
    org_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    slug            TEXT NOT NULL UNIQUE,
    display_name    TEXT,
    domain          TEXT,
    plan            TEXT NOT NULL DEFAULT 'free'
                    CHECK (plan IN ('free','starter','professional','enterprise')),
    status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','suspended','deactivated')),
    settings        JSONB NOT NULL DEFAULT '{}',
    max_api_keys    INTEGER NOT NULL DEFAULT 5,
    max_users       INTEGER NOT NULL DEFAULT 10,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by      TEXT
);

CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_status ON organizations(status);

-- ============================================================
-- 2. Organization Branding table (white-label support)
-- ============================================================
CREATE TABLE IF NOT EXISTS org_branding (
    org_id              UUID PRIMARY KEY REFERENCES organizations(org_id) ON DELETE CASCADE,
    logo_url            TEXT,
    favicon_url         TEXT,
    primary_color       TEXT DEFAULT '#4F46E5',
    secondary_color     TEXT DEFAULT '#7C3AED',
    accent_color        TEXT DEFAULT '#06B6D4',
    font_family         TEXT DEFAULT 'Inter, system-ui, sans-serif',
    custom_css          TEXT,
    portal_title        TEXT,
    support_email       TEXT,
    privacy_policy_url  TEXT,
    terms_url           TEXT,
    footer_text         TEXT,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 3. API Keys table (per-organization API authentication)
-- ============================================================
CREATE TABLE IF NOT EXISTS api_keys (
    key_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      UUID NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    key_prefix  TEXT NOT NULL,
    key_hash    TEXT NOT NULL,
    scopes      JSONB NOT NULL DEFAULT '["consent:read","consent:write","processing:validate"]',
    rate_limit  INTEGER NOT NULL DEFAULT 1000,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    last_used_at TIMESTAMPTZ,
    expires_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by  TEXT,
    metadata    JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX idx_api_keys_org_id ON api_keys(org_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);

-- ============================================================
-- 4. Seed default organization
-- ============================================================
INSERT INTO organizations (org_id, name, slug, display_name, plan, status, settings)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Default Organization',
    'default',
    'Consent Manager Platform',
    'enterprise',
    'active',
    '{"is_default": true}'::jsonb
) ON CONFLICT (slug) DO NOTHING;

-- Seed default branding
INSERT INTO org_branding (org_id, portal_title, primary_color)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Consent Manager',
    '#4F46E5'
) ON CONFLICT (org_id) DO NOTHING;

COMMIT;
