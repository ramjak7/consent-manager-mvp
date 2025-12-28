import "./db";
import {
  createConsent,
  getConsentById,
  revokeConsent,
} from "./repositories/consentRepo";
import {
  recordAudit,
  getAllAuditLogs,
} from "./repositories/auditRepo";

import express from "express";

const app = express();
const PORT = 3000;

app.use(express.json());

type Consent = {
  consentId: string;
  userId: string;
  purpose: string;
  dataTypes: string[];
  validUntil: string;
  status: "ACTIVE" | "REVOKED";
};

const consents: Consent[] = [];

type AuditEventType =
  | "CONSENT_CREATED"
  | "CONSENT_REVOKED";

type AuditLog = {
  auditId: string;
  eventType: AuditEventType;
  consentId: string;
  userId: string;
  timestamp: string;
  details: {
    purpose: string;
    dataTypes: string[];
    validUntil: string;
    status: string;
  };
};

const auditLogs: AuditLog[] = [];

function recordAuditEvent(
  eventType: AuditEventType,
  consent: Consent
) {
  const audit: AuditLog = {
    auditId: `audit_${auditLogs.length + 1}`,
    eventType,
    consentId: consent.consentId,
    userId: consent.userId,
    timestamp: new Date().toISOString(),
    details: {
      purpose: consent.purpose,
      dataTypes: consent.dataTypes,
      validUntil: consent.validUntil,
      status: consent.status,
    },
  };

  auditLogs.push(audit);
}

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
    details: consent,
  });

  res.status(201).json({
    consentId: consent.consentId,
    status: consent.status,
  });
});

app.get("/consents/:id", async (req, res) => {
  const consent = await getConsentById(req.params.id);

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
