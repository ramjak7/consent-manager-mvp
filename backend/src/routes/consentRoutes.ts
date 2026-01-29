import { Router, Request, Response } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate";
import {
  approveConsentByToken,
  rejectConsentByToken,
} from "../repositories/consentRepo";
import { recordAudit } from "../repositories/auditRepo";
import { v7 as uuidv7 } from "uuid";
const router = Router();

const EmptyBody = z.object({}).strict();
const TokenParam = z.object({ token: z.string().min(32) });
type TokenParams = z.infer<typeof TokenParam>;

router.post("/consents/approve/:token", validate({ params: TokenParam, body: EmptyBody }), async (req: Request<TokenParams>, res: Response) => {
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

router.post("/consents/reject/:token", validate({ params: TokenParam, body: EmptyBody }), async (req: Request<TokenParams>, res: Response) => {
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