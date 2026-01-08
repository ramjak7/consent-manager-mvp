import crypto from "crypto";

export function computeAuditHash(input: {
  prevHash: string | null;
  auditId: string;
  eventType: string;
  consentId: string;
  userId: string;
  timestamp: string;
  details: any;
}): string {
  const payload =
    (input.prevHash ?? "") +
    input.auditId +
    input.eventType +
    input.consentId +
    input.userId +
    input.timestamp +
    JSON.stringify(input.details);

  return crypto
    .createHash("sha256")
    .update(payload)
    .digest("hex");
}