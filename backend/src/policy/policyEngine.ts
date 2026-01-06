import { Consent } from "../repositories/consentRepo";

export type PolicyDecision =
  | { allow: true }
  | { allow: false; reason: string };

export function evaluateConsentPolicy(
  consent: Consent,
  request: {
    purpose: string;
    dataTypes: string[];
    version: number;
  }
): PolicyDecision {

  // 1️⃣ Consent must be ACTIVE (defense-in-depth)
  if (consent.status !== "ACTIVE") {
    return { allow: false, reason: "Consent not active" };
  }

  // 2️⃣ Purpose must match exactly
  if (request.purpose !== consent.purpose) {
    return { allow: false, reason: "Purpose mismatch" };
  }

  // 3️⃣ Requested ⊆ Consented (Partial Scope Enforcement)
  const consentedSet = new Set(consent.dataTypes);

  for (const dt of request.dataTypes) {
    if (!consentedSet.has(dt)) {
      return {
        allow: false,
        reason: `DataType '${dt}' not consented`
      };
    }
  }

  return { allow: true };
}
