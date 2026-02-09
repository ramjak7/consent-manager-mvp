import crypto from "crypto";

function stableStringify(value: any): string {
  const canonicalize = (val: any): any => {
    if (val === null || typeof val !== "object") {
      return val;
    }
    if (Array.isArray(val)) {
      return val.map(canonicalize);
    }
    const result: Record<string, any> = {};
    for (const key of Object.keys(val).sort()) {
      result[key] = canonicalize(val[key]);
    }
    return result;
  };

  return JSON.stringify(canonicalize(value));
}

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
    stableStringify(input.details);

  return crypto
    .createHash("sha256")
    .update(payload)
    .digest("hex");
}