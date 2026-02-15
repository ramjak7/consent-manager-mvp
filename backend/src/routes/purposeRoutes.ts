/**
 * Purpose Management Routes
 * DPDP Act §6 — Consent must be specific to a clearly stated purpose.
 *
 * Public: GET active purposes (for consent forms)
 * Admin: CRUD purpose definitions with version tracking
 */

import { Router } from "express";
import { z } from "zod";
import { authenticateJWT, AuthenticatedRequest } from "../middleware/jwtAuth";
import { requirePermission } from "../middleware/rbac";
import { validate } from "../middleware/validate";
import { adminLimiter } from "../middleware/rateLimiter";
import {
  getActivePurposes,
  getPurposeVersions,
  getPurposeById,
  createPurpose,
  createPurposeVersion,
  getAllPurposes,
} from "../repositories/purposeRepo";

const router = Router();

const wrap =
  (fn: (req: any, res: any, next?: any) => Promise<any>) =>
  (req: any, res: any, next: any) =>
    Promise.resolve(fn(req, res, next)).catch(next);

// Schemas
const CreatePurposeSchema = z
  .object({
    code: z.string().min(1).max(50),
    name: z.string().min(1).max(200),
    description: z.string().min(1).max(2000),
    legalBasis: z
      .enum(["CONSENT", "LEGITIMATE_USE", "EMPLOYMENT", "STATE_FUNCTION"])
      .optional(),
    dataCategories: z.array(z.string()).optional(),
    retentionDays: z.number().int().positive().optional(),
  })
  .strict();

const UpdatePurposeVersionSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().min(1).max(2000).optional(),
    legalBasis: z
      .enum(["CONSENT", "LEGITIMATE_USE", "EMPLOYMENT", "STATE_FUNCTION"])
      .optional(),
    dataCategories: z.array(z.string()).optional(),
    retentionDays: z.number().int().positive().optional(),
  })
  .strict();

/**
 * GET /purposes
 * Get all active purposes (public — used by consent forms)
 */
router.get(
  "/purposes",
  authenticateJWT,
  wrap(async (_req, res) => {
    const purposes = await getActivePurposes();
    res.json({ success: true, data: purposes });
  })
);

/**
 * GET /purposes/:code/versions
 * Get all versions of a purpose (admin)
 */
router.get(
  "/purposes/:code/versions",
  authenticateJWT,
  requirePermission("ADMIN"),
  wrap(async (req, res) => {
    const versions = await getPurposeVersions(req.params.code);
    if (versions.length === 0) {
      return res.status(404).json({ error: "Purpose not found" });
    }
    res.json({ success: true, data: versions });
  })
);

/**
 * GET /admin/purposes
 * Get all purposes with pagination (admin)
 */
router.get(
  "/admin/purposes",
  adminLimiter,
  authenticateJWT,
  requirePermission("ADMIN"),
  wrap(async (req, res) => {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
    const limit = req.query.limit
      ? parseInt(req.query.limit as string, 10)
      : undefined;
    const activeOnly = req.query.activeOnly === "true";

    const result = await getAllPurposes({ page, limit, activeOnly });
    res.json({
      success: true,
      data: result.purposes,
      pagination: result.pagination,
    });
  })
);

/**
 * POST /admin/purposes
 * Create a new purpose (admin)
 */
router.post(
  "/admin/purposes",
  adminLimiter,
  authenticateJWT,
  requirePermission("ADMIN"),
  validate({ body: CreatePurposeSchema }),
  wrap(async (req: AuthenticatedRequest, res) => {
    const purpose = await createPurpose({
      ...req.body,
      createdBy: req.user?.userId,
    });
    res.status(201).json({ success: true, data: purpose });
  })
);

/**
 * POST /admin/purposes/:code/versions
 * Create a new version of an existing purpose (admin)
 * Deactivates the previous version automatically.
 */
router.post(
  "/admin/purposes/:code/versions",
  adminLimiter,
  authenticateJWT,
  requirePermission("ADMIN"),
  validate({ body: UpdatePurposeVersionSchema }),
  wrap(async (req: AuthenticatedRequest, res) => {
    try {
      const purpose = await createPurposeVersion(req.params.code, {
        ...req.body,
        createdBy: req.user?.userId,
      });
      res.status(201).json({ success: true, data: purpose });
    } catch (err: any) {
      if (err.message?.includes("No active purpose found")) {
        return res.status(404).json({ error: err.message });
      }
      throw err;
    }
  })
);

export default router;
