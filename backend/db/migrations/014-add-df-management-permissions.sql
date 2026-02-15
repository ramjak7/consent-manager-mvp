-- Migration 014: Add DF management permissions
-- Adds granular permissions for Data Fiduciary operations
-- and assigns them to the DF_CLIENT role

BEGIN;

-- Add new permissions for DF management operations
INSERT INTO permissions (permission_name, resource, action, description) VALUES
  ('ERASURE_MANAGE', 'erasure_request', 'manage', 'Review and manage erasure requests'),
  ('CORRECTION_MANAGE', 'correction_request', 'manage', 'Review and manage correction requests'),
  ('PURPOSE_READ', 'purpose', 'read', 'View purpose definitions and versions'),
  ('PURPOSE_MANAGE', 'purpose', 'manage', 'Create and update purpose definitions'),
  ('PROCESSOR_READ', 'processor', 'read', 'View registered processors'),
  ('PROCESSOR_MANAGE', 'processor', 'manage', 'Register and manage data processors'),
  ('CONSENT_READ_ALL', 'consent', 'read_all', 'Read all consents (admin view)')
ON CONFLICT (permission_name) DO NOTHING;

-- Grant DF management permissions to DF_CLIENT role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
CROSS JOIN permissions p
WHERE r.role_name = 'DF_CLIENT'
  AND p.permission_name IN (
    'ERASURE_MANAGE',
    'CORRECTION_MANAGE', 
    'PURPOSE_READ',
    'PURPOSE_MANAGE',
    'PROCESSOR_READ',
    'PROCESSOR_MANAGE',
    'CONSENT_READ_ALL',
    'AUDIT_READ'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Also grant these to ADMIN and SUPER_ADMIN roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
CROSS JOIN permissions p
WHERE r.role_name IN ('ADMIN', 'SUPER_ADMIN')
  AND p.permission_name IN (
    'ERASURE_MANAGE',
    'CORRECTION_MANAGE',
    'PURPOSE_READ',
    'PURPOSE_MANAGE',
    'PROCESSOR_READ',
    'PROCESSOR_MANAGE'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

COMMIT;
