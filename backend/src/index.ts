import "dotenv/config";
// Log the current environment mode (e.g., 'dev', 'staging', 'production') on startup for debugging.
console.log("Running build:", process.env.NODE_ENV || "dev");
import { z } from "zod";
import "./db";
import { pool } from "./db";
import cron from "node-cron";
import {
  createConsent,
  getConsentById,
  getConsentByIdAllowExpired,
  getLatestActiveConsent,
  getLatestActiveConsentAllowExpired,
  revokeConsent,
  expireConsentIfNeeded,
  getUserConsents,
} from "./repositories/consentRepo";
import {
  recordAudit,
  getAllAuditLogs,
} from "./repositories/auditRepo";
import {
  createErasureRequest,
  getUserErasureRequests,
  getErasureRequestById,
  updateErasureRequestStatus,
  getAllErasureRequests,
} from "./repositories/erasureRequestRepo";
import { generateConsentReceipt, formatReceiptAsText } from "./utils/consentReceipt";
import { generateReceiptPDF } from "./utils/pdfGenerator";
import { evaluateConsentPolicy } from "./policy/policyEngine";
import { ProcessRequestSchema } from "./schemas/process.schema";
import { CreateConsentSchema, RevokeSemanticSchema } from "./schemas/consent.schema";
import { 
  CreateErasureRequestSchema, 
  UpdateErasureRequestStatusSchema, 
  GetErasureRequestsQuerySchema,
  UuidParamSchema as ErasureRequestUuidParamSchema 
} from "./schemas/erasureRequest.schema";
import { validate } from "./middleware/validate";
import { requireApiKey } from "./middleware/auth";
import { authenticateJWT } from "./middleware/jwtAuth";
import { requirePermission } from "./middleware/rbac";
import { 
  generalLimiter, 
  consentCreationLimiter, 
  adminLimiter,
  processLimiter 
} from "./middleware/rateLimiter";
import { v7 as uuidv7 } from "uuid";
import express from "express";
import consentRoutes from "./routes/consentRoutes";
import webhookRoutes from "./routes/webhookRoutes";
import userRoutes from "./routes/userRoutes";
import authRoutes from "./routes/authRoutes";
import { emitWebhookEvent, processWebhookDeliveries } from "./services/webhookService";
import { logger, requestLogger } from "./utils/logger";
import { metricsMiddleware, register as metricsRegister, updateActiveConsentsGauge, trackConsentOperation, trackAuditEvent } from "./middleware/metrics";
import cookieParser from "cookie-parser";
import cors from "cors";

const app = express();
const PORT = 3000;
const REQUEST_TIMEOUT_MS = 30000; // 30 seconds

// async wrapper to catch errors from async route handlers
const wrap = (fn: (req: any, res: any, next?: any) => Promise<any>) => 
  (req: any, res: any, next: any) =>
    Promise.resolve(fn(req, res, next)).catch(next);

// CORS configuration - allow frontend domain
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true, // Important: allow cookies
  })
);

// Cookie parser - for httpOnly cookies
app.use(cookieParser());

// Limit request body size to 1MB
app.use(express.json({ limit: '1mb' }));

// Structured logging middleware
app.use(requestLogger);

// Metrics collection middleware
app.use(metricsMiddleware);

// Request timeout enforcement (30 seconds)
app.use((req: any, res: any, next: any) => {
  req.setTimeout(REQUEST_TIMEOUT_MS);
  res.setTimeout(REQUEST_TIMEOUT_MS);
  next();
});

// Content-Type validation for POST/PUT/PATCH (only if body is present)
app.use((req: any, res: any, next: any) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentLength = req.get('content-length');
    const hasBody = contentLength && parseInt(contentLength) > 0;
    
    if (hasBody && !req.is('application/json')) {
      return res.status(415).json({ error: 'Content-Type must be application/json' });
    }
  }
  next();
});

// Apply general rate limiting to all routes
app.use(generalLimiter);

app.use(consentRoutes);
app.use('/webhooks', webhookRoutes);
app.use('/auth', authRoutes);
app.use('/api', userRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "UP" });
});

/**
 * Prometheus metrics endpoint
 * Exposes metrics for scraping by Prometheus
 */
app.get("/metrics", async (req, res) => {
  try {
    res.set('Content-Type', metricsRegister.contentType);
    const metrics = await metricsRegister.metrics();
    res.send(metrics);
  } catch (error) {
    logger.error('Failed to generate metrics', { error });
    res.status(500).send('Failed to generate metrics');
  }
});

/**
 * GET /api/consents
 * Get consents for the current user (Data Principal Dashboard)
 * Supports filtering by status, purpose, organization
 * Supports pagination
 */
const GetConsentsQuerySchema = z.object({
  status: z.enum(['REQUESTED', 'ACTIVE', 'REJECTED', 'REVOKED', 'EXPIRED']).optional(),
  purpose: z.string().optional(),
  organizationName: z.string().optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  sortBy: z.enum(['created_at', 'valid_until', 'purpose']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

app.get(
  "/api/consents",
  authenticateJWT,
  validate({ query: GetConsentsQuerySchema }),
  wrap(async (req: any, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { status, purpose, organizationName, page, limit, sortBy, sortOrder } = req.query;

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

import { expireDueConsents } from "./jobs/expireConsentsJob";

// NOTE: expiry is enfconsentCreationLimiter, orced by the cron job below and by the scheduled job
// Do not use a separate setInterval here to avoid duplicated runs.

app.post("/consents", consentCreationLimiter, validate({ body: CreateConsentSchema }), wrap(async (req, res) => {
  const { userId, purpose, dataTypes, validUntil, noticeId, noticeVersion, language } = req.body;

  if (!userId || !purpose || !dataTypes || !validUntil || !noticeId || !noticeVersion || !language) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  if (!Array.isArray(dataTypes) || !dataTypes.every((dt: any) => typeof dt === "string")) {
    return res.status(400).json({ error: "Invalid dataTypes format" });
  }

  //const consentId = `consent_${Date.now()}`;
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

  // Emit NOTICE_SHOWN audit event for DPDP compliance
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
    //consentMode: 'EXPLICIT' | 'IMPLICIT' // default EXPLICIT
    message: "Consent awaiting approval"
  });
}));

const UuidParamSchema = z.object({
  id: z.string().min(1, "Invalid id")
});

app.get("/consents/:id", validate({ params: UuidParamSchema }), wrap(async (req, res) => {
  const consentId = req.params.id;

  try {
    // 🔹 Attempt expiry first
    const expiredConsent = await expireConsentIfNeeded(consentId);

    if (expiredConsent) {
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

    // 🔹 Otherwise fetch normally
    const consent = await getConsentById(consentId);

    if (!consent) {
      return res.status(404).json({ error: "Consent not found" });
    }

    res.json(consent);
  } catch (err) {
    // Catch database errors and return 404 for invalid IDs
    console.error("Error fetching consent:", err);
    return res.status(404).json({ error: "Consent not found" });
  }
}));

// 🧾 P0-3: Consent Receipt Export API (ISO/IEC 29184 compliant)
app.get("/consents/:id/receipt", validate({ params: UuidParamSchema }), wrap(async (req, res) => {
  const consentId = req.params.id;

  try {
    // Fetch consent (allow expired for receipt generation)
    const consent = await getConsentByIdAllowExpired(consentId);

    if (!consent) {
      return res.status(404).json({ error: "Consent not found" });
    }

    // Generate ISO/IEC 29184 receipt
    const receiptId = uuidv7();
    const receipt = generateConsentReceipt(consent, receiptId);

    // Log receipt generation for audit trail
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
    return res.status(500).json({ error: "Failed to generate consent receipt" });
  }
}));

// 🧾 P0-3: Consent Receipt PDF Export
app.get("/consents/:id/receipt.pdf", validate({ params: UuidParamSchema }), wrap(async (req, res) => {
  const consentId = req.params.id;

  try {
    // Fetch consent (allow expired for receipt generation)
    const consent = await getConsentByIdAllowExpired(consentId);

    if (!consent) {
      return res.status(404).json({ error: "Consent not found" });
    }

    // Generate ISO/IEC 29184 receipt
    const receiptId = uuidv7();
    const receipt = generateConsentReceipt(consent, receiptId);

    // Generate PDF document
    const pdfDoc = generateReceiptPDF(receipt);

    // Log receipt generation for audit trail
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

    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="consent-receipt-${consentId}.pdf"`);

    // Pipe PDF to response
    pdfDoc.pipe(res);
  } catch (err) {
    console.error("Error generating PDF receipt:", err);
    return res.status(500).json({ error: "Failed to generate PDF receipt" });
  }
}));

app.post("/consents/:id/revoke", validate({ params: UuidParamSchema }),wrap(async (req, res) => {
  try {
    const consent = await getConsentById(req.params.id);

    if (!consent) {
      return res.status(404).json({ error: "Consent not found" });
    }

    if (consent.status === "REVOKED") {
      return res.status(400).json({ error: "Consent already revoked" });
    }

    // Only allow revoking ACTIVE consents
    if (consent.status !== "ACTIVE") {
      return res.status(400).json({ 
        error: "Consent already revoked" 
      });
    }

    const revoked = await revokeConsent(consent.consentId);

    if (!revoked) {
      return res.status(400).json({ error: "Consent could not be revoked" });
    }

    await recordAudit({
      auditId: uuidv7(),
      eventType: "CONSENT_REVOKED",
      consentId: consent.consentId,
      userId: consent.userId,
      timestamp: new Date().toISOString(),
      details: { status: "REVOKED" },
    });

    // Emit webhook event for Data Fiduciaries
    await emitWebhookEvent('CONSENT_REVOKED', {
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
}));

/**
 * Semantic revocation
 * User-facing, DPDP-compliant revocation
 * Revokes the latest ACTIVE consent for (userId, purpose)
 */
app.post("/consents/revoke", validate({ body: RevokeSemanticSchema }), wrap(async (req, res) => {
  const { userId, purpose } = req.body;

  if (typeof userId !== "string" || typeof purpose !== "string") {
    return res.status(400).json({
      error: "userId and purpose are required"
    });
  }

  // 1️⃣ Resolve authoritative consent
  const consent = await getLatestActiveConsent(userId, purpose);

  // 2️⃣ Idempotent behavior (enterprise-grade)
  if (!consent) {
    return res.json({
      status: "NO_ACTIVE_CONSENT",
      purpose
    });
  }

  // 3️⃣ Revoke resolved consent
  const revoked = await revokeConsent(consent.consentId);

  // If revoke failed (consent was already revoked), return error
  if (!revoked) {
    return res.status(400).json({
      error: "Consent could not be revoked"
    });
  }

  // 4️⃣ Audit
  await recordAudit({
    auditId: uuidv7(),
    eventType: "CONSENT_REVOKED",
    consentId: consent.consentId,
    userId,
    timestamp: new Date().toISOString(),
    details: {
      purpose,
      version: consent.version,
      revokedVia: "SEMANTIC"
    }
  });

  // Emit webhook event
  await emitWebhookEvent('CONSENT_REVOKED', {
    consentId: consent.consentId,
    userId,
    purpose,
    revokedAt: new Date().toISOString(),
  });

  res.json({
    status: "REVOKED",
    purpose
  });
}));

app.get("/audit", adminLimiter, authenticateJWT, requirePermission("AUDIT_READ"), wrap(async (req: any, res: any) => {
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
      pages: Math.ceil(total / limit)
    }
  });
}));

// ============================================================================
// ACTIVITY LOG ENDPOINT (Data Principal's own audit events)
// ============================================================================

/**
 * GET /api/activity-log
 * Get audit events for the current user (Data Principal Dashboard)
 * This endpoint allows users to view their own activity without AUDIT_READ permission
 */
app.get(
  "/api/activity-log",
  generalLimiter,
  authenticateJWT,
  wrap(async (req: any, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const hasPage = typeof req.query.page !== "undefined";
    const hasLimit = typeof req.query.limit !== "undefined";
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

    const allLogs = await getAllAuditLogs();
    
    // Filter logs for current user only
    const userLogs = allLogs.filter(log => log.userId === req.user.userId);

    // Sort by timestamp descending (most recent first)
    userLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (!hasPage && !hasLimit) {
      return res.json({
        success: true,
        data: userLogs,
      });
    }

    const total = userLogs.length;
    const start = (page - 1) * limit;
    const paginatedLogs = userLogs.slice(start, start + limit);

    res.json({
      success: true,
      data: paginatedLogs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  })
);

// ============================================================================
// ERASURE REQUEST ENDPOINTS (DPDP Section 12(1) - Right to Erasure)
// ============================================================================

/**
 * POST /api/erasure-requests
 * Create a new erasure request (Data Principal)
 */
app.post(
  "/api/erasure-requests",
  generalLimiter,
  authenticateJWT,
  validate({ body: CreateErasureRequestSchema }),
  wrap(async (req: any, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { reason, additionalNotes } = req.body;

    const request = await createErasureRequest({
      userId: req.user.userId,
      reason,
      additionalNotes,
    });

    // Record audit event
    await recordAudit({
      auditId: uuidv7(),
      eventType: "ERASURE_REQUESTED",
      consentId: "N/A", // No specific consent
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
app.get(
  "/api/erasure-requests",
  generalLimiter,
  authenticateJWT,
  wrap(async (req: any, res) => {
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
app.get(
  "/api/erasure-requests/:id",
  generalLimiter,
  authenticateJWT,
  validate({ params: ErasureRequestUuidParamSchema }),
  wrap(async (req: any, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const request = await getErasureRequestById(req.params.id);

    if (!request) {
      return res.status(404).json({ error: "Erasure request not found" });
    }

    // Only allow user to view their own requests
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
app.get(
  "/admin/erasure-requests",
  adminLimiter,
  authenticateJWT,
  requirePermission("ADMIN"),
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
app.patch(
  "/admin/erasure-requests/:id/status",
  adminLimiter,
  authenticateJWT,
  requirePermission("ADMIN"),
  validate({ 
    params: ErasureRequestUuidParamSchema, 
    body: UpdateErasureRequestStatusSchema 
  }),
  wrap(async (req: any, res) => {
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

    // Record audit event
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

app.listen(PORT, () => {
  logger.info('Consent Manager backend running', { 
    port: PORT,
    environment: process.env.NODE_ENV || 'dev',
    metricsEnabled: true,
  });
  console.log(`Consent Manager backend running on port ${PORT}`);
});

/**
 * 🔁 Consent lifecycle enforcement cron
 * Runs every 10 minutes
 * Safe, idempotent, DPDP-compliant
 */
cron.schedule("*/10 * * * *", async () => {
  try {
    // 1️⃣ Expire ACTIVE consents past validity (records audits)
    await expireDueConsents();

    // 2️⃣ Reject stale REQUESTED consents and record audits
    const rejected = await pool.query(`
      UPDATE consents
      SET status = 'REJECTED',
          approval_token = NULL,
          approval_expires_at = NULL
      WHERE status = 'REQUESTED'
        AND valid_until < NOW()
      RETURNING *
    `);

    for (const row of rejected.rows) {
      await recordAudit({
        auditId: uuidv7(),
        eventType: "CONSENT_REJECTED",
        consentId: row.consent_id,
        userId: row.user_id,
        timestamp: new Date().toISOString(),
        details: {
          version: row.version,
          validUntil: row.valid_until,
          rejectedVia: "SCHEDULED_JOB",
        },
      });
    }

    if (rejected.rowCount) {
      console.log(
        `[CRON] Rejected ${rejected.rowCount} consents`
      );
    }
  } catch (err) {
    console.error("[CRON] Consent lifecycle job failed", err);
  }
});

/**
 * Webhook delivery processor
 * Runs every 2 minutes to process pending webhook deliveries with retry logic
 */
cron.schedule("*/2 * * * *", async () => {
  try {
    await processWebhookDeliveries();
  } catch (err) {
    logger.error('[CRON] Webhook delivery job failed', { error: err });
  }
});

/**
 * Metrics update job
 * Updates Prometheus gauges every 5 minutes
 */
cron.schedule("*/5 * * * *", async () => {
  try {
    await updateActiveConsentsGauge(pool);
  } catch (err) {
    logger.error('[CRON] Metrics update job failed', { error: err });
  }
});

app.post("/process", processLimiter, validate({ body: ProcessRequestSchema }), wrap(async (req, res) => {

  const { userId, purpose, dataTypes } = req.body;

  // 1️⃣ Resolve authoritative consent
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
      consentId: anyConsent.rows.length ? anyConsent.rows[0].consent_id : "UNKNOWN",
      userId,
      timestamp: new Date().toISOString(),
      details: {
        reason: "No active consent",
        purpose,
      },
    });
    return res.status(403).json({ error: "No active consent" });
  }

  // 2️⃣ DPDP §6: Check expiry immediately before processing
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

  // 3️⃣ Policy enforcement (scope only)
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

  // 4️⃣ Allowed
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
}));

/**
 * ADMIN: Force-expire a consent immediately
 * Use-case: regulatory, grievance, emergency stop
 * Requires JWT authentication with CONSENT_FORCE_EXPIRE permission
 */
app.post("/admin/consents/:id/expire", adminLimiter, authenticateJWT, requirePermission("CONSENT_FORCE_EXPIRE"), validate({ params: UuidParamSchema }), wrap(async (req, res) => {
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
    // Audit the denied admin attempt — DPDP regulatory traceability
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
}));

// Global error handler (catches unexpected errors)
app.use((err: any, req: any, res: any, next: any) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});