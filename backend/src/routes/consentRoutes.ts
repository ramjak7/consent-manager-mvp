import { Router } from "express";
import {
  approveConsentByToken,
  rejectConsentByToken,
} from "../repositories/consentRepo";
import { recordAudit } from "../repositories/auditRepo";

const router = Router();

router.post("/consents/approve/:token", async (req, res) => {
  const { token } = req.params;

  const consent = await approveConsentByToken(token);

  if (!consent) {
    return res.status(400).json({
      error: "Invalid, expired, or already-used approval token",
    });
  }

  await recordAudit({
    auditId: `audit_${Date.now()}`,
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
    status: "APPROVED",
    consentId: consent.consentId,
  });
});

router.post("/consents/reject/:token", async (req, res) => {
  const { token } = req.params;

  const consent = await rejectConsentByToken(token);

  if (!consent) {
    return res.status(400).json({
      error: "Invalid, expired, or already-used approval token",
    });
  }

  await recordAudit({
    auditId: `audit_${Date.now()}`,
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
});

export default router;