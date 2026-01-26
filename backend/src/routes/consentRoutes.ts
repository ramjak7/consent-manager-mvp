import { Router } from "express";
import { z } from "zod";
import {
  approveConsentByToken,
  rejectConsentByToken,
} from "../repositories/consentRepo";
import { recordAudit } from "../repositories/auditRepo";
import { v7 as uuidv7 } from "uuid";
const router = Router();

const ApprovalSchema = z.object({}).strict();
const RejectionSchema = z.object({}).strict();

const validate = (schema: z.ZodSchema) => (req: any, res: any, next: any) => {
  // For empty body requests, pass empty object
  const body = req.body || {};
  const result = schema.safeParse(body);
  if (!result.success) {
    // Return 200 for valid empty requests (approval/rejection with no body)
    // or 400 if actual validation failed
    if (Object.keys(body).length === 0 && schema instanceof z.ZodObject) {
      // Empty body is acceptable for strict empty schemas
      return next();
    }
    return res.status(400).json({ error: result.error.message });
  }
  next();
};

const wrap = (fn: (req: any, res: any, next?: any) => Promise<any>) => 
  (req: any, res: any, next: any) => Promise.resolve(fn(req, res, next)).catch(next);

router.post("/consents/approve/:token", validate(ApprovalSchema), wrap(async (req: any, res: any) => {
  const { token } = req.params;

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
}));

router.post("/consents/reject/:token", validate(RejectionSchema), wrap(async (req: any, res: any) => {
  const { token } = req.params;

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
}));

export default router;