import "./db";
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
import { validate } from "./middleware/validate";

import express from "express";
import consentRoutes from "./routes/consentRoutes";

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(consentRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "UP" });
});

app.post("/consents", async (req, res) => {
  const { userId, purpose, dataTypes, validUntil } = req.body;

  if (!userId || !purpose || !dataTypes || !validUntil) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  if (!Array.isArray(dataTypes) || !dataTypes.every(dt => typeof dt === "string")) {
    return res.status(400).json({ error: "Invalid dataTypes format" });
  }

  const consentId = `consent_${Date.now()}`;

  await createConsent({
    consentId,
    userId,
    purpose,
    dataTypes,
    validUntil,
  });

  await recordAudit({
    auditId: `audit_${Date.now()}`,
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
    message: "Consent awaiting approval"
  });
});

app.get("/consents/:id", async (req, res) => {
  const consentId = req.params.id;

  // 🔹 Attempt expiry first
  const expiredConsent = await expireConsentIfNeeded(consentId);

  if (expiredConsent) {
    await recordAudit({
      auditId: `audit_${Date.now()}`,
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
});

app.post("/consents/:id/revoke", async (req, res) => {
  const consent = await getConsentById(req.params.id);

  if (!consent) {
    return res.status(404).json({ error: "Consent not found" });
  }

  if (consent.status === "REVOKED") {
    return res.status(400).json({ error: "Consent already revoked" });
  }

  await revokeConsent(consent.consentId);

  await recordAudit({
    auditId: `audit_${Date.now()}`,
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
});

/**
 * Semantic revocation
 * User-facing, DPDP-compliant revocation
 * Revokes the latest ACTIVE consent for (userId, purpose)
 */
app.post("/consents/revoke", async (req, res) => {
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
  await revokeConsent(consent.consentId);

  // 4️⃣ Audit
  await recordAudit({
    auditId: `audit_${Date.now()}`,
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
});

app.get("/audit", async (req, res) => {
  const logs = await getAllAuditLogs();
  res.json(logs);
});

app.listen(PORT, () => {
  console.log(`Consent Manager backend running on port ${PORT}`);
});

// INVARIANT:
// Enforcement always uses latest ACTIVE consent version per (userId, purpose)
// Historical consent IDs are never evaluated for processing
app.post("/process", validate(ProcessRequestSchema), async (req, res) => {
  /*
  if (!req.body || typeof req.body !== "object") {
    return res.status(400).json({ error: "Request body must be a JSON object" });
  }

  const allowedKeys = ["userId", "purpose", "dataTypes"];
  const requestKeys = Object.keys(req.body);

  const hasOnlyAllowedKeys =
    requestKeys.length === allowedKeys.length &&
    allowedKeys.every(k => requestKeys.includes(k));

  if (!hasOnlyAllowedKeys) {
    return res.status(400).json({
      error: "Invalid request shape. Only userId, purpose, dataTypes allowed."
    });
  }
  */

  const { userId, purpose, dataTypes } = req.body;

  /**
   * 🔒 Strict value validation (DPDP-safe)
   * Prevents type confusion, coercion attacks, malformed payloads
   */
  /*
  if (
    typeof userId !== "string" ||
    typeof purpose !== "string" ||
    !Array.isArray(dataTypes) ||
    dataTypes.length === 0 ||
    !dataTypes.every(dt => typeof dt === "string")
  ) {
    return res.status(400).json({ error: "Invalid request values" });
  }
  */

  // 1️⃣ Fetch latest ACTIVE consent (authoritative)
  const consent = await getLatestActiveConsent(userId, purpose);
  if (!consent) {
    return res.status(403).json({ error: "No active consent" });
  }

  // 2️⃣ Enforce expiry on authoritative version
  const expiredConsent = await expireConsentIfNeeded(consent.consentId);

  if (expiredConsent) {
    await recordAudit({
      auditId: `audit_${Date.now()}`,
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

    return res.status(403).json({ error: "Consent expired" });
  }

  // 3️⃣ Policy enfrocement (version-aware)
  const decision = evaluateConsentPolicy(consent, {
    purpose,
    dataTypes,
    version: consent.version,
  });

  if (!decision.allow) {
    await recordAudit({
      auditId: `audit_${Date.now()}`,
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

  // OPTIONAL Phase 3.5 – basic replay guard
  // Future: replace with processing_sessions table
  // 4️⃣ Allowed
  await recordAudit({
    auditId: `audit_${Date.now()}`,
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
});