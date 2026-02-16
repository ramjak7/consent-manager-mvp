-- Migration 018: SAML/SSO Configuration table
-- Stores per-organization SAML IdP settings for enterprise SSO

BEGIN;

CREATE TABLE IF NOT EXISTS saml_configs (
    config_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id              UUID NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE UNIQUE,
    idp_entity_id       TEXT NOT NULL,
    idp_sso_url         TEXT NOT NULL,
    idp_slo_url         TEXT,
    idp_certificate     TEXT NOT NULL,
    sp_entity_id        TEXT,
    name_id_format      TEXT DEFAULT 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
    attribute_mapping   JSONB NOT NULL DEFAULT '{"email": "email", "name": "displayName"}',
    auto_provision      BOOLEAN NOT NULL DEFAULT TRUE,
    default_role        TEXT DEFAULT 'DF_CLIENT',
    allowed_domains     JSONB NOT NULL DEFAULT '[]',
    is_active           BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_saml_configs_org_id ON saml_configs(org_id);

COMMIT;
