import "dotenv/config";
// Log the current environment mode (e.g., 'dev', 'staging', 'production') on startup for debugging.
console.log("Running build:", process.env.NODE_ENV || "dev");
import "./db";
import { pool } from "./db";
import cron from "node-cron";
import {
  createConsent,
  getConsentById,
  getLatestActiveConsent,
  revokeConsent,
  expireConsentIfNeeded,
} from "./repositories/consentRepo";
import {
  recordAudit,
  getAllAuditLogs,
} from "./repositories/auditRepo";
import { evaluateConsentPolicy } from "./policy/policyEngine";
import { ProcessRequestSchema } from "./schemas/process.schema";
import { CreateConsentSchema, RevokeSemanticSchema } from "./schemas/consent.schema";
import { validate } from "./middleware/validate";
import { requireApiKey } from "./middleware/auth";
import { v7 as uuidv7 } from "uuid";
import express from "express";
import consentRoutes from "./routes/consentRoutes";

const app = express();
const PORT = 3000;
const REQUEST_TIMEOUT_MS = 30000; // 30 seconds

// async wrapper to catch errors from async route handlers
const wrap = (fn: (req: any, res: any, next?: any) => Promise<any>) => 
  (req: any, res: any, next: any) =>
    Promise.resolve(fn(req, res, next)).catch(next);

// Limit request body size to 1MB
app.use(express.json({ limit: '1mb' }));

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

app.use(consentRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "UP" });
});

import { expireDueConsents } from "./jobs/expireConsentsJob";

// NOTE: expiry is enforced by the cron job below and by the scheduled job
// Do not use a separate setInterval here to avoid duplicated runs.

app.post("/consents", validate(CreateConsentSchema), wrap(async (req: any, res: any) => {
  const { userId, purpose, dataTypes, validUntil } = req.body;

  if (!userId || !purpose || !dataTypes || !validUntil) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  if (!Array.isArray(dataTypes) || !dataTypes.every((dt: any) => typeof dt === "string")) {
    return res.status(400).json({ error: "Invalid dataTypes format" });
  }

  //const consentId = `consent_${Date.now()}`;
  const consentId = uuidv7();

  await createConsent({
    consentId,
    userId,
    purpose,
    dataTypes,
    validUntil,
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
      approvalRequired: true
    },
  });

  res.status(201).json({
    consentId,
    status: "REQUESTED",
    //consentMode: 'EXPLICIT' | 'IMPLICIT' // default EXPLICIT
    message: "Consent awaiting approval"
  });
}));

app.get("/consents/:id", wrap(async (req: any, res: any) => {
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

app.post("/consents/:id/revoke", wrap(async (req: any, res: any) => {
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
app.post("/consents/revoke", validate(RevokeSemanticSchema), wrap(async (req: any, res: any) => {
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

  res.json({
    status: "REVOKED",
    purpose
  });
}));

app.get("/audit", requireApiKey, wrap(async (req: any, res: any) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(1000, Math.max(1, Number(req.query.limit) || 100));
  const logs = await getAllAuditLogs();
  const total = logs.length;
  const start = (page - 1) * limit;
  res.json({ 
    page, 
    limit, 
    total, 
    logs: logs.slice(start, start + limit),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

app.listen(PORT, () => {
  console.log(`Consent Manager backend running on port ${PORT}`);
});

/**
 * 🔁 Consent lifecycle enforcement cron
 * Runs every 10 minutes
 * Safe, idempotent, DPDP-compliant
 */
cron.schedule("*/10 * * * *", async () => {
  try {
    // 1️⃣ Expire ACTIVE consents past validity
    const expired = await pool.query(`
      UPDATE consents
      SET status = 'EXPIRED'
      WHERE status = 'ACTIVE'
        AND valid_until < NOW()
      RETURNING consent_id, user_id
    `);

    // 2️⃣ Reject stale REQUESTED consents
    const rejected = await pool.query(`
      UPDATE consents
      SET status = 'REJECTED',
          approval_token = NULL,
          approval_expires_at = NULL
      WHERE status = 'REQUESTED'
        AND valid_until < NOW()
      RETURNING consent_id, user_id
    `);

    if (expired.rowCount || rejected.rowCount) {
      console.log(
        `[CRON] Expired ${expired.rowCount}, Rejected ${rejected.rowCount} consents`
      );
    }
  } catch (err) {
    console.error("[CRON] Consent lifecycle job failed", err);
  }
});

app.post("/process", validate(ProcessRequestSchema), wrap(async (req: any, res: any) => {

  const { userId, purpose, dataTypes } = req.body;

  // 1️⃣ Resolve authoritative consent
  const consent = await getLatestActiveConsent(userId, purpose);
  
  if (!consent) {
    // No ACTIVE consent found for this purpose - check if any consent exists to distinguish error
    const anyConsent = await pool.query(
      `SELECT * FROM consents WHERE user_id = $1 AND purpose = $2 LIMIT 1`,
      [userId, purpose]
    );
    
    if (anyConsent.rows.length > 0) {
      // Consent exists but not ACTIVE (revoked, expired, etc.)
      await recordAudit({
        auditId: uuidv7(),
        eventType: "PROCESSING_DENIED",
        consentId: anyConsent.rows[0].consent_id,
        userId,
        timestamp: new Date().toISOString(),
        details: {
          reason: "Consent not active",
          purpose,
        },
      });
      return res.status(403).json({ error: "Consent not active" });
    }
    
    // No consent found at all
    await recordAudit({
      auditId: uuidv7(),
      eventType: "PROCESSING_DENIED",
      consentId: "UNKNOWN",
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
 * Requires ADMIN_API_KEY in X-API-Key header
 */
app.post("/admin/consents/:id/expire", requireApiKey, wrap(async (req: any, res: any) => {
  const consentId = req.params.id;
  const consent = await getConsentById(consentId);

  if (!consent) {
    return res.status(404).json({ error: "Consent not found" });
  }

  let newStatus: "EXPIRED" | "REJECTED";
  let statusChanged = false;

  if (consent.status === "ACTIVE") {
    newStatus = "EXPIRED";
    statusChanged = true;
  } else if (consent.status === "REQUESTED") {
    newStatus = "REJECTED";
    statusChanged = true;
  } else {
    // Already in terminal state - idempotent: return success with current status
    newStatus = consent.status as "EXPIRED" | "REJECTED";
    statusChanged = false;
  }

  if (statusChanged) {
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
  }

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