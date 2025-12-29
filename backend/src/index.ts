import "./db";
import {
  createConsent,
  getConsentById,
  revokeConsent,
  expireConsentIfNeeded,
} from "./repositories/consentRepo";
import {
  recordAudit,
  getAllAuditLogs,
  AuditEventType,
} from "./repositories/auditRepo";

import express from "express";

const app = express();
const PORT = 3000;

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "UP" });
});

app.post("/consents", async (req, res) => {
  const { userId, purpose, dataTypes, validUntil } = req.body;

  if (!userId || !purpose || !dataTypes || !validUntil) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const consent = {
    consentId: `consent_${Date.now()}`,
    userId,
    purpose,
    dataTypes,
    validUntil,
    status: "ACTIVE" as const,
  };

  await createConsent(consent);

  await recordAudit({
    auditId: `audit_${Date.now()}`,
    eventType: "CONSENT_CREATED",
    consentId: consent.consentId,
    userId,
    timestamp: new Date().toISOString(),
    details: {
      purpose: consent.purpose,
      dataTypes: consent.dataTypes,
      validUntil: consent.validUntil,
      status: consent.status,
    },
  });

  res.status(201).json({
    consentId: consent.consentId,
    status: consent.status,
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

app.get("/audit", async (req, res) => {
  const logs = await getAllAuditLogs();
  res.json(logs);
});

app.listen(PORT, () => {
  console.log(`Consent Manager backend running on port ${PORT}`);
});
