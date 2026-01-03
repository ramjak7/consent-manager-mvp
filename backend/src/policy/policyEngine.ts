import { Consent } from "../repositories/consentRepo";

export type PolicyDecision =
  | { allow: true }
  | { allow: false; reason: string };

export function evaluateConsentPolicy(
  consent: Consent,
  context: {
    purpose: string;
    dataTypes: string[];
  }
): PolicyDecision {
  // 1. Consent must be ACTIVE
  if (consent.status !== "ACTIVE") {
    return { allow: false, reason: "Consent not active" };
  }

  // 2. Purpose must match
  if (consent.purpose !== context.purpose) {
    return { allow: false, reason: "Purpose mismatch" };
  }

  // 3. Requested data must be subset of allowed data
  const unauthorized = context.dataTypes.filter(
    dt => !consent.dataTypes.includes(dt)
  );

  if (unauthorized.length > 0) {
    return {
      allow: false,
      reason: `Unauthorized data types: ${unauthorized.join(", ")}`
    };
  }

  return { allow: true };
}
