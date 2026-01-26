# Postman Collection Test Specifications

## Overview
This document specifies all the tests to be added/modified in the Postman collection (`CMP-MVP-Tests.postman_collection.json`). Follow these specifications to add tests in the Postman GUI.

---

## Environment Variables Required

Ensure these are set in `CMP-Local.postman_environment.json`:
```json
{
  "baseUrl": "http://localhost:3000",
  "userId": "user-1",
  "purpose": "marketing",
  "dataTypes": ["name", "aadhaar"],
  "adminApiKey": "your-admin-key-here"
}
```

---

## Part 1: Happy Path Tests (Level 3A)

### 1.1 Health Check
**Endpoint:** `GET /health`
**Status:** 200
**Test Script:**
```javascript
pm.test("Service is UP", () => {
  pm.response.to.have.status(200);
  const json = pm.response.json();
  pm.expect(json.status).to.equal("UP");
});
```

---

### 1.2 Create Consent (Happy Path)
**Endpoint:** `POST /consents`
**Body:**
```json
{
  "userId": "{{userId}}",
  "purpose": "{{purpose}}",
  "dataTypes": ["name", "aadhaar"],
  "validUntil": "2026-12-31T23:59:59Z"
}
```
**Status:** 201
**Test Script:**
```javascript
pm.test("Consent created with 201", () => {
  pm.response.to.have.status(201);
});

const json = pm.response.json();
pm.test("Response has consentId", () => {
  pm.expect(json.consentId).to.exist;
  pm.expect(json.consentId).to.be.a("string");
});

pm.test("Status is REQUESTED", () => {
  pm.expect(json.status).to.equal("REQUESTED");
});

// Store for later use
pm.environment.set("consentId", json.consentId);
pm.environment.set("approvalToken", json.approvalToken || "");
```

---

### 1.3 Get Consent by ID
**Endpoint:** `GET /consents/{{consentId}}`
**Status:** 200
**Test Script:**
```javascript
pm.test("Consent retrieved", () => {
  pm.response.to.have.status(200);
});

const json = pm.response.json();
pm.test("Consent has correct structure", () => {
  pm.expect(json.consentId).to.equal(pm.environment.get("consentId"));
  pm.expect(json.status).to.be.oneOf(["REQUESTED", "ACTIVE", "REVOKED", "REJECTED", "EXPIRED"]);
  pm.expect(json.userId).to.exist;
  pm.expect(json.purpose).to.exist;
  pm.expect(json.dataTypes).to.be.an("array");
});

// Store approval token if available
if (json.approvalToken) {
  pm.environment.set("approvalToken", json.approvalToken);
}
```

---

### 1.4 Approve Consent by Token
**Endpoint:** `POST /consents/approve/{{approvalToken}}`
**Status:** 200
**Prerequisites:** Must first retrieve consent and extract approval token
**Test Script:**
```javascript
pm.test("Consent approved", () => {
  pm.response.to.have.status(200);
});

const json = pm.response.json();
pm.test("Status changed to ACTIVE", () => {
  pm.expect(json.status).to.equal("ACTIVE");
  pm.expect(json.consentId).to.exist;
});

pm.environment.set("activeConsentId", json.consentId);
```

---

### 1.5 Process Data (Allowed)
**Endpoint:** `POST /process`
**Body:**
```json
{
  "userId": "{{userId}}",
  "purpose": "{{purpose}}",
  "dataTypes": ["name"]
}
```
**Status:** 200
**Test Script:**
```javascript
pm.test("Data processing allowed", () => {
  pm.response.to.have.status(200);
});

const json = pm.response.json();
pm.test("Status is PROCESSING_ALLOWED", () => {
  pm.expect(json.status).to.equal("PROCESSING_ALLOWED");
});
```

---

### 1.6 Semantic Revoke (Latest ACTIVE)
**Endpoint:** `POST /consents/revoke`
**Body:**
```json
{
  "userId": "{{userId}}",
  "purpose": "{{purpose}}"
}
```
**Status:** 200
**Test Script:**
```javascript
pm.test("Consent revoked", () => {
  pm.response.to.have.status(200);
});

const json = pm.response.json();
pm.test("Status is REVOKED", () => {
  pm.expect(json.status).to.equal("REVOKED");
  pm.expect(json.purpose).to.equal(pm.environment.get("purpose"));
});
```

---

### 1.7 Specific Revoke by ID
**Endpoint:** `POST /consents/{{consentId}}/revoke`
**Status:** 200
**Test Script:**
```javascript
pm.test("Specific consent revoked", () => {
  pm.response.to.have.status(200);
});

const json = pm.response.json();
pm.test("Status is REVOKED", () => {
  pm.expect(json.status).to.equal("REVOKED");
});
```

---

### 1.8 Get Audit Logs
**Endpoint:** `GET /audit?page=1&limit=100`
**Status:** 200
**Test Script:**
```javascript
pm.test("Audit logs retrieved", () => {
  pm.response.to.have.status(200);
});

const json = pm.response.json();
pm.test("Audit has pagination structure", () => {
  pm.expect(json.page).to.equal(1);
  pm.expect(json.limit).to.equal(100);
  pm.expect(json.total).to.be.a("number");
  pm.expect(json.data).to.be.an("array");
});

pm.test("Audit events are present", () => {
  pm.expect(json.data.length).to.be.greaterThan(0);
});
```

---

### 1.9 Admin Force-Expire Consent (with API Key)
**Endpoint:** `POST /admin/consents/{{consentId}}/expire`
**Header:** `X-API-Key: {{adminApiKey}}`
**Status:** 200
**Test Script:**
```javascript
pm.test("Admin expired consent", () => {
  pm.response.to.have.status(200);
});

const json = pm.response.json();
pm.test("Status changed to EXPIRED or REJECTED", () => {
  pm.expect(json.status).to.be.oneOf(["EXPIRED", "REJECTED"]);
  pm.expect(json.mode).to.equal("ADMIN_FORCED");
});
```

---

## Part 2: Validation Error Tests (Level 3B - 400 Bad Request)

### 2.1 POST /consents - Missing userId
**Endpoint:** `POST /consents`
**Body:**
```json
{
  "purpose": "marketing",
  "dataTypes": ["name"],
  "validUntil": "2026-12-31T23:59:59Z"
}
```
**Status:** 400
**Test Script:**
```javascript
pm.test("Missing userId rejected", () => {
  pm.response.to.have.status(400);
});

const json = pm.response.json();
pm.test("Error message present", () => {
  pm.expect(json.error).to.exist;
});
```

---

### 2.2 POST /consents - Missing purpose
**Endpoint:** `POST /consents`
**Body:**
```json
{
  "userId": "user-1",
  "dataTypes": ["name"],
  "validUntil": "2026-12-31T23:59:59Z"
}
```
**Status:** 400
**Test Script:** (same as 2.1)

---

### 2.3 POST /consents - Missing dataTypes
**Endpoint:** `POST /consents`
**Body:**
```json
{
  "userId": "user-1",
  "purpose": "marketing",
  "validUntil": "2026-12-31T23:59:59Z"
}
```
**Status:** 400

---

### 2.4 POST /consents - Empty dataTypes Array
**Endpoint:** `POST /consents`
**Body:**
```json
{
  "userId": "user-1",
  "purpose": "marketing",
  "dataTypes": [],
  "validUntil": "2026-12-31T23:59:59Z"
}
```
**Status:** 400

---

### 2.5 POST /consents - dataTypes as String (not array)
**Endpoint:** `POST /consents`
**Body:**
```json
{
  "userId": "user-1",
  "purpose": "marketing",
  "dataTypes": "name",
  "validUntil": "2026-12-31T23:59:59Z"
}
```
**Status:** 400
**Test Script:**
```javascript
pm.test("Invalid dataTypes format rejected", () => {
  pm.response.to.have.status(400);
  pm.expect(pm.response.json().error).to.exist;
});
```

---

### 2.6 POST /consents - Invalid ISO Date
**Endpoint:** `POST /consents`
**Body:**
```json
{
  "userId": "user-1",
  "purpose": "marketing",
  "dataTypes": ["name"],
  "validUntil": "invalid-date"
}
```
**Status:** 400

---

### 2.7 POST /consents - validUntil in Past
**Endpoint:** `POST /consents`
**Body:**
```json
{
  "userId": "user-1",
  "purpose": "marketing",
  "dataTypes": ["name"],
  "validUntil": "2020-12-31T23:59:59Z"
}
```
**Status:** 400 *(NEW: Should validate future date)*
**Test Script:**
```javascript
pm.test("Past validUntil rejected", () => {
  pm.response.to.have.status(400);
});
```

---

### 2.8 POST /consents/revoke - Missing userId
**Endpoint:** `POST /consents/revoke`
**Body:**
```json
{
  "purpose": "marketing"
}
```
**Status:** 400

---

### 2.9 POST /consents/revoke - Missing purpose
**Endpoint:** `POST /consents/revoke`
**Body:**
```json
{
  "userId": "user-1"
}
```
**Status:** 400

---

### 2.10 POST /process - Missing userId
**Endpoint:** `POST /process`
**Body:**
```json
{
  "purpose": "marketing",
  "dataTypes": ["name"]
}
```
**Status:** 400

---

### 2.11 POST /process - Missing purpose
**Endpoint:** `POST /process`
**Body:**
```json
{
  "userId": "user-1",
  "dataTypes": ["name"]
}
```
**Status:** 400

---

### 2.12 POST /process - Missing dataTypes
**Endpoint:** `POST /process`
**Body:**
```json
{
  "userId": "user-1",
  "purpose": "marketing"
}
```
**Status:** 400

---

### 2.13 POST /process - Empty dataTypes
**Endpoint:** `POST /process`
**Body:**
```json
{
  "userId": "user-1",
  "purpose": "marketing",
  "dataTypes": []
}
```
**Status:** 400

---

### 2.14 POST /consents/approve/:token - Extra Fields (Strict Validation)
**Endpoint:** `POST /consents/approve/{{approvalToken}}`
**Body:**
```json
{
  "extraField": "should-be-rejected"
}
```
**Status:** 400 *(IF validation is strict)*
**Test Script:**
```javascript
pm.test("Extra fields rejected or ignored", () => {
  // If endpoint doesn't validate strictly, this may be 200 with warning
  // Document the actual behavior
  pm.expect(pm.response.status).to.be.oneOf([200, 400]);
});
```

---

## Part 3: Not Found Tests (Level 3C - 404)

### 3.1 GET /consents/nonexistent
**Endpoint:** `GET /consents/nonexistent-id-12345`
**Status:** 404
**Test Script:**
```javascript
pm.test("Non-existent consent not found", () => {
  pm.response.to.have.status(404);
  pm.expect(pm.response.json().error).to.include("not found");
});
```

---

### 3.2 POST /consents/nonexistent/revoke
**Endpoint:** `POST /consents/nonexistent-id-12345/revoke`
**Status:** 404

---

### 3.3 POST /consents/approve/invalid-token
**Endpoint:** `POST /consents/approve/invalid-token-xyz`
**Status:** 400 *(not 404, because invalid/expired token is different from not found)*
**Test Script:**
```javascript
pm.test("Invalid token returns 400, not 404", () => {
  pm.response.to.have.status(400);
  pm.expect(pm.response.json().error).to.include("Invalid");
});
```

---

## Part 4: Authorization Tests (Level 3D - 401/403)

### 4.1 POST /admin/consents/:id/expire - Without X-API-Key Header
**Endpoint:** `POST /admin/consents/{{consentId}}/expire`
**Headers:** (Do NOT include X-API-Key)
**Status:** 401
**Test Script:**
```javascript
pm.test("Missing API key returns 401", () => {
  pm.response.to.have.status(401);
});

const json = pm.response.json();
pm.test("Error message about authorization", () => {
  pm.expect(json.error).to.include("Unauthorized");
});
```

---

### 4.2 POST /admin/consents/:id/expire - Invalid API Key
**Endpoint:** `POST /admin/consents/{{consentId}}/expire`
**Headers:** `X-API-Key: wrong-key-12345`
**Status:** 401
**Test Script:**
```javascript
pm.test("Invalid API key returns 401", () => {
  pm.response.to.have.status(401);
});
```

---

### 4.3 POST /admin/consents/:id/expire - Empty API Key
**Endpoint:** `POST /admin/consents/{{consentId}}/expire`
**Headers:** `X-API-Key: ` (empty)
**Status:** 401

---

### 4.4 POST /admin/consents/:id/expire - Valid API Key
**Endpoint:** `POST /admin/consents/{{consentId}}/expire`
**Headers:** `X-API-Key: {{adminApiKey}}`
**Status:** 200
**Test Script:**
```javascript
pm.test("Valid API key grants access", () => {
  pm.response.to.have.status(200);
});
```

---

## Part 5: State Transition Tests (Level 3E)

### 5.1 POST /consents/:id/revoke - On Already REVOKED Consent
**Setup:** Create → Approve → Revoke → Revoke Again
**Endpoint:** `POST /consents/{{alreadyRevokedId}}/revoke`
**Status:** 400
**Test Script:**
```javascript
pm.test("Cannot revoke already-revoked consent", () => {
  pm.response.to.have.status(400);
  pm.expect(pm.response.json().error).to.include("already revoked");
});
```

---

### 5.2 POST /process - With REVOKED Consent
**Setup:** Create → Approve → Revoke → Try to process
**Endpoint:** `POST /process`
**Body:**
```json
{
  "userId": "{{userId}}",
  "purpose": "{{purpose}}",
  "dataTypes": ["name"]
}
```
**Status:** 403
**Test Script:**
```javascript
pm.test("Processing denied with revoked consent", () => {
  pm.response.to.have.status(403);
  pm.expect(pm.response.json().error).to.include("No active consent");
});
```

---

### 5.3 POST /process - With REJECTED Consent
**Setup:** Create → Reject → Try to process
**Status:** 403

---

### 5.4 POST /process - With EXPIRED Consent
**Setup:** Create → Approve with past validUntil → Try to process
**Status:** 403 or 200 depending on cron timing
**Test Script:**
```javascript
pm.test("Expired consent does not allow processing", () => {
  // Note: May be 403 or still 200 if cron hasn't run
  // Document the actual behavior
  pm.expect(pm.response.status).to.be.oneOf([403, 200]);
});
```

---

### 5.5 POST /process - No ACTIVE Consent Exists
**Setup:** User with no consent
**Status:** 403
**Test Script:**
```javascript
pm.test("No consent returns 403", () => {
  pm.response.to.have.status(403);
  pm.expect(pm.response.json().error).to.include("No active consent");
});
```

---

## Part 6: Approval & Rejection Tests (Level 3F)

### 6.1 POST /consents/approve/:token - With Expired Approval Token
**Setup:** Create consent, wait for approval_expires_at to pass (24h default)
**Endpoint:** `POST /consents/approve/{{expiredToken}}`
**Status:** 400
**Test Script:**
```javascript
pm.test("Expired approval token rejected", () => {
  pm.response.to.have.status(400);
  pm.expect(pm.response.json().error).to.include("Invalid");
});
```

---

### 6.2 POST /consents/approve/:token - Token Reuse (Idempotency)
**Setup:** Create consent, approve once, try to approve again with same token
**Status:** 400 (on second call)
**Test Script:**
```javascript
pm.test("Token cannot be reused", () => {
  pm.response.to.have.status(400);
  pm.expect(pm.response.json().error).to.include("Invalid");
});
```

---

### 6.3 POST /consents/reject/:token - With Expired Token
**Setup:** Create consent, wait for approval_expires_at to pass
**Status:** 400

---

### 6.4 POST /consents/reject/:token - Token Reuse
**Setup:** Create consent, reject once, try to reject again with same token
**Status:** 400

---

### 6.5 POST /consents/approve/:token - Creates ACTIVE Status
**Setup:** Create consent
**Endpoint:** `POST /consents/approve/{{validToken}}`
**Status:** 200
**Test Script:**
```javascript
pm.test("Approved consent is ACTIVE", () => {
  pm.response.to.have.status(200);
  pm.expect(pm.response.json().status).to.equal("ACTIVE");
});
```

---

### 6.6 POST /consents/reject/:token - Creates REJECTED Status
**Setup:** Create consent
**Endpoint:** `POST /consents/reject/{{validToken}}`
**Status:** 200
**Test Script:**
```javascript
pm.test("Rejected consent is REJECTED", () => {
  pm.response.to.have.status(200);
  pm.expect(pm.response.json().status).to.equal("REJECTED");
});
```

---

### 6.7 POST /consents/approve/:token - Revokes Existing ACTIVE
**Setup:** Create v1 → Approve (ACTIVE) → Create v2 → Approve v2
**Status:** 200 on v2 approval
**Test Script:**
```javascript
pm.test("New approval revokes old ACTIVE", () => {
  pm.response.to.have.status(200);
  pm.expect(pm.response.json().status).to.equal("ACTIVE");
});

// Then GET /consents/:v1Id should show REVOKED
pm.test("Previous version is now REVOKED", () => {
  // This requires an additional request to verify
  // Can be done as a follow-up step
});
```

---

## Part 7: Semantic Revoke Tests (Level 3G)

### 7.1 POST /consents/revoke - With No ACTIVE Consent
**Setup:** User with no consent or all in REJECTED/REVOKED state
**Status:** 200 (idempotent)
**Test Script:**
```javascript
pm.test("Revoke with no active consent is idempotent", () => {
  pm.response.to.have.status(200);
  pm.expect(pm.response.json().status).to.equal("NO_ACTIVE_CONSENT");
});
```

---

### 7.2 POST /consents/revoke - Revokes Latest ACTIVE Version
**Setup:** Create v1 → Approve → Create v2 → Approve → Call revoke
**Status:** 200
**Test Script:**
```javascript
pm.test("Revoke targets latest ACTIVE", () => {
  pm.response.to.have.status(200);
  pm.expect(pm.response.json().status).to.equal("REVOKED");
});

// Verify v2 is REVOKED (not v1)
pm.test("Latest version is revoked", () => {
  // Get latest active should return no result
});
```

---

## Part 8: Admin Expire Tests (Level 3H)

### 8.1 POST /admin/consents/:id/expire - ACTIVE → EXPIRED
**Setup:** Create → Approve (ACTIVE)
**Endpoint:** `POST /admin/consents/{{activeConsentId}}/expire`
**Status:** 200
**Test Script:**
```javascript
pm.test("ACTIVE consent expires", () => {
  pm.response.to.have.status(200);
});

const json = pm.response.json();
pm.test("Status changed to EXPIRED", () => {
  pm.expect(json.status).to.equal("EXPIRED");
  pm.expect(json.mode).to.equal("ADMIN_FORCED");
});
```

---

### 8.2 POST /admin/consents/:id/expire - REQUESTED → REJECTED
**Setup:** Create (REQUESTED)
**Endpoint:** `POST /admin/consents/{{requestedConsentId}}/expire`
**Status:** 200
**Test Script:**
```javascript
pm.test("REQUESTED consent is rejected", () => {
  pm.response.to.have.status(200);
  pm.expect(pm.response.json().status).to.equal("REJECTED");
});
```

---

### 8.3 POST /admin/consents/:id/expire - REVOKED → Error
**Setup:** Create → Approve → Revoke
**Endpoint:** `POST /admin/consents/{{revokedConsentId}}/expire`
**Status:** 400
**Test Script:**
```javascript
pm.test("Cannot expire already-revoked consent", () => {
  pm.response.to.have.status(400);
  pm.expect(pm.response.json().error).to.include("Cannot");
});
```

---

### 8.4 POST /admin/consents/:id/expire - EXPIRED → Error
**Setup:** Create consent with past validUntil (or expire it first)
**Status:** 400

---

### 8.5 POST /admin/consents/:id/expire - REJECTED → Error
**Setup:** Create → Reject
**Status:** 400

---

## Part 9: Data Processing Authorization Tests (Level 3I)

### 9.1 POST /process - Purpose Mismatch
**Setup:** Create consent for "marketing"
**Endpoint:** `POST /process`
**Body:**
```json
{
  "userId": "{{userId}}",
  "purpose": "analytics",
  "dataTypes": ["name"]
}
```
**Status:** 403
**Test Script:**
```javascript
pm.test("Purpose mismatch denied", () => {
  pm.response.to.have.status(403);
  pm.expect(pm.response.json().error).to.include("Purpose mismatch");
});
```

---

### 9.2 POST /process - Requesting Unconsented DataType
**Setup:** Create consent for ["name", "aadhaar"]
**Endpoint:** `POST /process`
**Body:**
```json
{
  "userId": "{{userId}}",
  "purpose": "marketing",
  "dataTypes": ["phone"]
}
```
**Status:** 403
**Test Script:**
```javascript
pm.test("Unconsented data type denied", () => {
  pm.response.to.have.status(403);
  pm.expect(pm.response.json().error).to.include("DataType");
});
```

---

### 9.3 POST /process - Valid ACTIVE Consent
**Setup:** Create → Approve consent for ["name", "aadhaar"]
**Endpoint:** `POST /process`
**Body:**
```json
{
  "userId": "{{userId}}",
  "purpose": "marketing",
  "dataTypes": ["name"]
}
```
**Status:** 200
**Test Script:**
```javascript
pm.test("Valid consent allows processing", () => {
  pm.response.to.have.status(200);
  pm.expect(pm.response.json().status).to.equal("PROCESSING_ALLOWED");
});
```

---

### 9.4 POST /process - Subset of Consented DataTypes
**Setup:** Create consent for ["name", "aadhaar", "address"]
**Endpoint:** `POST /process`
**Body:**
```json
{
  "userId": "{{userId}}",
  "purpose": "marketing",
  "dataTypes": ["name", "address"]
}
```
**Status:** 200

---

### 9.5 POST /process - All Consented DataTypes
**Setup:** Create consent for ["name", "aadhaar"]
**Endpoint:** `POST /process`
**Body:**
```json
{
  "userId": "{{userId}}",
  "purpose": "marketing",
  "dataTypes": ["name", "aadhaar"]
}
```
**Status:** 200

---

## Part 10: Security/Abuse Tests (Level 4)

### 10.1 POST /consents - SQL Injection in userId
**Endpoint:** `POST /consents`
**Body:**
```json
{
  "userId": "user' OR '1'='1",
  "purpose": "marketing",
  "dataTypes": ["name"],
  "validUntil": "2026-12-31T23:59:59Z"
}
```
**Status:** 400 or 201 (system is protected by parameterized queries)
**Test Script:**
```javascript
pm.test("SQL injection attempt handled safely", () => {
  // Should either reject validation or handle safely
  pm.expect([200, 201, 400]).to.include(pm.response.code);
});
```

---

### 10.2 POST /consents - SQL Injection in purpose
**Endpoint:** `POST /consents`
**Body:**
```json
{
  "userId": "user-1",
  "purpose": "marketing'); DROP TABLE consents; --",
  "dataTypes": ["name"],
  "validUntil": "2026-12-31T23:59:59Z"
}
```
**Status:** Should be safe (parameterized queries)

---

### 10.3 POST /consents - XSS in userId
**Endpoint:** `POST /consents`
**Body:**
```json
{
  "userId": "<script>alert('xss')</script>",
  "purpose": "marketing",
  "dataTypes": ["name"],
  "validUntil": "2026-12-31T23:59:59Z"
}
```
**Status:** 200/201 (stored as-is, API doesn't execute)
**Test Script:**
```javascript
pm.test("XSS stored safely (not executed by API)", () => {
  // Browser won't execute because API is not HTML endpoint
  pm.expect([200, 201]).to.include(pm.response.code);
});
```

---

### 10.4 POST /consents - Null Byte Injection
**Endpoint:** `POST /consents`
**Body:**
```json
{
  "userId": "user\u0000admin",
  "purpose": "marketing",
  "dataTypes": ["name"],
  "validUntil": "2026-12-31T23:59:59Z"
}
```
**Status:** 200/201 or 400
**Test Script:**
```javascript
pm.test("Null byte handled safely", () => {
  pm.expect([200, 201, 400]).to.include(pm.response.code);
});
```

---

### 10.5 POST /consents - Very Long userId (>10000 chars)
**Endpoint:** `POST /consents`
**Body:**
```json
{
  "userId": "a".repeat(10000),
  "purpose": "marketing",
  "dataTypes": ["name"],
  "validUntil": "2026-12-31T23:59:59Z"
}
```
**Status:** 400 (should be rejected)
**Test Script:**
```javascript
pm.test("Very long userId rejected", () => {
  pm.response.to.have.status(400);
});
```

---

### 10.6 POST /consents/approve/:token - Token Replay Attack
**Setup:** Create → Approve once → Try to approve again
**Endpoint:** `POST /consents/approve/{{usedToken}}`
**Status:** 400
**Test Script:**
```javascript
pm.test("Token replay attack prevented", () => {
  pm.response.to.have.status(400);
  pm.expect(pm.response.json().error).to.include("Invalid");
});
```

---

### 10.7 POST /consents/approve/:token - Malformed Token
**Endpoint:** `POST /consents/approve/not-a-valid-token-format!!!`
**Status:** 400

---

### 10.8 POST /consents/approve/:token - Token from Different Consent
**Setup:** Create 2 consents, get tokens, try to use token1 on consent2
**Status:** 400

---

### 10.9 POST /admin/consents/:id/expire - API Key with Extra Spaces
**Endpoint:** `POST /admin/consents/{{consentId}}/expire`
**Headers:** `X-API-Key:  {{adminApiKey}}  ` (with spaces)
**Status:** 401
**Test Script:**
```javascript
pm.test("API key with extra spaces rejected", () => {
  pm.response.to.have.status(401);
});
```

---

### 10.10 POST /consents - Unicode Handling (Emoji)
**Endpoint:** `POST /consents`
**Body:**
```json
{
  "userId": "user-😀",
  "purpose": "marketing-🎯",
  "dataTypes": ["name"],
  "validUntil": "2026-12-31T23:59:59Z"
}
```
**Status:** 200/201 (should handle UTF-8 safely)
**Test Script:**
```javascript
pm.test("Unicode characters handled safely", () => {
  pm.expect([200, 201]).to.include(pm.response.code);
});
```

---

## Part 11: Audit & Admin Flows (Level 5)

### 11.1 Complete Lifecycle Audit Trail
**Workflow:**
1. Create consent → Check audit for CONSENT_REQUESTED
2. Approve consent → Check audit for CONSENT_APPROVED
3. Process data → Check audit for PROCESSING_ALLOWED
4. Revoke consent → Check audit for CONSENT_REVOKED
5. Try to process → Check audit for PROCESSING_DENIED

**Test Script:**
```javascript
// After each operation, GET /audit and verify event exists
pm.test("CONSENT_REQUESTED event logged", () => {
  // Parse audit response
  // Verify event with eventType="CONSENT_REQUESTED" exists
});

pm.test("CONSENT_APPROVED event logged", () => {
  // Similar check
});

// And so on...
```

---

### 11.2 Audit Pagination
**Endpoint:** `GET /audit?page=1&limit=10`
**Status:** 200
**Test Script:**
```javascript
pm.test("First page returns 10 items", () => {
  const json = pm.response.json();
  pm.expect(json.data.length).to.equal(10);
  pm.expect(json.page).to.equal(1);
});
```

**Endpoint:** `GET /audit?page=2&limit=10`
**Test Script:**
```javascript
pm.test("Second page has different items", () => {
  const json = pm.response.json();
  pm.expect(json.page).to.equal(2);
  // Verify different IDs from page 1
});
```

**Endpoint:** `GET /audit?page=1&limit=2000`
**Status:** 200 (limit capped at 1000)
**Test Script:**
```javascript
pm.test("Limit capped at 1000", () => {
  const json = pm.response.json();
  pm.expect(json.limit).to.equal(1000);
  pm.expect(json.data.length).to.be.lessThanOrEqual(1000);
});
```

---

### 11.3 Audit Chain Integrity
**Setup:** After creating several consents and processing
**Endpoint:** `GET /audit`
**Test Script:**
```javascript
pm.test("Audit chain has consecutive hashes", () => {
  const json = pm.response.json();
  const logs = json.data;
  
  for (let i = 1; i < logs.length; i++) {
    pm.expect(logs[i].prevHash).to.equal(logs[i-1].hash);
  }
});
```

---

### 11.4 Admin Force-Expire ACTIVE → EXPIRED
**Setup:** Create → Approve
**Endpoint:** `POST /admin/consents/{{activeConsentId}}/expire`
**Status:** 200
**Test Script:**
```javascript
pm.test("ACTIVE expires to EXPIRED", () => {
  const json = pm.response.json();
  pm.expect(json.status).to.equal("EXPIRED");
  pm.expect(json.previousStatus).to.equal("ACTIVE");
});

// Verify audit event
pm.test("CONSENT_EXPIRED event logged with ADMIN flag", () => {
  // GET /audit and find CONSENT_EXPIRED for this consentId
  // Verify details.forcedBy === "ADMIN"
});
```

---

### 11.5 Admin Force-Expire REQUESTED → REJECTED
**Setup:** Create (REQUESTED)
**Endpoint:** `POST /admin/consents/{{requestedConsentId}}/expire`
**Status:** 200
**Test Script:**
```javascript
pm.test("REQUESTED expires to REJECTED", () => {
  const json = pm.response.json();
  pm.expect(json.status).to.equal("REJECTED");
});
```

---

## Part 12: Summary of Changes

### Tests to ADD (New)
- [ ] 2.7: validUntil in Past validation
- [ ] 3.2: POST /consents/:id/revoke 404 test
- [ ] 5.1 - 5.5: State transition tests
- [ ] 8.1 - 8.5: Admin expire tests
- [ ] 9.1 - 9.5: Data processing authorization
- [ ] 10.1 - 10.10: Security/abuse tests
- [ ] 11.1 - 11.5: Audit & admin flow tests

### Tests to MODIFY
- [ ] 1.2: Create Consent - Add `validUntil` validation test
- [ ] 1.4: Approval - Add error handling for expired tokens
- [ ] 1.9: Admin Expire - Add state validation tests

### Tests to DELETE
- [ ] Any duplicate or redundant test folders (consolidate similar tests)

---

## Implementation Checklist

- [ ] Create folder structure in Postman:
  - [ ] Health Check
  - [ ] Level 3A: Happy Paths
  - [ ] Level 3B: Validation Errors (400)
  - [ ] Level 3C: Not Found (404)
  - [ ] Level 3D: Authorization (401/403)
  - [ ] Level 3E: State Transitions
  - [ ] Level 3F: Approval & Rejection
  - [ ] Level 3G: Semantic Revoke
  - [ ] Level 3H: Admin Expires
  - [ ] Level 3I: Data Processing
  - [ ] Level 4: Security/Abuse
  - [ ] Level 5: Audit & Admin Flows

- [ ] Set environment variables correctly
- [ ] Test each endpoint individually
- [ ] Run full collection to verify workflow
- [ ] Export updated collection

---

## Notes for Manual Implementation

1. **Pre-requisites:** Ensure database is initialized and server is running
2. **Token Management:** Approval tokens expire after 24 hours. For testing, you may need to:
   - Extract token from GET response
   - Use it immediately for approval tests
   - Wait or test expiry logic separately
3. **Async Considerations:** Cron jobs run every 10 minutes, so expiry tests may need waits
4. **Idempotency:** Most operations should be idempotent (safe to retry)
5. **Audit Logging:** Every operation creates audit entries; verify pagination works

