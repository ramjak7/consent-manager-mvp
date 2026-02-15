/**
 * Erasure Request Routes
 * DPDP Section 12(1) - Right to Erasure
 * 
 * All routes require JWT authentication.
 * Admin routes additionally require ADMIN permission.
 */

import { Router } from "express";
import { z } from "zod";
import { v7 as uuidv7 } from "uuid";
import { authenticateJWT, AuthenticatedRequest } from "../middleware/jwtAuth";
import { requirePermission } from "../middleware/rbac";
import { validate } from "../middleware/validate";
import { adminLimiter } from "../middleware/rateLimiter";
import {
  createErasureRequest,
  getUserErasureRequests,
  getErasureRequestById,
  updateErasureRequestStatus,
  getAllErasureRequests,
} from "../repositories/erasureRequestRepo";
import {
  CreateErasureRequestSchema,
  UpdateErasureRequestStatusSchema,
  GetErasureRequestsQuerySchema,
  UuidParamSchema as ErasureRequestUuidParamSchema,
} from "../schemas/erasureRequest.schema";
import { recordAudit } from "../repositories/auditRepo";

const router = Router();

// Async error wrapper
const wrap = (fn: (req: any, res: any, next?: any) => Promise<any>) =>
  (req: any, res: any, next: any) =>
    Promise.resolve(fn(req, res, next)).catch(next);

/**
 * POST /api/erasure-requests
 * Create a new erasure request (Data Principal)
 */
router.post(
  "/erasure-requests",
  authenticateJWT,
  validate({ body: CreateErasureRequestSchema }),
  wrap(async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { reason, additionalNotes } = req.body;

    const request = await createErasureRequest({
      userId: req.user.userId,
      reason,
      additionalNotes,
    });

    await recordAudit({
      auditId: uuidv7(),
      eventType: "ERASURE_REQUESTED",
      consentId: "N/A",
      userId: req.user.userId,
      timestamp: new Date().toISOString(),
      details: {
        requestId: request.requestId,
        reason,
      },
    });

    res.status(201).json({
      success: true,
      data: request,
    });
  })
);

/**
 * GET /api/erasure-requests
 * Get all erasure requests for the current user
 */
router.get(
  "/erasure-requests",
  authenticateJWT,
  wrap(async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const requests = await getUserErasureRequests(req.user.userId);

    res.json({
      success: true,
      data: requests,
    });
  })
);

/**
 * GET /api/erasure-requests/:id
 * Get a specific erasure request by ID
 */
router.get(
  "/erasure-requests/:id",
  authenticateJWT,
  validate({ params: ErasureRequestUuidParamSchema }),
  wrap(async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const request = await getErasureRequestById(req.params.id);

    if (!request) {
      return res.status(404).json({ error: "Erasure request not found" });
    }

    if (request.userId !== req.user.userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    res.json({
      success: true,
      data: request,
    });
  })
);

/**
 * GET /admin/erasure-requests
 * Get all erasure requests (Admin only)
 */
router.get(
  "/admin/erasure-requests",
  adminLimiter,
  authenticateJWT,
  requirePermission("ERASURE_MANAGE"),
  validate({ query: GetErasureRequestsQuerySchema }),
  wrap(async (req: any, res) => {
    const { status, page, limit } = req.query;

    const result = await getAllErasureRequests({
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });

    res.json({
      success: true,
      data: result.requests,
      pagination: result.pagination,
    });
  })
);

/**
 * PATCH /admin/erasure-requests/:id/status
 * Update erasure request status (Admin only)
 */
router.patch(
  "/admin/erasure-requests/:id/status",
  adminLimiter,
  authenticateJWT,
  requirePermission("ERASURE_MANAGE"),
  validate({
    params: ErasureRequestUuidParamSchema,
    body: UpdateErasureRequestStatusSchema,
  }),
  wrap(async (req: AuthenticatedRequest, res) => {
    const { status, reviewNotes } = req.body;

    const updated = await updateErasureRequestStatus({
      requestId: req.params.id,
      status,
      reviewerId: req.user?.userId,
      reviewNotes,
    });

    if (!updated) {
      return res.status(404).json({ error: "Erasure request not found" });
    }

    await recordAudit({
      auditId: uuidv7(),
      eventType: "ERASURE_REQUEST_UPDATED",
      consentId: "N/A",
      userId: updated.userId,
      timestamp: new Date().toISOString(),
      details: {
        requestId: updated.requestId,
        status,
        reviewerId: req.user?.userId,
      },
    });

    res.json({
      success: true,
      data: updated,
    });
  })
);

export default router;
