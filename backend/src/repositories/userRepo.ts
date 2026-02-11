import { pool } from "../db";

export type User = {
  userId: string;
  oauthSubject: string | null;
  oauthIssuer: string | null;
  email: string | null;
  name: string | null;
  isActive: boolean;
  isServiceAccount: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
  metadata: Record<string, any>;
};

export type Role = {
  roleId: string;
  roleName: string;
  description: string;
  isSystem: boolean;
};

export type Permission = {
  permissionName: string;
  resource: string;
  action: string;
};

/**
 * Find or create user from OAuth2 token claims
 */
export async function findOrCreateOAuthUser(params: {
  oauthSubject: string;
  oauthIssuer: string;
  email?: string;
  name?: string;
}): Promise<User> {
  const { oauthSubject, oauthIssuer, email, name } = params;

  // Try to find existing user
  const existingUser = await pool.query<User>(
    `SELECT user_id as "userId", oauth_subject as "oauthSubject", 
            oauth_issuer as "oauthIssuer", email, name, is_active as "isActive",
            is_service_account as "isServiceAccount", created_at as "createdAt",
            updated_at as "updatedAt", last_login_at as "lastLoginAt", metadata
     FROM users
     WHERE oauth_subject = $1 AND oauth_issuer = $2`,
    [oauthSubject, oauthIssuer]
  );

  if (existingUser.rows.length > 0) {
    // Update last login
    await pool.query(
      `UPDATE users SET last_login_at = NOW() WHERE user_id = $1`,
      [existingUser.rows[0].userId]
    );
    return existingUser.rows[0];
  }

  // Create new user
  const newUser = await pool.query<User>(
    `INSERT INTO users (oauth_subject, oauth_issuer, email, name)
     VALUES ($1, $2, $3, $4)
     RETURNING user_id as "userId", oauth_subject as "oauthSubject",
               oauth_issuer as "oauthIssuer", email, name, is_active as "isActive",
               is_service_account as "isServiceAccount", created_at as "createdAt",
               updated_at as "updatedAt", last_login_at as "lastLoginAt", metadata`,
    [oauthSubject, oauthIssuer, email || null, name || null]
  );

  return newUser.rows[0];
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<User | null> {
  const result = await pool.query<User>(
    `SELECT user_id as "userId", oauth_subject as "oauthSubject",
            oauth_issuer as "oauthIssuer", email, name, is_active as "isActive",
            is_service_account as "isServiceAccount", created_at as "createdAt",
            updated_at as "updatedAt", last_login_at as "lastLoginAt", metadata
     FROM users
     WHERE user_id = $1`,
    [userId]
  );

  return result.rows[0] || null;
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  const result = await pool.query<User>(
    `SELECT user_id as "userId", oauth_subject as "oauthSubject",
            oauth_issuer as "oauthIssuer", email, name, is_active as "isActive",
            is_service_account as "isServiceAccount", created_at as "createdAt",
            updated_at as "updatedAt", last_login_at as "lastLoginAt", metadata
     FROM users
     WHERE email = $1`,
    [email]
  );

  return result.rows[0] || null;
}

/**
 * Check if user has a specific permission
 */
export async function checkUserPermission(
  userId: string,
  permissionName: string
): Promise<boolean> {
  const result = await pool.query<{ has_permission: boolean }>(
    `SELECT check_user_permission($1, $2) as has_permission`,
    [userId, permissionName]
  );

  return result.rows[0]?.has_permission || false;
}

/**
 * Get all permissions for a user
 */
export async function getUserPermissions(userId: string): Promise<Permission[]> {
  const result = await pool.query<Permission>(
    `SELECT permission_name as "permissionName", resource, action
     FROM get_user_permissions($1)`,
    [userId]
  );

  return result.rows;
}

/**
 * Get all roles for a user
 */
export async function getUserRoles(userId: string): Promise<Role[]> {
  const result = await pool.query<Role>(
    `SELECT r.role_id as "roleId", r.role_name as "roleName",
            r.description, r.is_system as "isSystem"
     FROM get_user_roles($1) gr
     INNER JOIN roles r ON gr.role_name = r.role_name`,
    [userId]
  );

  return result.rows;
}

/**
 * Assign role to user
 */
export async function assignRoleToUser(params: {
  userId: string;
  roleId: string;
  assignedBy?: string;
  expiresAt?: Date;
}): Promise<void> {
  const { userId, roleId, assignedBy, expiresAt } = params;

  await pool.query(
    `INSERT INTO user_roles (user_id, role_id, assigned_by, expires_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, role_id) DO UPDATE
     SET assigned_by = EXCLUDED.assigned_by,
         expires_at = EXCLUDED.expires_at`,
    [userId, roleId, assignedBy || null, expiresAt || null]
  );
}

/**
 * Remove role from user
 */
export async function removeRoleFromUser(
  userId: string,
  roleId: string
): Promise<void> {
  await pool.query(
    `DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2`,
    [userId, roleId]
  );
}

/**
 * Get role by name
 */
export async function getRoleByName(roleName: string): Promise<Role | null> {
  const result = await pool.query<Role>(
    `SELECT role_id as "roleId", role_name as "roleName",
            description, is_system as "isSystem"
     FROM roles
     WHERE role_name = $1`,
    [roleName]
  );

  return result.rows[0] || null;
}

/**
 * Create service account (API client)
 */
export async function createServiceAccount(params: {
  email: string;
  name: string;
  metadata?: Record<string, any>;
}): Promise<User> {
  const { email, name, metadata } = params;

  const result = await pool.query<User>(
    `INSERT INTO users (email, name, is_service_account, metadata)
     VALUES ($1, $2, true, $3)
     RETURNING user_id as "userId", oauth_subject as "oauthSubject",
               oauth_issuer as "oauthIssuer", email, name, is_active as "isActive",
               is_service_account as "isServiceAccount", created_at as "createdAt",
               updated_at as "updatedAt", last_login_at as "lastLoginAt", metadata`,
    [email, name, metadata || {}]
  );

  return result.rows[0];
}

/**
 * Deactivate user account
 */
export async function deactivateUser(userId: string): Promise<void> {
  await pool.query(
    `UPDATE users SET is_active = false, updated_at = NOW() WHERE user_id = $1`,
    [userId]
  );
}

/**
 * Activate user account
 */
export async function activateUser(userId: string): Promise<void> {
  await pool.query(
    `UPDATE users SET is_active = true, updated_at = NOW() WHERE user_id = $1`,
    [userId]
  );
}
