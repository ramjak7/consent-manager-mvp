/**
 * Processor/Vendor Registry Routes
 * DPDP Act §8(2) — Data Processor accountability
 *
 * Admin-only: Manage third-party data processors and their authorizations.
 */

import { Router } from "express";
import { z } from "zod";
import { authenticateJWT, AuthenticatedRequest } from "../middleware/jwtAuth";
import { requirePermission } from "../middleware/rbac";
import { validate } from "../middleware/validate";
import { adminLimiter } from "../middleware/rateLimiter";
import {
  getAllProcessors,
  getProcessorById,
  createProcessor,
  updateProcessor,
} from "../repositories/processorRepo";

const router = Router();

const wrap =
  (fn: (req: any, res: any, next?: any) => Promise<any>) =>
  (req: any, res: any, next: any) =>
    Promise.resolve(fn(req, res, next)).catch(next);

const CreateProcessorSchema = z
  .object({
    name: z.string().min(1).max(200),
    entityType: z
      .enum(["COMPANY", "INDIVIDUAL", "GOVERNMENT", "NGO"])
      .optional(),
    contactEmail: z.string().email().optional(),
    contactPhone: z.string().max(20).optional(),
    address: z.string().max(500).optional(),
    country: z.string().length(2).optional(),
    dpaSigned: z.boolean().optional(),
    dpaSignedDate: z.string().datetime().optional(),
    dpaExpiryDate: z.string().datetime().optional(),
    authorizedPurposes: z.array(z.string()).optional(),
    authorizedDataCategories: z.array(z.string()).optional(),
    crossBorderTransfer: z.boolean().optional(),
    transferCountries: z.array(z.string()).optional(),
    notes: z.string().max(2000).optional(),
  })
  .strict();

const UpdateProcessorSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    entityType: z
      .enum(["COMPANY", "INDIVIDUAL", "GOVERNMENT", "NGO"])
      .optional(),
    contactEmail: z.string().email().optional(),
    contactPhone: z.string().max(20).optional(),
    address: z.string().max(500).optional(),
    country: z.string().length(2).optional(),
    dpaSigned: z.boolean().optional(),
    dpaSignedDate: z.string().datetime().optional(),
    dpaExpiryDate: z.string().datetime().optional(),
    authorizedPurposes: z.array(z.string()).optional(),
    authorizedDataCategories: z.array(z.string()).optional(),
    crossBorderTransfer: z.boolean().optional(),
    transferCountries: z.array(z.string()).optional(),
    status: z
      .enum(["ACTIVE", "SUSPENDED", "TERMINATED", "PENDING_REVIEW"])
      .optional(),
    notes: z.string().max(2000).optional(),
  })
  .strict();

const UuidParamSchema = z.object({
  id: z.string().uuid("Invalid processor ID"),
});

/**
 * GET /admin/processors
 * Get all data processors (paginated)
 */
router.get(
  "/admin/processors",
  adminLimiter,
  authenticateJWT,
  requirePermission("PROCESSOR_READ"),
  wrap(async (req, res) => {
    const { status, page, limit } = req.query;

    const result = await getAllProcessors({
      status: status as string,
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });

    res.json({
      success: true,
      data: result.processors,
      pagination: result.pagination,
    });
  })
);

/**
 * GET /admin/processors/:id
 * Get a single processor by ID
 */
router.get(
  "/admin/processors/:id",
  adminLimiter,
  authenticateJWT,
  requirePermission("PROCESSOR_READ"),
  validate({ params: UuidParamSchema }),
  wrap(async (req, res) => {
    const processor = await getProcessorById(req.params.id);
    if (!processor) {
      return res.status(404).json({ error: "Processor not found" });
    }
    res.json({ success: true, data: processor });
  })
);

/**
 * POST /admin/processors
 * Register a new data processor
 */
router.post(
  "/admin/processors",
  adminLimiter,
  authenticateJWT,
  requirePermission("PROCESSOR_MANAGE"),
  validate({ body: CreateProcessorSchema }),
  wrap(async (req: AuthenticatedRequest, res) => {
    const processor = await createProcessor({
      ...req.body,
      createdBy: req.user?.userId,
    });
    res.status(201).json({ success: true, data: processor });
  })
);

/**
 * PATCH /admin/processors/:id
 * Update an existing processor
 */
router.patch(
  "/admin/processors/:id",
  adminLimiter,
  authenticateJWT,
  requirePermission("PROCESSOR_MANAGE"),
  validate({ params: UuidParamSchema, body: UpdateProcessorSchema }),
  wrap(async (req, res) => {
    const updated = await updateProcessor(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: "Processor not found" });
    }
    res.json({ success: true, data: updated });
  })
);

export default router;
