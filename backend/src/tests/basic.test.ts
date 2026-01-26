/**
 * Comprehensive unit tests for consent flows
 * Run with: npm test
 * 
 * This covers:
 * - Audit chain integrity
 * - Policy engine validation
 * - Status enforcement
 * - Data type handling
 */

import { verifyAuditChain } from "../utils/verifyAuditChain";
import { evaluateConsentPolicy } from "../policy/policyEngine";
import { Consent } from "../repositories/consentRepo";
import { AuditLog } from "../repositories/auditRepo";
import crypto from "crypto";

// Helper to compute audit hash
const computeHash = (
  prevHash: string | null,
  auditId: string,
  eventType: string,
  consentId: string,
  userId: string,
  timestamp: string,
  details: any
) => {
  const payload =
    (prevHash ?? "") +
    auditId +
    eventType +
    consentId +
    userId +
    timestamp +
    JSON.stringify(details);
  return crypto.createHash("sha256").update(payload).digest("hex");
};

const mockConsent: Consent = {
  consentId: "consent-1",
  consentGroupId: "user-1:marketing",
  version: 1,
  userId: "user-1",
  purpose: "marketing",
  dataTypes: ["email", "phone"],
  validUntil: new Date(Date.now() + 86400000).toISOString(),
  status: "ACTIVE",
  approvalToken: null,
  approvalExpiresAt: null,
};

let passedTests = 0;
let totalTests = 0;

const test = (name: string, assertion: boolean, expected: boolean = true) => {
  totalTests++;
  const passed = assertion === expected;
  if (passed) passedTests++;
  const status = passed ? "✓ PASS" : "✗ FAIL";
  console.log(`  ${status}: ${name}`);
  return passed;
};

// ============================================================================
// LEVEL 1: AUDIT CHAIN TESTS
// ============================================================================
console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("LEVEL 1: AUDIT CHAIN VERIFICATION");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

// Test 1: Single audit log
console.log("\nTest Suite 1: Single Audit Log");
const log1: AuditLog = {
  auditId: "audit-1",
  eventType: "CONSENT_REQUESTED",
  consentId: "consent-1",
  userId: "user-1",
  timestamp: "2024-01-10T10:00:00Z",
  details: { purpose: "marketing" },
  prevHash: null,
  hash: "",
};
log1.hash = computeHash(
  null,
  log1.auditId,
  log1.eventType,
  log1.consentId,
  log1.userId,
  log1.timestamp,
  log1.details
);
test("Single log chain valid", verifyAuditChain([log1]));

// Test 2: Two chained logs
console.log("\nTest Suite 2: Chained Audit Logs");
const log2: AuditLog = {
  auditId: "audit-2",
  eventType: "CONSENT_APPROVED",
  consentId: "consent-1",
  userId: "user-1",
  timestamp: "2024-01-10T10:01:00Z",
  details: { version: 1 },
  prevHash: log1.hash,
  hash: "",
};
log2.hash = computeHash(
  log1.hash,
  log2.auditId,
  log2.eventType,
  log2.consentId,
  log2.userId,
  log2.timestamp,
  log2.details
);
test("Two logs chain valid", verifyAuditChain([log1, log2]));

// Test 3: Tampered hash
console.log("\nTest Suite 3: Tampered Hash Detection");
const tamperedLog: AuditLog = { ...log2, hash: "invalid_hash" };
test("Tampered hash detected", !verifyAuditChain([log1, tamperedLog]));

// Test 4: Wrong previous hash
console.log("\nTest Suite 4: Wrong Previous Hash Link");
const wrongChainLog: AuditLog = { ...log2, prevHash: "wrong_hash" };
wrongChainLog.hash = computeHash(
  "wrong_hash",
  wrongChainLog.auditId,
  wrongChainLog.eventType,
  wrongChainLog.consentId,
  wrongChainLog.userId,
  wrongChainLog.timestamp,
  wrongChainLog.details
);
test("Wrong prevHash link detected", !verifyAuditChain([log1, wrongChainLog]));

// ============================================================================
// LEVEL 2: POLICY ENGINE - BASIC TESTS
// ============================================================================
console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("LEVEL 2: POLICY ENGINE - PURPOSE & STATUS");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

// Test 5: Exact purpose match
console.log("\nTest Suite 5: Purpose Matching");
const decisionExactMatch = evaluateConsentPolicy(mockConsent, {
  purpose: "marketing",
  dataTypes: ["email"],
  version: 1,
});
test("Exact purpose match allowed", decisionExactMatch.allow);

const decisionWrongPurpose = evaluateConsentPolicy(mockConsent, {
  purpose: "analytics",
  dataTypes: ["email"],
  version: 1,
});
test("Different purpose denied", !decisionWrongPurpose.allow);

// Test 6: Case sensitivity
console.log("\nTest Suite 6: Case Sensitivity");
const decisionCaseMismatch = evaluateConsentPolicy(mockConsent, {
  purpose: "Marketing", // Capital M
  dataTypes: ["email"],
  version: 1,
});
test("Case-sensitive purpose check", !decisionCaseMismatch.allow);

// Test 7: Version matching
console.log("\nTest Suite 7: Version Anti-Replay");
const decisionStaleVersion = evaluateConsentPolicy(mockConsent, {
  purpose: "marketing",
  dataTypes: ["email"],
  version: 2, // Different version
});
test("Stale version rejected", !decisionStaleVersion.allow);

const decisionCorrectVersion = evaluateConsentPolicy(mockConsent, {
  purpose: "marketing",
  dataTypes: ["email"],
  version: 1,
});
test("Matching version allowed", decisionCorrectVersion.allow);

// Test 8: Status enforcement
console.log("\nTest Suite 8: Status Validation");
const inactiveStatuses: Consent["status"][] = [
  "REVOKED",
  "REJECTED",
  "EXPIRED",
  "REQUESTED",
];
for (const status of inactiveStatuses) {
  const inactiveConsent = { ...mockConsent, status };
  const decision = evaluateConsentPolicy(inactiveConsent, {
    purpose: "marketing",
    dataTypes: ["email"],
    version: 1,
  });
  test(`${status} status rejected`, !decision.allow);
}

// ============================================================================
// LEVEL 3: POLICY ENGINE - DATA TYPES VALIDATION
// ============================================================================
console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("LEVEL 3: POLICY ENGINE - DATA TYPE ENFORCEMENT");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

// Test 9: Exact subset match
console.log("\nTest Suite 9: DataTypes Subset Enforcement");
test(
  "Single consented type allowed",
  evaluateConsentPolicy(mockConsent, {
    purpose: "marketing",
    dataTypes: ["email"],
    version: 1,
  }).allow
);

test(
  "Multiple consented types allowed",
  evaluateConsentPolicy(mockConsent, {
    purpose: "marketing",
    dataTypes: ["email", "phone"],
    version: 1,
  }).allow
);

test(
  "Unconsented type denied",
  evaluateConsentPolicy(mockConsent, {
    purpose: "marketing",
    dataTypes: ["location"],
    version: 1,
  }).allow,
  false
);

test(
  "Mix of consented and unconsented denied",
  evaluateConsentPolicy(mockConsent, {
    purpose: "marketing",
    dataTypes: ["email", "location"],
    version: 1,
  }).allow,
  false
);

// Test 10: Case sensitivity in dataTypes
console.log("\nTest Suite 10: DataTypes Case Sensitivity");
test(
  "Case-sensitive email check",
  evaluateConsentPolicy(mockConsent, {
    purpose: "marketing",
    dataTypes: ["Email"], // Capital E
    version: 1,
  }).allow,
  false
);

test(
  "Case-sensitive phone check",
  evaluateConsentPolicy(mockConsent, {
    purpose: "marketing",
    dataTypes: ["Phone"], // Capital P
    version: 1,
  }).allow,
  false
);

// Test 11: Overlapping but not identical
console.log("\nTest Suite 11: Partial Overlaps");
const extendedConsent: Consent = {
  ...mockConsent,
  dataTypes: ["email", "phone", "address"],
};
test(
  "Requesting superset of consented denied",
  evaluateConsentPolicy(extendedConsent, {
    purpose: "marketing",
    dataTypes: ["email", "phone", "address", "ssn"],
    version: 1,
  }).allow,
  false
);

test(
  "Requesting subset of consented allowed",
  evaluateConsentPolicy(extendedConsent, {
    purpose: "marketing",
    dataTypes: ["email"],
    version: 1,
  }).allow
);

// ============================================================================
// LEVEL 4: EDGE CASES & DEFENSIVE CHECKS
// ============================================================================
console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("LEVEL 4: EDGE CASES & BOUNDARY CONDITIONS");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

// Test 12: Very long purpose string
console.log("\nTest Suite 12: Long Strings");
const longPurpose = "a".repeat(10000);
test(
  "Long purpose string handled",
  evaluateConsentPolicy(mockConsent, {
    purpose: longPurpose,
    dataTypes: ["email"],
    version: 1,
  }).allow,
  false
);

// Test 13: Large dataTypes array
console.log("\nTest Suite 13: Large DataTypes Array");
const largeDataTypes = Array.from({ length: 100 }, (_, i) => `type-${i}`);
const consentWithManyTypes: Consent = {
  ...mockConsent,
  dataTypes: largeDataTypes,
};
const subsetRequest = largeDataTypes.slice(0, 50);
test(
  "Large dataTypes array - subset allowed",
  evaluateConsentPolicy(consentWithManyTypes, {
    purpose: "marketing",
    dataTypes: subsetRequest,
    version: 1,
  }).allow
);

// Test 14: Empty or special values
console.log("\nTest Suite 14: Empty/Special Values");
const emptyDataTypesConsent: Consent = {
  ...mockConsent,
  dataTypes: [],
};
test(
  "Empty dataTypes consent denies all requests",
  evaluateConsentPolicy(emptyDataTypesConsent, {
    purpose: "marketing",
    dataTypes: ["email"],
    version: 1,
  }).allow,
  false
);

// Test 15: Numeric version 0
console.log("\nTest Suite 15: Version Edge Cases");
test(
  "Version 0 mismatch denied",
  evaluateConsentPolicy(mockConsent, {
    purpose: "marketing",
    dataTypes: ["email"],
    version: 0,
  }).allow,
  false
);

test(
  "Negative version mismatch denied",
  evaluateConsentPolicy(mockConsent, {
    purpose: "marketing",
    dataTypes: ["email"],
    version: -1,
  }).allow,
  false
);

// ============================================================================
// TEST SUMMARY
// ============================================================================
console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("TEST SUMMARY");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log(`\nTotal Tests: ${totalTests}`);
console.log(`Passed: ${passedTests}`);
console.log(`Failed: ${totalTests - passedTests}`);

if (passedTests === totalTests) {
  console.log("\n✅ All tests PASSED! System is robust.");
  process.exit(0);
} else {
  console.log(`\n❌ ${totalTests - passedTests} test(s) FAILED!`);
  process.exit(1);
}
