/**
 * Consent Routes (REFACTORED — Phase 1)
 * All consent lifecycle endpoints extracted from index.ts
 * 
 * Phase 1 fixes applied:
 * - P1-1: authenticateJWT added to all consent endpoints
 * - P1-2: userId derived from JWT on POST /consents (not from request body)
 * - Ownership checks: users can only access their own consents (or ADMIN)
 * 
 * Token-based endpoints (approve/reject) remain unauthenticated by design —
 * they use one-time cryptographic tokens as their auth mechanism.
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { v7 as uuidv7 } from "uuid";
import { validate } from "../middleware/validate";
import { authenticateJWT, AuthenticatedRequest } from "../middleware/jwtAuth";
import { requirePermission } from "../middleware/rbac";
import {
  tokenEndpointLimiter,
  consentCreationLimiter,
  adminLimiter,
  processLimiter,
} from "../middleware/rateLimiter";
import {
  createConsent,
  getConsentById,
  getConsentByIdAllowExpired,
  getLatestActiveConsent,
  getLatestActiveConsentAllowExpired,
  revokeConsent,
  expireConsentIfNeeded,
  getUserConsents,
  approveConsentByToken,
  rejectConsentByToken,
} from "../repositories/consentRepo";
import { recordAudit } from "../repositories/auditRepo";
import { generateConsentReceipt } from "../utils/consentReceipt";
import { generateReceiptPDF } from "../utils/pdfGenerator";
import { evaluateConsentPolicy } from "../policy/policyEngine";
import { emitWebhookEvent } from "../services/webhookService";
import { CreateConsentSchema, RevokeSemanticSchema } from "../schemas/consent.schema";
import { ProcessRequestSchema } from "../schemas/process.schema";
import { pool } from "../db";

const router = Router();

// Async error wrapper
const wrap = (fn: (req: any, res: any, next?: any) => Promise<any>) =>
  (req: any, res: any, next: any) =>
    Promise.resolve(fn(req, res, next)).catch(next);

const UuidParamSchema = z.object({
  id: z.string().min(1, "Invalid id"),
});

const TokenParam = z.object({
  token: z.string().min(32, "Invalid approval token"),
});
type TokenParams = z.infer<typeof TokenParam>;

// ============================================================================
// DATA PRINCIPAL DASHBOARD
// ============================================================================

const GetConsentsQuerySchema = z.object({
  status: z
    .enum(["REQUESTED", "ACTIVE", "REJECTED", "REVOKED", "EXPIRED"])
    .optional(),
  purpose: z.string().optional(),
  organizationName: z.string().optional(),
  page: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .optional(),
  limit: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .optional(),
  sortBy: z.enum(["created_at", "valid_until", "purpose"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

/**
 * GET /api/consents
 * Get consents for the current user (Data Principal Dashboard)
 */
router.get(
  "/consents",
  authenticateJWT,
  validate({ query: GetConsentsQuerySchema }),
  wrap(async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const {
      status,
      purpose,
      organizationName,
      page,
      limit,
      sortBy,
      sortOrder,
    } = req.query as any;

    const result = await getUserConsents({
      userId: req.user.userId,
      status,
      purpose,
      organizationName,
      page,
      limit,
      sortBy,
      sortOrder,
    });

    res.json({
      success: true,
      data: result.consents,
      pagination: result.pagination,
    });
  })
);

// ============================================================================
// CONSENT CREATION (P1-1: JWT required, P1-2: userId from JWT)
// ============================================================================

/**
 * POST /consents
 * Create a new consent request
 * 
 * P1-1: Now requires JWT authentication
 * P1-2: userId is derived from JWT token, NOT from request body.
 *        This prevents consent impersonation.
 */
router.post(
  "/consents",
  authenticateJWT,
  consentCreationLimiter,
  validate({ body: CreateConsentSchema }),
  wrap(async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // P1-2: userId from JWT, ignore any userId in request body
    const userId = req.user.userId;
    const { purpose, dataTypes, validUntil, noticeId, noticeVersion, language } =
      req.body;

    if (
      !purpose ||
      !dataTypes ||
      !validUntil ||
      !noticeId ||
      !noticeVersion ||
      !language
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    if (
      !Array.isArray(dataTypes) ||
      !dataTypes.every((dt: any) => typeof dt === "string")
    ) {
      return res.status(400).json({ error: "Invalid dataTypes format" });
    }

    const consentId = uuidv7();

    const { approvalToken, approvalExpiresAt } = await createConsent({
      consentId,
      userId,
      purpose,
      dataTypes,
      validUntil,
      noticeId,
      noticeVersion,
      language,
    });

    await recordAudit({
      auditId: uuidv7(),
      eventType: "CONSENT_REQUESTED",
      consentId,
      userId,
      timestamp: new Date().toISOString(),
      details: {
        purpose,
        dataTypes,
        validUntil,
        approvalRequired: true,
        noticeId,
        noticeVersion,
        language,
      },
    });

    await recordAudit({
      auditId: uuidv7(),
      eventType: "NOTICE_SHOWN",
      consentId,
      userId,
      timestamp: new Date().toISOString(),
      details: {
        noticeId,
        noticeVersion,
        language,
        purpose,
      },
    });

    res.status(201).json({
      consentId,
      status: "REQUESTED",
      approvalToken,
      approvalExpiresAt: approvalExpiresAt.toISOString(),
      message: "Consent awaiting approval",
    });
  })
);

// ============================================================================
// CONSENT READ (P1-1: JWT required + ownership check)
// ============================================================================

/**
 * GET /consents/:id
 * Get a single consent by ID
 * P1-1: Requires JWT authentication + ownership check
 */
router.get(
  "/consents/:id",
  authenticateJWT,
  validate({ params: UuidParamSchema }),
  wrap(async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const consentId = req.params.id;

    try {
      const expiredConsent = await expireConsentIfNeeded(consentId);

      if (expiredConsent) {
        if (
          expiredConsent.userId !== req.user.userId &&
          !req.user.permissions.includes("ADMIN")
        ) {
          return res.status(403).json({ error: "Forbidden" });
        }

        await recordAudit({
          auditId: uuidv7(),
          eventType: "CONSENT_EXPIRED",
          consentId: expiredConsent.consentId,
          userId: expiredConsent.userId,
          timestamp: new Date().toISOString(),
          details: {
            version: expiredConsent.version,
            validUntil: expiredConsent.validUntil,
            status: expiredConsent.status,
          },
        });

        return res.json(expiredConsent);
      }

      const consent = await getConsentById(consentId);

      if (!consent) {
        return res.status(404).json({ error: "Consent not found" });
      }

      if (
        consent.userId !== req.user.userId &&
        !req.user.permissions.includes("ADMIN")
      ) {
        return res.status(403).json({ error: "Forbidden" });
      }

      res.json(consent);
    } catch (err) {
      console.error("Error fetching consent:", err);
      return res.status(404).json({ error: "Consent not found" });
    }
  })
);

// ============================================================================
// CONSENT RECEIPTS (P1-1: JWT required + ownership check)
// ============================================================================

/**
 * GET /consents/:id/receipt — ISO/IEC 29184 consent receipt (JSON)
 */
router.get(
  "/consents/:id/receipt",
  authenticateJWT,
  validate({ params: UuidParamSchema }),
  wrap(async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const consentId = req.params.id;

    try {
      const consent = await getConsentByIdAllowExpired(consentId);

      if (!consent) {
        return res.status(404).json({ error: "Consent not found" });
      }

      if (
        consent.userId !== req.user.userId &&
        !req.user.permissions.includes("ADMIN")
      ) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const receiptId = uuidv7();
      const receipt = generateConsentReceipt(consent, receiptId);

      await recordAudit({
        auditId: uuidv7(),
        eventType: "RECEIPT_GENERATED",
        consentId: consent.consentId,
        userId: consent.userId,
        timestamp: new Date().toISOString(),
        details: {
          receiptId,
          format: "JSON",
          version: receipt.version,
        },
      });

      res.json(receipt);
    } catch (err) {
      console.error("Error generating consent receipt:", err);
      return res
        .status(500)
        .json({ error: "Failed to generate consent receipt" });
    }
  })
);

/**
 * GET /consents/:id/receipt.pdf — ISO/IEC 29184 consent receipt (PDF)
 */
router.get(
  "/consents/:id/receipt.pdf",
  authenticateJWT,
  validate({ params: UuidParamSchema }),
  wrap(async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const consentId = req.params.id;

    try {
      const consent = await getConsentByIdAllowExpired(consentId);

      if (!consent) {
        return res.status(404).json({ error: "Consent not found" });
      }

      if (
        consent.userId !== req.user.userId &&
        !req.user.permissions.includes("ADMIN")
      ) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const receiptId = uuidv7();
      const receipt = generateConsentReceipt(consent, receiptId);
      const pdfDoc = generateReceiptPDF(receipt);

      await recordAudit({
        auditId: uuidv7(),
        eventType: "RECEIPT_GENERATED",
        consentId: consent.consentId,
        userId: consent.userId,
        timestamp: new Date().toISOString(),
        details: {
          receiptId,
          format: "PDF",
          version: receipt.version,
        },
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="consent-receipt-${consentId}.pdf"`
      );

      pdfDoc.pipe(res);
    } catch (err) {
      console.error("Error generating PDF receipt:", err);
      return res
        .status(500)
        .json({ error: "Failed to generate PDF receipt" });
    }
  })
);

// ============================================================================
// CONSENT REVOCATION (P1-1: JWT required)
// ============================================================================

/**
 * POST /consents/:id/revoke — Revoke specific consent by ID
 * P1-1: JWT required + ownership check
 */
router.post(
  "/consents/:id/revoke",
  authenticateJWT,
  validate({ params: UuidParamSchema }),
  wrap(async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const consent = await getConsentById(req.params.id);

      if (!consent) {
        return res.status(404).json({ error: "Consent not found" });
      }

      if (
        consent.userId !== req.user.userId &&
        !req.user.permissions.includes("ADMIN")
      ) {
        return res.status(403).json({ error: "Forbidden" });
      }

      if (consent.status === "REVOKED") {
        return res.status(400).json({ error: "Consent already revoked" });
      }

      if (consent.status !== "ACTIVE") {
        return res.status(400).json({
          error: "Consent already revoked",
        });
      }

      const revoked = await revokeConsent(consent.consentId);

      if (!revoked) {
        return res
          .status(400)
          .json({ error: "Consent could not be revoked" });
      }

      await recordAudit({
        auditId: uuidv7(),
        eventType: "CONSENT_REVOKED",
        consentId: consent.consentId,
        userId: consent.userId,
        timestamp: new Date().toISOString(),
        details: { status: "REVOKED" },
      });

      await emitWebhookEvent("CONSENT_REVOKED", {
        consentId: consent.consentId,
        userId: consent.userId,
        purpose: consent.purpose,
        revokedAt: new Date().toISOString(),
      });

      res.json({
        consentId: consent.consentId,
        status: "REVOKED",
      });
    } catch (err) {
      console.error("Error revoking consent:", err);
      return res.status(404).json({ error: "Consent not found" });
    }
  })
);

/**
 * POST /consents/revoke — Semantic revocation
 * Revokes latest ACTIVE consent for (userId, purpose)
 * P1-1: JWT required, P1-2: userId from JWT
 */
router.post(
  "/consents/revoke",
  authenticateJWT,
  validate({ body: RevokeSemanticSchema }),
  wrap(async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userId = req.user.userId;
    const { purpose } = req.body;

    if (typeof purpose !== "string") {
      return res.status(400).json({
        error: "purpose is required",
      });
    }

    const consent = await getLatestActiveConsent(userId, purpose);

    if (!consent) {
      return res.json({
        status: "NO_ACTIVE_CONSENT",
        purpose,
      });
    }

    const revoked = await revokeConsent(consent.consentId);

    if (!revoked) {
      return res.status(400).json({
        error: "Consent could not be revoked",
      });
    }

    await recordAudit({
      auditId: uuidv7(),
      eventType: "CONSENT_REVOKED",
      consentId: consent.consentId,
      userId,
      timestamp: new Date().toISOString(),
      details: {
        purpose,
        version: consent.version,
        revokedVia: "SEMANTIC",
      },
    });

    await emitWebhookEvent("CONSENT_REVOKED", {
      consentId: consent.consentId,
      userId,
      purpose,
      revokedAt: new Date().toISOString(),
    });

    res.json({
      status: "REVOKED",
      purpose,
    });
  })
);

// ============================================================================
// CONSENT APPROVAL / REJECTION (Token-based — no JWT required)
// ============================================================================

/**
 * POST /consents/approve/:token — Approve consent via one-time token
 */
router.post(
  "/consents/approve/:token",
  tokenEndpointLimiter,
  validate({ params: TokenParam }),
  async (req: Request<TokenParams>, res: Response) => {
    const token = req.params.token;

    const consent = await approveConsentByToken(token);

    if (!consent) {
      return res.status(400).json({
        error: "Invalid, expired, or already-used approval token",
      });
    }

    await recordAudit({
      auditId: uuidv7(),
      eventType: "CONSENT_APPROVED",
      consentId: consent.consentId,
      userId: consent.userId,
      timestamp: new Date().toISOString(),
      details: {
        purpose: consent.purpose,
        version: consent.version,
      },
    });

    res.json({
      status: "ACTIVE",
      consentId: consent.consentId,
    });
  }
);

/**
 * POST /consents/reject/:token — Reject consent via one-time token
 */
router.post(
  "/consents/reject/:token",
  tokenEndpointLimiter,
  validate({ params: TokenParam }),
  async (req: Request<TokenParams>, res: Response) => {
    const token = req.params.token;

    const consent = await rejectConsentByToken(token);

    if (!consent) {
      return res.status(400).json({
        error: "Invalid, expired, or already-used approval token",
      });
    }

    await recordAudit({
      auditId: uuidv7(),
      eventType: "CONSENT_REJECTED",
      consentId: consent.consentId,
      userId: consent.userId,
      timestamp: new Date().toISOString(),
      details: {
        purpose: consent.purpose,
        version: consent.version,
      },
    });

    res.json({
      status: "REJECTED",
      consentId: consent.consentId,
    });
  }
);

// ============================================================================
// PROCESSING VALIDATION
// ============================================================================

/**
 * POST /process — Validate processing permission
 * Used by Data Fiduciaries (service accounts) to check consent validity.
 * Requires JWT authentication (DF_CLIENT service account).
 */
router.post(
  "/process",
  authenticateJWT,
  processLimiter,
  validate({ body: ProcessRequestSchema }),
  wrap(async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { userId, purpose, dataTypes } = req.body;

    const consent = await getLatestActiveConsentAllowExpired(userId, purpose);

    if (!consent) {
      const anyActive = await pool.query(
        `SELECT * FROM consents WHERE user_id = $1 AND status = 'ACTIVE' AND valid_until > NOW() ORDER BY version DESC LIMIT 1`,
        [userId]
      );

      if (anyActive.rows.length > 0) {
        await recordAudit({
          auditId: uuidv7(),
          eventType: "PROCESSING_DENIED",
          consentId: anyActive.rows[0].consent_id,
          userId,
          timestamp: new Date().toISOString(),
          details: {
            reason: "Purpose mismatch",
            requestedPurpose: purpose,
            consentPurpose: anyActive.rows[0].purpose,
          },
        });
        return res.status(403).json({ error: "Purpose mismatch" });
      }

      const anyConsent = await pool.query(
        `SELECT * FROM consents WHERE user_id = $1 AND purpose = $2 LIMIT 1`,
        [userId, purpose]
      );

      await recordAudit({
        auditId: uuidv7(),
        eventType: "PROCESSING_DENIED",
        consentId: anyConsent.rows.length
          ? anyConsent.rows[0].consent_id
          : "UNKNOWN",
        userId,
        timestamp: new Date().toISOString(),
        details: {
          reason: "No active consent",
          purpose,
        },
      });
      return res.status(403).json({ error: "No active consent" });
    }

    const now = new Date();
    if (new Date(consent.validUntil) <= now) {
      await expireConsentIfNeeded(consent.consentId);
      await recordAudit({
        auditId: uuidv7(),
        eventType: "PROCESSING_DENIED",
        consentId: consent.consentId,
        userId: consent.userId,
        timestamp: new Date().toISOString(),
        details: {
          reason: "Consent expired",
          validUntil: consent.validUntil,
          version: consent.version,
        },
      });
      return res.status(403).json({ error: "Consent expired" });
    }

    const decision = evaluateConsentPolicy(consent, {
      purpose,
      dataTypes,
      version: consent.version,
    });

    if (!decision.allow) {
      await recordAudit({
        auditId: uuidv7(),
        eventType: "PROCESSING_DENIED",
        consentId: consent.consentId,
        userId: consent.userId,
        timestamp: new Date().toISOString(),
        details: {
          reason: decision.reason,
          requestedDataTypes: dataTypes,
          consentedDataTypes: consent.dataTypes,
          version: consent.version,
        },
      });

      return res.status(403).json({ error: decision.reason });
    }

    await recordAudit({
      auditId: uuidv7(),
      eventType: "PROCESSING_ALLOWED",
      consentId: consent.consentId,
      userId: consent.userId,
      timestamp: new Date().toISOString(),
      details: {
        purpose,
        requestedDataTypes: dataTypes,
        consentedDataTypes: consent.dataTypes,
        version: consent.version,
      },
    });

    res.json({ status: "PROCESSING_ALLOWED" });
  })
);

// ============================================================================
// ADMIN OPERATIONS
// ============================================================================

/**
 * POST /admin/consents/:id/expire — Admin force-expire
 * Use-case: regulatory, grievance, emergency stop
 * Requires JWT + CONSENT_FORCE_EXPIRE permission
 */
router.post(
  "/admin/consents/:id/expire",
  adminLimiter,
  authenticateJWT,
  requirePermission("CONSENT_FORCE_EXPIRE"),
  validate({ params: UuidParamSchema }),
  wrap(async (req: AuthenticatedRequest, res) => {
    const consentId = req.params.id;
    const consent = await getConsentByIdAllowExpired(consentId);

    if (!consent) {
      return res.status(404).json({ error: "Consent not found" });
    }

    let newStatus: "EXPIRED" | "REJECTED";

    if (consent.status === "ACTIVE") {
      newStatus = "EXPIRED";
    } else if (consent.status === "REQUESTED") {
      newStatus = "REJECTED";
    } else {
      await recordAudit({
        auditId: uuidv7(),
        eventType: "ADMIN_EXPIRE_DENIED",
        consentId,
        userId: consent.userId,
        timestamp: new Date().toISOString(),
        details: {
          reason: `Cannot expire consent in status ${consent.status}`,
          currentStatus: consent.status,
          attemptedBy: "ADMIN",
          version: consent.version,
        },
      });

      return res.status(400).json({
        error: `Cannot expire consent in status ${consent.status}`,
      });
    }

    await pool.query(
      `UPDATE consents SET status = $1 WHERE consent_id = $2`,
      [newStatus, consentId]
    );

    await recordAudit({
      auditId: uuidv7(),
      eventType: `CONSENT_${newStatus}`,
      consentId,
      userId: consent.userId,
      timestamp: new Date().toISOString(),
      details: {
        forcedBy: "ADMIN",
        version: consent.version,
        previousStatus: consent.status,
      },
    });

    res.json({
      consentId,
      previousStatus: consent.status,
      status: newStatus,
      mode: "ADMIN_FORCED",
    });
  })
);

/**
 * GET /consents/export
 * Bulk Data Portability — DPDP Act §13
 * Exports all consent records for the authenticated Data Principal.
 * Supports JSON (default) and CSV formats via ?format=csv query param.
 */
router.get(
  "/consents/export",
  authenticateJWT,
  wrap(async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const format = (req.query.format as string)?.toLowerCase() || "json";
    const userId = req.user.userId;

    // Fetch all consents for this user (all statuses, for portability)
    const result = await pool.query(
      `SELECT 
        consent_id, consent_group_id, version, user_id, purpose, 
        data_types, valid_until, status, created_at,
        notice_id, notice_version, language
      FROM consents 
      WHERE user_id = $1
      ORDER BY created_at DESC`,
      [userId]
    );

    const consents = result.rows.map((row: any) => ({
      consentId: row.consent_id,
      consentGroupId: row.consent_group_id,
      version: row.version,
      userId: row.user_id,
      purpose: row.purpose,
      dataTypes: Array.isArray(row.data_types)
        ? row.data_types
        : JSON.parse(row.data_types),
      validUntil: row.valid_until,
      status: row.status,
      createdAt: row.created_at,
      noticeId: row.notice_id,
      noticeVersion: row.notice_version,
      language: row.language,
    }));

    // Fetch correction requests
    const corrections = await pool.query(
      `SELECT 
        request_id, field_name, current_value, corrected_value, 
        reason, status, created_at, updated_at
      FROM correction_requests 
      WHERE user_id = $1
      ORDER BY created_at DESC`,
      [userId]
    );

    // Fetch erasure requests
    const erasures = await pool.query(
      `SELECT 
        request_id, reason, additional_notes, status, 
        created_at, updated_at, completed_at
      FROM erasure_requests 
      WHERE user_id = $1
      ORDER BY created_at DESC`,
      [userId]
    );

    // Audit log pertaining to this user
    const auditLogs = await pool.query(
      `SELECT event_type, consent_id, "timestamp", details
      FROM audit_logs
      WHERE user_id = $1
      ORDER BY "timestamp" DESC`,
      [userId]
    );

    await recordAudit({
      auditId: uuidv7(),
      eventType: "CONSENT_REQUESTED",
      consentId: "BULK_EXPORT",
      userId,
      timestamp: new Date().toISOString(),
      details: {
        action: "DATA_PORTABILITY_EXPORT",
        format,
        consentCount: consents.length,
      },
    });

    if (format === "csv") {
      // CSV export — consents only (flat structure)
      const csvHeader = [
        "consentId",
        "consentGroupId",
        "version",
        "purpose",
        "dataTypes",
        "validUntil",
        "status",
        "createdAt",
        "noticeId",
        "noticeVersion",
        "language",
      ].join(",");

      const csvRows = consents.map((c: any) =>
        [
          c.consentId,
          c.consentGroupId,
          c.version,
          `"${c.purpose}"`,
          `"${(c.dataTypes || []).join(";")}"`,
          c.validUntil,
          c.status,
          c.createdAt,
          c.noticeId || "",
          c.noticeVersion || "",
          c.language || "",
        ].join(",")
      );

      const csv = [csvHeader, ...csvRows].join("\n");

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="my-consents-${new Date().toISOString().slice(0, 10)}.csv"`
      );
      return res.send(csv);
    }

    // JSON export — full data package
    const exportPackage = {
      exportedAt: new Date().toISOString(),
      dataPrincipal: userId,
      format: "DPDP_DATA_PORTABILITY_v1",
      consents,
      correctionRequests: corrections.rows.map((r: any) => ({
        requestId: r.request_id,
        fieldName: r.field_name,
        currentValue: r.current_value,
        correctedValue: r.corrected_value,
        reason: r.reason,
        status: r.status,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
      erasureRequests: erasures.rows.map((r: any) => ({
        requestId: r.request_id,
        reason: r.reason,
        additionalNotes: r.additional_notes,
        status: r.status,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        completedAt: r.completed_at,
      })),
      auditTrail: auditLogs.rows.map((r: any) => ({
        eventType: r.event_type,
        consentId: r.consent_id,
        timestamp: r.timestamp,
        details: r.details,
      })),
    };

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="my-data-${new Date().toISOString().slice(0, 10)}.json"`
    );
    return res.json(exportPackage);
  })
);

export default router;