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
  // Defensive check — consent is expected to be ACTIVE
  // Route handler must ensure authoritative resolution
  // 1️⃣ Consent must be ACTIVE (defense-in-depth)
  if (consent.status !== "ACTIVE") {
    return { allow: false, reason: "Consent not active" };
  }

  // 2️⃣ Must be latest version (anti-replay)
  if (request.version !== consent.version) {
    return { allow: false, reason: "Stale consent version" };
  }

  // 3️⃣ Purpose must match exactly
  if (request.purpose !== consent.purpose) {
    return { allow: false, reason: "Purpose mismatch" };
  }

  if (request.dataTypes.length === 0) {
    return { allow: false, reason: "No dataTypes requested" };
  }
  // 4️⃣ Requested ⊆ Consented (Partial Scope Enforcement)
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
