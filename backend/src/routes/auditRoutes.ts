/**
 * Audit Routes
 * Endpoints for audit log access (admin + user activity log)
 * 
 * Phase 1 fixes applied:
 * - P1-4: Activity log now uses SQL-level filtering (was O(n) in-memory)
 * - All routes use JWT authentication
 */

import { Router } from "express";
import { authenticateJWT, AuthenticatedRequest } from "../middleware/jwtAuth";
import { requirePermission } from "../middleware/rbac";
import { adminLimiter } from "../middleware/rateLimiter";
import { getAllAuditLogs, getAuditLogsByUserId } from "../repositories/auditRepo";

const router = Router();

/**
 * GET /audit
 * Get all audit logs (Admin only - requires AUDIT_READ permission)
 * Supports pagination via ?page=1&limit=100
 */
router.get(
  "/audit",
  adminLimiter,
  authenticateJWT,
  requirePermission("AUDIT_READ"),
  async (req: any, res: any) => {
    const hasPage = typeof req.query.page !== "undefined";
    const hasLimit = typeof req.query.limit !== "undefined";
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(1000, Math.max(1, Number(req.query.limit) || 100));
    const logs = await getAllAuditLogs();

    if (!hasPage && !hasLimit) {
      return res.json(logs);
    }

    const total = logs.length;
    const start = (page - 1) * limit;
    res.json({
      page,
      limit,
      total,
      data: logs.slice(start, start + limit),
      logs: logs.slice(start, start + limit),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  }
);

/**
 * GET /api/activity-log
 * Get audit events for the current authenticated user (Data Principal Dashboard)
 * 
 * P1-4 FIX: Now uses SQL-level filtering via getAuditLogsByUserId()
 * instead of fetching ALL logs and filtering in memory (was O(n))
 */
router.get(
  "/activity-log",
  authenticateJWT,
  async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const hasPage = typeof req.query.page !== "undefined";
    const hasLimit = typeof req.query.limit !== "undefined";
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

    // P1-4 FIX: SQL-level filtering instead of in-memory O(n)
    const result = await getAuditLogsByUserId(req.user.userId, { page, limit });

    if (!hasPage && !hasLimit) {
      return res.json({
        success: true,
        data: result.logs,
      });
    }

    res.json({
      success: true,
      data: result.logs,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        pages: Math.ceil(result.total / result.limit),
      },
    });
  }
);

export default router;
