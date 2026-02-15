/**
 * Correction Request Routes
 * DPDP Section 11 - Right to Correction
 *
 * Allows Data Principals to request correction of inaccurate,
 * incomplete, outdated, or misleading personal data.
 *
 * All routes require JWT authentication.
 * Admin routes additionally require ADMIN permission.
 */

import { Router } from "express";
import { v7 as uuidv7 } from "uuid";
import { authenticateJWT, AuthenticatedRequest } from "../middleware/jwtAuth";
import { requirePermission } from "../middleware/rbac";
import { validate } from "../middleware/validate";
import { adminLimiter } from "../middleware/rateLimiter";
import {
  createCorrectionRequest,
  getUserCorrectionRequests,
  getCorrectionRequestById,
  updateCorrectionRequestStatus,
  getAllCorrectionRequests,
} from "../repositories/correctionRequestRepo";
import {
  CreateCorrectionRequestSchema,
  UpdateCorrectionRequestStatusSchema,
  GetCorrectionRequestsQuerySchema,
  CorrectionRequestUuidParamSchema,
} from "../schemas/correctionRequest.schema";
import { recordAudit } from "../repositories/auditRepo";

const router = Router();

// Async error wrapper
const wrap =
  (fn: (req: any, res: any, next?: any) => Promise<any>) =>
  (req: any, res: any, next: any) =>
    Promise.resolve(fn(req, res, next)).catch(next);

/**
 * POST /correction-requests
 * Create a new correction request (Data Principal)
 */
router.post(
  "/correction-requests",
  authenticateJWT,
  validate({ body: CreateCorrectionRequestSchema }),
  wrap(async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { fieldName, currentValue, correctedValue, reason, additionalNotes } =
      req.body;

    const request = await createCorrectionRequest({
      userId: req.user.userId,
      fieldName,
      currentValue,
      correctedValue,
      reason,
      additionalNotes,
    });

    await recordAudit({
      auditId: uuidv7(),
      eventType: "CORRECTION_REQUESTED",
      consentId: "N/A",
      userId: req.user.userId,
      timestamp: new Date().toISOString(),
      details: {
        requestId: request.requestId,
        fieldName,
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
 * GET /correction-requests
 * Get all correction requests for the current user
 */
router.get(
  "/correction-requests",
  authenticateJWT,
  wrap(async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const requests = await getUserCorrectionRequests(req.user.userId);

    res.json({
      success: true,
      data: requests,
    });
  })
);

/**
 * GET /correction-requests/:id
 * Get a specific correction request by ID
 */
router.get(
  "/correction-requests/:id",
  authenticateJWT,
  validate({ params: CorrectionRequestUuidParamSchema }),
  wrap(async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const request = await getCorrectionRequestById(req.params.id);

    if (!request) {
      return res.status(404).json({ error: "Correction request not found" });
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
 * GET /admin/correction-requests
 * Get all correction requests (Admin only)
 */
router.get(
  "/admin/correction-requests",
  adminLimiter,
  authenticateJWT,
  requirePermission("ADMIN"),
  validate({ query: GetCorrectionRequestsQuerySchema }),
  wrap(async (req: any, res) => {
    const { status, page, limit } = req.query;

    const result = await getAllCorrectionRequests({
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
 * PATCH /admin/correction-requests/:id/status
 * Update correction request status (Admin only)
 */
router.patch(
  "/admin/correction-requests/:id/status",
  adminLimiter,
  authenticateJWT,
  requirePermission("ADMIN"),
  validate({
    params: CorrectionRequestUuidParamSchema,
    body: UpdateCorrectionRequestStatusSchema,
  }),
  wrap(async (req: AuthenticatedRequest, res) => {
    const { status, reviewNotes } = req.body;

    const updated = await updateCorrectionRequestStatus({
      requestId: req.params.id,
      status,
      reviewerId: req.user?.userId,
      reviewNotes,
    });

    if (!updated) {
      return res.status(404).json({ error: "Correction request not found" });
    }

    await recordAudit({
      auditId: uuidv7(),
      eventType: "CORRECTION_REQUEST_UPDATED",
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
