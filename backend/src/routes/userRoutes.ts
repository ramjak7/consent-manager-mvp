import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate";
import { authenticateJWT, AuthenticatedRequest } from "../middleware/jwtAuth";
import { requirePermission, requireAllPermissions } from "../middleware/rbac";
import {
  getUserById,
  getUserPermissions,
  getUserRoles,
  assignRoleToUser,
  removeRoleFromUser,
  getRoleByName,
  createServiceAccount,
  deactivateUser,
  activateUser,
} from "../repositories/userRepo";
import { adminLimiter } from "../middleware/rateLimiter";

const router = Router();

// Schema for role assignment
const AssignRoleSchema = z.object({
  roleName: z.string().min(3).max(50),
  expiresAt: z.string().datetime().optional(),
});

// Schema for service account creation
const CreateServiceAccountSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  roleName: z.string().min(3).max(50),
  metadata: z.record(z.string(), z.any()).optional(),
});

/**
 * GET /users/me
 * Get current user profile
 */
router.get(
  "/users/me",
  authenticateJWT,
  async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await getUserById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const permissions = await getUserPermissions(req.user.userId);
    const roles = await getUserRoles(req.user.userId);

    res.json({
      user: {
        userId: user.userId,
        email: user.email,
        name: user.name,
        isActive: user.isActive,
        isServiceAccount: user.isServiceAccount,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      },
      roles: roles.map((r) => ({
        roleName: r.roleName,
        description: r.description,
      })),
      permissions: permissions.map((p) => ({
        permissionName: p.permissionName,
        resource: p.resource,
        action: p.action,
      })),
    });
  }
);

/**
 * GET /users/:id
 * Get user by ID (admin only)
 */
router.get(
  "/users/:id",
  adminLimiter,
  authenticateJWT,
  requirePermission("USER_READ"),
  async (req: AuthenticatedRequest, res) => {
    const userId = req.params.id;

    const user = await getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const permissions = await getUserPermissions(userId);
    const roles = await getUserRoles(userId);

    res.json({
      user: {
        userId: user.userId,
        email: user.email,
        name: user.name,
        isActive: user.isActive,
        isServiceAccount: user.isServiceAccount,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLoginAt: user.lastLoginAt,
      },
      roles: roles.map((r) => ({
        roleName: r.roleName,
        description: r.description,
      })),
      permissions: permissions.map((p) => ({
        permissionName: p.permissionName,
        resource: p.resource,
        action: p.action,
      })),
    });
  }
);

/**
 * POST /users/:id/roles
 * Assign role to user (admin only)
 */
router.post(
  "/users/:id/roles",
  adminLimiter,
  authenticateJWT,
  requirePermission("USER_ASSIGN_ROLE"),
  validate({ body: AssignRoleSchema }),
  async (req: AuthenticatedRequest, res) => {
    const userId = req.params.id;
    const { roleName, expiresAt } = req.body;

    // Check if user exists
    const user = await getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get role by name
    const role = await getRoleByName(roleName);
    if (!role) {
      return res.status(404).json({ error: `Role '${roleName}' not found` });
    }

    // Assign role
    await assignRoleToUser({
      userId,
      roleId: role.roleId,
      assignedBy: req.user?.userId,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    });

    res.json({
      message: `Role '${roleName}' assigned to user`,
      userId,
      roleName,
      expiresAt: expiresAt || null,
    });
  }
);

/**
 * DELETE /users/:id/roles/:roleName
 * Remove role from user (admin only)
 */
router.delete(
  "/users/:id/roles/:roleName",
  adminLimiter,
  authenticateJWT,
  requirePermission("USER_ASSIGN_ROLE"),
  async (req: AuthenticatedRequest, res) => {
    const userId = req.params.id;
    const roleName = req.params.roleName;

    // Get role by name
    const role = await getRoleByName(roleName);
    if (!role) {
      return res.status(404).json({ error: `Role '${roleName}' not found` });
    }

    // Remove role
    await removeRoleFromUser(userId, role.roleId);

    res.json({
      message: `Role '${roleName}' removed from user`,
      userId,
      roleName,
    });
  }
);

/**
 * POST /users/service-accounts
 * Create service account (super admin only)
 */
router.post(
  "/users/service-accounts",
  adminLimiter,
  authenticateJWT,
  requireAllPermissions(["USER_CREATE", "USER_ASSIGN_ROLE"]),
  validate({ body: CreateServiceAccountSchema }),
  async (req: AuthenticatedRequest, res) => {
    const { email, name, roleName, metadata } = req.body;

    // Create service account
    const user = await createServiceAccount({ email, name, metadata });

    // Assign role
    const role = await getRoleByName(roleName);
    if (!role) {
      return res.status(404).json({ error: `Role '${roleName}' not found` });
    }

    await assignRoleToUser({
      userId: user.userId,
      roleId: role.roleId,
      assignedBy: req.user?.userId,
    });

    res.status(201).json({
      message: "Service account created",
      user: {
        userId: user.userId,
        email: user.email,
        name: user.name,
        isServiceAccount: user.isServiceAccount,
        assignedRole: roleName,
      },
    });
  }
);

/**
 * POST /users/:id/deactivate
 * Deactivate user account (admin only)
 */
router.post(
  "/users/:id/deactivate",
  adminLimiter,
  authenticateJWT,
  requirePermission("USER_UPDATE"),
  async (req: AuthenticatedRequest, res) => {
    const userId = req.params.id;

    await deactivateUser(userId);

    res.json({
      message: "User deactivated",
      userId,
    });
  }
);

/**
 * POST /users/:id/activate
 * Activate user account (admin only)
 */
router.post(
  "/users/:id/activate",
  adminLimiter,
  authenticateJWT,
  requirePermission("USER_UPDATE"),
  async (req: AuthenticatedRequest, res) => {
    const userId = req.params.id;

    await activateUser(userId);

    res.json({
      message: "User activated",
      userId,
    });
  }
);

export default router;
