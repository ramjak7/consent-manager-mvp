-- Migration 016: Multi-tenancy — Add org_id to existing tables
-- Adds org_id column to all data tables, backfills with default org, adds indexes

BEGIN;

-- Default org ID for backfill
DO $$ BEGIN RAISE NOTICE 'Adding org_id to existing tables...'; END $$;

-- ============================================================
-- 1. Add org_id to consents
-- ============================================================
ALTER TABLE consents
    ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(org_id);

UPDATE consents SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;

ALTER TABLE consents ALTER COLUMN org_id SET DEFAULT '00000000-0000-0000-0000-000000000001';

CREATE INDEX IF NOT EXISTS idx_consents_org_id ON consents(org_id);

-- ============================================================
-- 2. Add org_id to audit_logs
-- ============================================================
-- audit_logs has a no-update trigger, so we must disable it first
ALTER TABLE audit_logs
    ADD COLUMN IF NOT EXISTS org_id UUID;

-- Temporarily disable immutability trigger for backfill
ALTER TABLE public.audit_logs DISABLE TRIGGER audit_no_update;

UPDATE audit_logs SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;

ALTER TABLE audit_logs ALTER COLUMN org_id SET DEFAULT '00000000-0000-0000-0000-000000000001';

-- Re-enable immutability trigger
ALTER TABLE public.audit_logs ENABLE TRIGGER audit_no_update;

CREATE INDEX IF NOT EXISTS idx_audit_logs_org_id ON audit_logs(org_id);

-- ============================================================
-- 3. Add org_id to erasure_requests
-- ============================================================
ALTER TABLE erasure_requests
    ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(org_id);

UPDATE erasure_requests SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;

ALTER TABLE erasure_requests ALTER COLUMN org_id SET DEFAULT '00000000-0000-0000-0000-000000000001';

CREATE INDEX IF NOT EXISTS idx_erasure_requests_org_id ON erasure_requests(org_id);

-- ============================================================
-- 4. Add org_id to correction_requests
-- ============================================================
ALTER TABLE correction_requests
    ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(org_id);

UPDATE correction_requests SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;

ALTER TABLE correction_requests ALTER COLUMN org_id SET DEFAULT '00000000-0000-0000-0000-000000000001';

CREATE INDEX IF NOT EXISTS idx_correction_requests_org_id ON correction_requests(org_id);

-- ============================================================
-- 5. Add org_id to purposes
-- ============================================================
ALTER TABLE purposes
    ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(org_id);

UPDATE purposes SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;

ALTER TABLE purposes ALTER COLUMN org_id SET DEFAULT '00000000-0000-0000-0000-000000000001';

CREATE INDEX IF NOT EXISTS idx_purposes_org_id ON purposes(org_id);

-- ============================================================
-- 6. Add org_id to processors
-- ============================================================
ALTER TABLE processors
    ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(org_id);

UPDATE processors SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;

ALTER TABLE processors ALTER COLUMN org_id SET DEFAULT '00000000-0000-0000-0000-000000000001';

CREATE INDEX IF NOT EXISTS idx_processors_org_id ON processors(org_id);

-- ============================================================
-- 7. Add org_id to webhooks
-- ============================================================
ALTER TABLE webhooks
    ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(org_id);

UPDATE webhooks SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;

ALTER TABLE webhooks ALTER COLUMN org_id SET DEFAULT '00000000-0000-0000-0000-000000000001';

CREATE INDEX IF NOT EXISTS idx_webhooks_org_id ON webhooks(org_id);

-- ============================================================
-- 8. Add org_id to users
-- ============================================================
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(org_id);

UPDATE users SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;

ALTER TABLE users ALTER COLUMN org_id SET DEFAULT '00000000-0000-0000-0000-000000000001';

CREATE INDEX IF NOT EXISTS idx_users_org_id ON users(org_id);

COMMIT;
