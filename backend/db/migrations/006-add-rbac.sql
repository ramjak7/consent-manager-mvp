-- ============================================================================
-- Migration: 006-add-rbac
-- Description: Add Role-Based Access Control (RBAC) schema
-- Version: 1.0
-- Created: 2026-02-11
-- 
-- Implements P0-5: OAuth2 + RBAC
-- Reference: docs/OAUTH2_AND_RBAC.md, COMPREHENSIVE_AUDIT_REPORT.md Section B.5
-- 
-- This migration creates:
--   - roles table (predefined system roles)
--   - permissions table (granular action permissions)
--   - role_permissions table (many-to-many mapping)
---- users table (OAuth2 user identities)
--   - user_roles table (user role assignments)
--   - Indexes for efficient authorization queries
-- 
-- Roles defined:
--   - SUPER_ADMIN: Full system access
--   - ADMIN: Administrative operations (force expire, manage users)
--   - AUDITOR: Read-only audit log access
--   - OPERATOR: Daily operations (approve/reject consents)
--   - DF_CLIENT: Data Fiduciary API access (create consents, process requests)
--   - DP_USER: Data Principal (view/revoke own consents)
-- ============================================================================


-- ============================================================================
-- UP: Apply changes
-- ============================================================================

-- ============================================================================
-- TABLE: roles
-- Predefined system roles for RBAC
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.roles (
    role_id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    role_name text NOT NULL UNIQUE,
    description text NOT NULL,
    is_system boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT role_name_length CHECK (length(role_name) >= 3 AND length(role_name) <= 50)
);

COMMENT ON TABLE public.roles IS 'System roles for RBAC authorization';
COMMENT ON COLUMN public.roles.role_id IS 'Unique identifier for this role';
COMMENT ON COLUMN public.roles.role_name IS 'Unique role name (e.g., ADMIN, AUDITOR, OPERATOR)';
COMMENT ON COLUMN public.roles.description IS 'Human-readable description of role responsibilities';
COMMENT ON COLUMN public.roles.is_system IS 'Whether this is a system-defined role (cannot be deleted)';

-- ============================================================================
-- TABLE: permissions
-- Granular action permissions
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.permissions (
    permission_id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    permission_name text NOT NULL UNIQUE,
    resource text NOT NULL,
    action text NOT NULL,
    description text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT permission_name_format CHECK (permission_name ~ '^[A-Z_]+$'),
    CONSTRAINT unique_resource_action UNIQUE (resource, action)
);

COMMENT ON TABLE public.permissions IS 'Granular permissions for resource-action pairs';
COMMENT ON COLUMN public.permissions.permission_name IS 'Unique permission identifier (e.g., CONSENT_CREATE, AUDIT_READ)';
COMMENT ON COLUMN public.permissions.resource IS 'Resource type (e.g., consent, audit, user, webhook)';
COMMENT ON COLUMN public.permissions.action IS 'Action name (e.g., create, read, update, delete, approve, revoke, export)';

-- ============================================================================
-- TABLE: role_permissions
-- Many-to-many mapping of roles to permissions
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.role_permissions (
    role_id uuid NOT NULL REFERENCES public.roles(role_id) ON DELETE CASCADE,
    permission_id uuid NOT NULL REFERENCES public.permissions(permission_id) ON DELETE CASCADE,
    granted_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY (role_id, permission_id)
);

COMMENT ON TABLE public.role_permissions IS 'Mapping of roles to their granted permissions';

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON public.role_permissions (role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON public.role_permissions (permission_id);

-- ============================================================================
-- TABLE: users
-- OAuth2 user identities and authentication
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.users (
    user_id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    oauth_subject text UNIQUE,
    oauth_issuer text,
    email text UNIQUE,
    name text,
    is_active boolean DEFAULT true NOT NULL,
    is_service_account boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_login_at timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT email_format CHECK (email ~ '^[^@]+@[^@]+\.[^@]+$' OR email IS NULL),
    CONSTRAINT oauth_complete CHECK (
        (oauth_subject IS NOT NULL AND oauth_issuer IS NOT NULL) 
        OR 
        (oauth_subject IS NULL AND oauth_issuer IS NULL)
    )
);

COMMENT ON TABLE public.users IS 'User accounts for authentication and authorization';
COMMENT ON COLUMN public.users.user_id IS 'Internal unique user identifier';
COMMENT ON COLUMN public.users.oauth_subject IS 'OAuth2 subject claim (sub) from ID token';
COMMENT ON COLUMN public.users.oauth_issuer IS 'OAuth2 issuer (iss) from ID token';
COMMENT ON COLUMN public.users.email IS 'User email address';
COMMENT ON COLUMN public.users.name IS 'User display name';
COMMENT ON COLUMN public.users.is_active IS 'Whether user account is active (can authenticate)';
COMMENT ON COLUMN public.users.is_service_account IS 'Whether this is a service account (API client)';
COMMENT ON COLUMN public.users.metadata IS 'Additional user metadata (department, team, etc.)';

CREATE INDEX IF NOT EXISTS idx_users_oauth ON public.users (oauth_subject, oauth_issuer);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_active ON public.users (is_active) WHERE is_active = true;

-- ============================================================================
-- TABLE: user_roles
-- User role assignments
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_roles (
    user_id uuid NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    role_id uuid NOT NULL REFERENCES public.roles(role_id) ON DELETE CASCADE,
    assigned_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    assigned_by uuid REFERENCES public.users(user_id),
    expires_at timestamp with time zone,
    PRIMARY KEY (user_id, role_id)
);

COMMENT ON TABLE public.user_roles IS 'User role assignments with optional expiration';
COMMENT ON COLUMN public.user_roles.assigned_by IS 'User who assigned this role (audit trail)';
COMMENT ON COLUMN public.user_roles.expires_at IS 'Optional expiration timestamp for temporary role grants';

CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles (role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_expiration ON public.user_roles (expires_at) 
    WHERE expires_at IS NOT NULL;

-- ============================================================================
-- SEED DATA: Roles
-- ============================================================================

INSERT INTO public.roles (role_name, description, is_system) VALUES
    ('SUPER_ADMIN', 'Full system access including user management and configuration', true),
    ('ADMIN', 'Administrative operations: force expire consents, manage webhooks, view all data', true),
    ('AUDITOR', 'Read-only access to audit logs and consent history for compliance review', true),
    ('OPERATOR', 'Daily operations: approve/reject consent requests, manage processing', true),
    ('DF_CLIENT', 'Data Fiduciary API client: create consents, validate processing requests', true),
    ('DP_USER', 'Data Principal: view and revoke own consents via dashboard', true)
ON CONFLICT (role_name) DO NOTHING;

-- ============================================================================
-- SEED DATA: Permissions
-- ============================================================================

INSERT INTO public.permissions (permission_name, resource, action, description) VALUES
    -- Consent permissions
    ('CONSENT_CREATE', 'consent', 'create', 'Create new consent requests'),
    ('CONSENT_READ', 'consent', 'read', 'Read consent details'),
    ('CONSENT_READ_ALL', 'consent', 'read_all', 'Read all consents (cross-user)'),
    ('CONSENT_APPROVE', 'consent', 'approve', 'Approve pending consent requests'),
    ('CONSENT_REJECT', 'consent', 'reject', 'Reject pending consent requests'),
    ('CONSENT_REVOKE', 'consent', 'revoke', 'Revoke active consents'),
    ('CONSENT_REVOKE_ANY', 'consent', 'revoke_any', 'Revoke any user''s consent (admin)'),
    ('CONSENT_FORCE_EXPIRE', 'consent', 'force_expire', 'Administratively expire consents'),
    ('CONSENT_EXPORT', 'consent', 'export', 'Export consent receipts'),
    
    -- Processing permissions
    ('PROCESSING_VALIDATE', 'processing', 'validate', 'Validate processing requests against consents'),
    
    -- Audit permissions
    ('AUDIT_READ', 'audit', 'read', 'Read audit logs'),
    ('AUDIT_EXPORT', 'audit', 'export', 'Export audit logs for compliance'),
    
    -- User management permissions
    ('USER_CREATE', 'user', 'create', 'Create new user accounts'),
    ('USER_READ', 'user', 'read', 'Read user account details'),
    ('USER_UPDATE', 'user', 'update', 'Update user account details'),
    ('USER_DELETE', 'user', 'delete', 'Delete/deactivate user accounts'),
    ('USER_ASSIGN_ROLE', 'user', 'assign_role', 'Assign roles to users'),
    
    -- Role management permissions
    ('ROLE_CREATE', 'role', 'create', 'Create custom roles'),
    ('ROLE_READ', 'role', 'read', 'Read role definitions'),
    ('ROLE_UPDATE', 'role', 'update', 'Update role definitions'),
    ('ROLE_DELETE', 'role', 'delete', 'Delete custom roles'),
    
    -- Webhook permissions
    ('WEBHOOK_CREATE', 'webhook', 'create', 'Register webhook endpoints'),
    ('WEBHOOK_READ', 'webhook', 'read', 'Read webhook configurations'),
    ('WEBHOOK_UPDATE', 'webhook', 'update', 'Update webhook configurations'),
    ('WEBHOOK_DELETE', 'webhook', 'delete', 'Delete webhook registrations'),
    
    -- System permissions
    ('SYSTEM_CONFIG', 'system', 'configure', 'Modify system configuration'),
    ('SYSTEM_MONITOR', 'system', 'monitor', 'Access system metrics and monitoring')
ON CONFLICT (permission_name) DO NOTHING;

-- ============================================================================
-- SEED DATA: Role Permissions Mapping
-- ============================================================================

-- SUPER_ADMIN: All permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.role_name = 'SUPER_ADMIN'
ON CONFLICT DO NOTHING;

-- ADMIN: Administrative permissions (no user management)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.role_name = 'ADMIN'
  AND p.permission_name IN (
      'CONSENT_READ_ALL', 'CONSENT_FORCE_EXPIRE', 'CONSENT_EXPORT', 'CONSENT_REVOKE_ANY',
      'AUDIT_READ', 'AUDIT_EXPORT',
      'WEBHOOK_CREATE', 'WEBHOOK_READ', 'WEBHOOK_UPDATE', 'WEBHOOK_DELETE',
      'SYSTEM_MONITOR'
  )
ON CONFLICT DO NOTHING;

-- AUDITOR: Read-only audit and consent access
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.role_name = 'AUDITOR'
  AND p.permission_name IN (
      'CONSENT_READ_ALL', 'CONSENT_EXPORT',
      'AUDIT_READ', 'AUDIT_EXPORT',
      'WEBHOOK_READ'
  )
ON CONFLICT DO NOTHING;

-- OPERATOR: Daily consent operations
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.role_name = 'OPERATOR'
  AND p.permission_name IN (
      'CONSENT_READ', 'CONSENT_APPROVE', 'CONSENT_REJECT', 'CONSENT_EXPORT',
      'PROCESSING_VALIDATE'
  )
ON CONFLICT DO NOTHING;

-- DF_CLIENT: Data Fiduciary API operations
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.role_name = 'DF_CLIENT'
  AND p.permission_name IN (
      'CONSENT_CREATE', 'CONSENT_READ',
      'PROCESSING_VALIDATE',
      'WEBHOOK_CREATE', 'WEBHOOK_READ', 'WEBHOOK_UPDATE', 'WEBHOOK_DELETE'
  )
ON CONFLICT DO NOTHING;

-- DP_USER: Data Principal self-service
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.role_name = 'DP_USER'
  AND p.permission_name IN (
      'CONSENT_READ', 'CONSENT_REVOKE', 'CONSENT_EXPORT'
  )
ON CONFLICT DO NOTHING;

-- ============================================================================
-- FUNCTION: check_user_permission
-- Check if a user has a specific permission
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_user_permission(
    p_user_id uuid,
    p_permission_name text
) RETURNS boolean AS $$
DECLARE
    has_permission boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles ur
        INNER JOIN public.role_permissions rp ON ur.role_id = rp.role_id
        INNER JOIN public.permissions p ON rp.permission_id = p.permission_id
        INNER JOIN public.users u ON ur.user_id = u.user_id
        WHERE ur.user_id = p_user_id
          AND p.permission_name = p_permission_name
          AND u.is_active = true
          AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
    ) INTO has_permission;
    
    RETURN COALESCE(has_permission, false);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.check_user_permission(uuid, text) 
IS 'Check if user has specific permission considering active status and role expiration';

-- ============================================================================
-- FUNCTION: get_user_permissions
-- Get all permissions for a user
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_permissions(p_user_id uuid)
RETURNS TABLE (
    permission_name text,
    resource text,
    action text
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT p.permission_name, p.resource, p.action
    FROM public.user_roles ur
    INNER JOIN public.role_permissions rp ON ur.role_id = rp.role_id
    INNER JOIN public.permissions p ON rp.permission_id = p.permission_id
    INNER JOIN public.users u ON ur.user_id = u.user_id
    WHERE ur.user_id = p_user_id
      AND u.is_active = true
      AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
    ORDER BY p.permission_name;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.get_user_permissions(uuid) 
IS 'Get all active permissions for a user';

-- ============================================================================
-- FUNCTION: get_user_roles
-- Get all roles for a user
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_roles(p_user_id uuid)
RETURNS TABLE (
    role_name text,
    description text,
    assigned_at timestamp with time zone,
    expires_at timestamp with time zone
) AS $$
BEGIN
    RETURN QUERY
    SELECT r.role_name, r.description, ur.assigned_at, ur.expires_at
    FROM public.user_roles ur
    INNER JOIN public.roles r ON ur.role_id = r.role_id
    INNER JOIN public.users u ON ur.user_id = u.user_id
    WHERE ur.user_id = p_user_id
      AND u.is_active = true
      AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
    ORDER BY r.role_name;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.get_user_roles(uuid) 
IS 'Get all active roles for a user';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.roles TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.permissions TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.role_permissions TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.users TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_roles TO postgres;

GRANT EXECUTE ON FUNCTION public.check_user_permission(uuid, text) TO postgres;
GRANT EXECUTE ON FUNCTION public.get_user_permissions(uuid) TO postgres;
GRANT EXECUTE ON FUNCTION public.get_user_roles(uuid) TO postgres;

-- ============================================================================
-- DOWN: Rollback changes
-- ============================================================================
-- This section is executed when rolling back the migration
-- BEGIN DOWN

-- DROP FUNCTION IF EXISTS public.get_user_roles(uuid);
-- DROP FUNCTION IF EXISTS public.get_user_permissions(uuid);
-- DROP FUNCTION IF EXISTS public.check_user_permission(uuid, text);
-- DROP INDEX IF EXISTS idx_user_roles_expiration;
-- DROP INDEX IF EXISTS idx_user_roles_role;
-- DROP INDEX IF EXISTS idx_user_roles_user;
-- DROP TABLE IF EXISTS public.user_roles;
-- DROP INDEX IF EXISTS idx_users_active;
-- DROP INDEX IF EXISTS idx_users_email;
-- DROP INDEX IF EXISTS idx_users_oauth;
-- DROP TABLE IF EXISTS public.users;
-- DROP INDEX IF EXISTS idx_role_permissions_permission;
-- DROP INDEX IF EXISTS idx_role_permissions_role;
-- DROP TABLE IF EXISTS public.role_permissions;
-- DROP TABLE IF EXISTS public.permissions;
-- DROP TABLE IF EXISTS public.roles;

-- END DOWN

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration 006: RBAC Schema';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Status: COMPLETE';
    RAISE NOTICE '';
    RAISE NOTICE 'Created tables:';
    RAISE NOTICE '  - roles (6 system roles)';
    RAISE NOTICE '  - permissions (27 granular permissions)';
    RAISE NOTICE '  - role_permissions (role→permission mappings)';
    RAISE NOTICE '  - users (OAuth2 user identities)';
    RAISE NOTICE '  - user_roles (user→role assignments)';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Configure OAuth2 provider (Keycloak/Auth0)';
    RAISE NOTICE '2. Update authentication middleware to use JWT';
    RAISE NOTICE '3. Create initial admin user';
    RAISE NOTICE '4. Test authorization with role checks';
    RAISE NOTICE '';
    RAISE NOTICE 'See: docs/OAUTH2_AND_RBAC.md';
    RAISE NOTICE '========================================';
END;
$$;
