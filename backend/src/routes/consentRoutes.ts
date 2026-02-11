import { Router, Request, Response } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate";
import { tokenEndpointLimiter } from "../middleware/rateLimiter";
import {
  approveConsentByToken,
  rejectConsentByToken,
} from "../repositories/consentRepo";
import { recordAudit } from "../repositories/auditRepo";
import { v7 as uuidv7 } from "uuid";
const router = Router();

const TokenParam = z.object({ token: z.string().min(32, "Invalid approval token") });
type TokenParams = z.infer<typeof TokenParam>;

router.post("/consents/approve/:token", tokenEndpointLimiter, validate({ params: TokenParam }), async (req: Request<TokenParams>, res: Response) => {
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
});

router.post("/consents/reject/:token", tokenEndpointLimiter, validate({ params: TokenParam }), async (req: Request<TokenParams>, res: Response) => {
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
});

export default router;