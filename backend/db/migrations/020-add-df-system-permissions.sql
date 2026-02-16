-- Migration 020: Add system permissions to DF_CLIENT role
-- Fixes 403 errors on /df/organization, /df/api-keys, /df/sso, /df/usage pages
-- DF_CLIENT needs SYSTEM_CONFIG and SYSTEM_MONITOR to access admin features

BEGIN;

-- Grant SYSTEM_CONFIG and SYSTEM_MONITOR to DF_CLIENT role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
CROSS JOIN permissions p
WHERE r.role_name = 'DF_CLIENT'
  AND p.permission_name IN (
    'SYSTEM_CONFIG',
    'SYSTEM_MONITOR'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

COMMIT;
