# CMP Testing Strategy - Comprehensive Review

## Executive Summary

The Consent Manager MVP is a DPDP-compliant consent management platform. This document provides a thorough analysis of the current system, identifies gaps, and proposes a comprehensive test strategy aligned with the pyramid architecture.

---

## Part 1: System Architecture Review

### Core Features Identified

#### 1. **Consent Lifecycle Management**
- Create consent request (REQUESTED status)
- Approve consent via token (ACTIVE status)
- Reject consent via token (REJECTED status)
- Revoke specific consent version (REVOKED status)
- Semantic revoke by userId+purpose (revokes latest ACTIVE)
- Auto-expiry based on validUntil timestamp (EXPIRED status)

#### 2. **Policy Engine**
- Purpose exact match validation
- DataTypes subset enforcement (requested ⊆ consented)
- Status validation (only ACTIVE consents authorize processing)
- Version anti-replay checks

#### 3. **Audit & Compliance**
- Immutable audit log with SHA256 hash chain
- Audit chain verification capability
- Event tracking: CONSENT_REQUESTED, APPROVED, REJECTED, REVOKED, EXPIRED, PROCESSING_ALLOWED, PROCESSING_DENIED
- Pagination for audit retrieval

#### 4. **Admin Functions**
- Force-expire consent (admin API key protected)
- Consent state enforcement (can expire ACTIVE or reject REQUESTED)

#### 5. **Data Processing Authorization**
- Consent check before data processing
- Purpose and dataTypes validation
- Detailed audit logging for denials and allowances

---

## Part 2: Identified Issues & Security Concerns

### 🔴 **CRITICAL Issues**

#### 1. **Missing Approval Expiry Enforcement**
- **Issue**: Approval tokens expire, but no endpoint checks if token is actually expired during approval
- **Impact**: Stale approval tokens could theoretically be replayed
- **Status**: Code has check in `approveConsentByToken` but not fully tested

#### 2. **No Request Body Validation for Approval/Rejection**
- **Issue**: `/consents/approve/:token` and `/consents/reject/:token` don't validate request body
- **Risk**: Could accept additional fields that alter behavior
- **Code**: Routes in `consentRoutes.ts` don't use schema validation

#### 3. **Admin API Key Security**
- **Issue**: Warning logs if `ADMIN_API_KEY` not set but still allows access
- **Risk**: Unprotected admin endpoints in dev-like environments
- **Code**: [src/middleware/auth.ts](src/middleware/auth.ts#L15)

#### 4. **No Rate Limiting**
- **Issue**: No protection against brute force or abuse
- **Risk**: Token brute force, approval spam, process endpoint DoS

#### 5. **Missing Input Sanitization**
- **Issue**: No SQL injection prevention verified for string inputs (though using parameterized queries)
- **Risk**: JSON strings in userId/purpose could cause issues

---

### 🟡 **Medium Issues**

#### 1. **Incomplete Consent Group Cleanup**
- **Issue**: When approving a consent, old REQUESTED and ACTIVE consents are rejected/revoked but not deleted
- **Impact**: Database bloat over time, though functionally correct

#### 2. **Missing Audit Filtering**
- **Issue**: `/audit` endpoint returns ALL logs, paginated but no user/consent filtering
- **Risk**: Potential data leakage to unauthorized users
- **Code**: [src/index.ts](src/index.ts#L254) - no authorization check

#### 3. **No Expiry Window Validation**
- **Issue**: When creating consent, no check that `validUntil` is in the future
- **Risk**: Immediate expiry can occur

#### 4. **Cron Job Timing**
- **Issue**: Cron runs every 10 minutes - there's a 10-minute window where ACTIVE consent past validity date is still usable
- **Impact**: DPDP §6 immediate stop requirement not strictly honored

---

### 🟢 **Minor Issues**

#### 1. **No Explicit Content-Type Validation**
- **Issue**: Assumes JSON, no explicit validation of Content-Type header

#### 2. **Limited Error Messages**
- **Issue**: Some error responses are generic ("Internal Server Error")

#### 3. **No Request ID Tracking**
- **Issue**: No correlation IDs for debugging audit trails across requests

#### 4. **Missing DELETE Cascade**
- **Issue**: No cascade on foreign keys if implemented later

---

## Part 3: Test Coverage Gaps

### Current Coverage (basic.test.ts)
- ✅ Audit chain verification
- ✅ Policy enforcement - exact purpose match
- ✅ Policy enforcement - dataTypes subset
- ✅ Inactive consent rejection

### Missing Coverage

#### PolicyEngine Unit Tests (npm test)
- ❌ Stale version rejection
- ❌ Multiple dataType combinations
- ❌ Empty dataTypes
- ❌ Null/undefined handling
- ❌ Case sensitivity of purpose
- ❌ Case sensitivity of dataTypes
- ❌ Numeric/special character dataTypes

#### Repository Tests (npm test)
- ❌ Consent creation with duplicate group IDs
- ❌ Approval token expiry validation
- ❌ Approval token reuse prevention
- ❌ Concurrent approvals (race conditions)
- ❌ Transaction rollback on failures
- ❌ getLatestActiveConsent ordering
- ❌ Expiry enforcement accuracy
- ❌ Revoke idempotency

#### API Contract Tests (Newman)
- ❌ 400 errors for missing fields
- ❌ 400 errors for invalid dataTypes format
- ❌ 400 errors for invalid ISO dates
- ❌ 404 for non-existent consent
- ❌ 409/400 for double revoke
- ❌ Approval token not found (expired/invalid)
- ❌ Approval token with stale validUntil
- ❌ Semantic revoke with no active consent
- ❌ /process endpoint authorization
- ❌ /process with non-existent user/purpose
- ❌ /process with expired consent (during 10-min window)

#### Security/Abuse Tests (Newman)
- ❌ Admin key validation
- ❌ Invalid admin key rejection (401)
- ❌ Missing X-API-Key header rejection
- ❌ SQL injection attempts in userId
- ❌ SQL injection attempts in purpose
- ❌ XSS attempts in details
- ❌ Token brute force (rate limiting not present)
- ❌ Invalid token formats
- ❌ Replay attacks (same token twice)
- ❌ Request body injection (extra fields)
- ❌ Null byte injection
- ❌ Unicode/UTF-8 handling

#### Audit & Admin Flows (Newman)
- ❌ Audit log pagination
- ❌ Audit log ordering
- ❌ Audit chain integrity after modifications
- ❌ Admin force-expire ACTIVE → EXPIRED
- ❌ Admin force-expire REQUESTED → REJECTED
- ❌ Admin cannot expire REVOKED (400 error)
- ❌ Admin cannot expire EXPIRED (400 error)
- ❌ Admin cannot expire REJECTED (400 error)
- ❌ Admin operations audit logging
- ❌ Audit filtering by consent ID
- ❌ Audit filtering by user ID

---

## Part 4: Test Architecture Implementation Plan

```
┌────────────────────────────────────────┐
│     UNIT TESTS (npm test)              │
│                                        │
│  ┌─ Policy Engine Tests ─────────┐    │
│  │ • Purpose validation           │    │
│  │ • DataTypes enforcement        │    │
│  │ • Status checks                │    │
│  │ • Version anti-replay          │    │
│  │ • Edge cases                   │    │
│  │ Time: ~100ms                   │    │
│  └────────────────────────────────┘    │
│                                        │
│  ┌─ Repository Tests ─────────────┐   │
│  │ • Consent CRUD operations      │    │
│  │ • Approval flow atomicity      │    │
│  │ • Token expiry validation      │    │
│  │ • Revoke idempotency           │    │
│  │ • Expiry enforcement           │    │
│  │ • Race condition tests         │    │
│  │ Time: ~500ms (includes DB)     │    │
│  └────────────────────────────────┘    │
└────────────────────────────────────────┘
         ↓↓↓
┌────────────────────────────────────────┐
│   API CONTRACT TESTS (Newman)          │
│                                        │
│  ┌─ Happy Paths ──────────────────┐   │
│  │ • Create consent               │    │
│  │ • Approve → Active             │    │
│  │ • Process data                 │    │
│  │ • Revoke (semantic + by ID)    │    │
│  │ • Expire (admin)               │    │
│  │ Time: ~2-3s                    │    │
│  └────────────────────────────────┘    │
│                                        │
│  ┌─ Error Handling ───────────────┐   │
│  │ • 400 validation errors        │    │
│  │ • 404 not found                │    │
│  │ • 401/403 authorization        │    │
│  │ • Invalid state transitions    │    │
│  │ Time: ~1-2s                    │    │
│  └────────────────────────────────┘    │
└────────────────────────────────────────┘
         ↓↓↓
┌────────────────────────────────────────┐
│  SECURITY/ABUSE TESTS (Newman)         │
│                                        │
│  ┌─ Authentication/Authorization ─┐   │
│  │ • Admin key enforcement        │    │
│  │ • 401/403 responses            │    │
│  │ Time: ~500ms                   │    │
│  └────────────────────────────────┘    │
│                                        │
│  ┌─ Input Validation ─────────────┐   │
│  │ • SQL injection attempts       │    │
│  │ • XSS attempts                 │    │
│  │ • Null bytes                   │    │
│  │ • Unicode handling             │    │
│  │ • Schema rejection             │    │
│  │ Time: ~1-2s                    │    │
│  └────────────────────────────────┘    │
│                                        │
│  ┌─ Replay & Abuse ───────────────┐   │
│  │ • Token reuse prevention       │    │
│  │ • Double approval              │    │
│  │ • Double revoke                │    │
│  │ • Rate limiting (TBD)          │    │
│  │ Time: ~1-2s                    │    │
│  └────────────────────────────────┘    │
└────────────────────────────────────────┘
         ↓↓↓
┌────────────────────────────────────────┐
│   AUDIT & ADMIN FLOWS (Newman)         │
│                                        │
│  ┌─ Audit Trail ──────────────────┐   │
│  │ • Chain integrity              │    │
│  │ • Pagination                   │    │
│  │ • Event ordering               │    │
│  │ • User history tracking        │    │
│  │ Time: ~1-2s                    │    │
│  └────────────────────────────────┘    │
│                                        │
│  ┌─ Admin Functions ──────────────┐   │
│  │ • Force-expire workflows       │    │
│  │ • State transition validation  │    │
│  │ • Audit event generation       │    │
│  │ Time: ~1-2s                    │    │
│  └────────────────────────────────┘    │
└────────────────────────────────────────┘
```

---

## Part 5: Detailed Test Specifications

### **Level 1: PolicyEngine Unit Tests** (npm test)

Tests to be added to [src/tests/basic.test.ts](src/tests/basic.test.ts):

```typescript
// TEST 5: Stale version rejection
// Should reject processing with mismatched version

// TEST 6: Multiple dataTypes - mixed approval/denial
// Should allow subset, deny superset

// TEST 7: Empty/null dataTypes handling
// Should fail safely

// TEST 8: Case sensitivity in purpose
// 'Marketing' vs 'marketing' should not match

// TEST 9: Case sensitivity in dataTypes
// 'Email' vs 'email' should not match

// TEST 10: Expired consent (status='EXPIRED')
// Should deny processing

// TEST 11: Revoked consent (status='REVOKED')
// Should deny processing

// TEST 12: Rejected consent (status='REJECTED')
// Should deny processing

// TEST 13: Purpose null/undefined
// Should handle gracefully
```

### **Level 2: Repository Unit Tests** (npm test)

Tests to be added to a new file [src/tests/repository.test.ts](src/tests/repository.test.ts):

```typescript
// TEST 1: createConsent - basic happy path
// Verify: consent is REQUESTED, version=1, group ID computed correctly

// TEST 2: createConsent - duplicate purpose creates new version
// Create consent for (user1, purpose1)
// Create another for (user1, purpose1)
// Verify: version=1 and version=2 exist, both have same group ID

// TEST 3: approveConsentByToken - revokes existing ACTIVE
// Create v1 consent for (user1, purpose1)
// Approve it → ACTIVE
// Create v2 consent for same group
// Approve v2 → ACTIVE
// Verify: v1 is now REVOKED

// TEST 4: approveConsentByToken - invalid/expired token
// Pass invalid token
// Verify: returns null

// TEST 5: approveConsentByToken - token expiry window
// Create consent, wait for approval_expires_at to pass
// Attempt approval
// Verify: returns null

// TEST 6: getLatestActiveConsent - orders by version DESC
// Create v1 (ACTIVE), create v2 (ACTIVE)
// Query latest
// Verify: returns v2

// TEST 7: revokeConsent - idempotency
// Revoke same consent twice
// Verify: second revoke succeeds, no error

// TEST 8: expireConsentIfNeeded - only expires if past validUntil
// Create consent with validUntil = future
// Call expireConsentIfNeeded
// Verify: still ACTIVE
// Create consent with validUntil = past
// Call expireConsentIfNeeded
// Verify: now EXPIRED

// TEST 9: rejectConsentByToken - rejects all REQUESTED in group
// Create v1, v2 (both REQUESTED)
// Reject v1 token
// Verify: both v1 and v2 are REJECTED

// TEST 10: Concurrent approval (race condition test)
// Simulate two simultaneous approval attempts on same token
// Verify: only one succeeds (transaction isolation)
```

### **Level 3: API Contract Tests** (Newman Collection)

#### **3A: Happy Path Tests**
```
POST /consents → 201 (create)
GET /consents/:id → 200 (fetch)
POST /consents/approve/:token → 200 (approve)
POST /consents/revoke → 200 (semantic revoke)
POST /consents/:id/revoke → 200 (specific revoke)
POST /process → 200 (allowed)
GET /audit?page=1&limit=100 → 200 (pagination)
POST /admin/consents/:id/expire → 200 (with valid key)
GET /health → 200
```

#### **3B: Validation Error Tests (400)**
```
POST /consents - missing userId
POST /consents - missing purpose
POST /consents - missing dataTypes
POST /consents - empty dataTypes array
POST /consents - dataTypes as string instead of array
POST /consents - invalid ISO date in validUntil
POST /consents - validUntil in past
POST /consents/revoke - missing userId
POST /consents/revoke - missing purpose
POST /process - missing userId
POST /process - missing purpose
POST /process - missing dataTypes
POST /process - empty dataTypes array
POST /consents/approve/:token - with extra fields (strict validation)
```

#### **3C: Not Found Tests (404)**
```
GET /consents/nonexistent → 404
POST /consents/nonexistent/revoke → 404
POST /consents/approve/invalid-token → 400 (not 404)
```

#### **3D: Authorization Tests (401/403)**
```
POST /admin/consents/:id/expire - without X-API-Key → 401
POST /admin/consents/:id/expire - with invalid key → 401
POST /admin/consents/:id/expire - with valid key → 200
```

#### **3E: State Transition Tests**
```
POST /consents/:id/revoke - on REVOKED consent → 400
POST /consents/:id/revoke - on REJECTED consent → should still work
POST /consents/:id/revoke - on REQUESTED consent → should work
POST /process - with REVOKED consent → 403
POST /process - with REJECTED consent → 403
POST /process - with EXPIRED consent → 403
POST /process - with no ACTIVE consent → 403
```

#### **3F: Approval & Rejection Tests**
```
POST /consents/approve/:token - with expired approval_expires_at → 400
POST /consents/approve/:token - twice → 400 (second call)
POST /consents/reject/:token - with expired token → 400
POST /consents/reject/:token - twice → 400
POST /consents/approve/:token - creates ACTIVE status
POST /consents/reject/:token - creates REJECTED status
POST /consents/approve/:token - revokes existing ACTIVE in group
```

#### **3G: Semantic Revoke Tests**
```
POST /consents/revoke - with no ACTIVE consent → 200 (idempotent)
POST /consents/revoke - revokes latest ACTIVE version
```

#### **3H: Admin Expire Tests**
```
POST /admin/consents/:id/expire - ACTIVE → EXPIRED
POST /admin/consents/:id/expire - REQUESTED → REJECTED
POST /admin/consents/:id/expire - REVOKED → 400 error
POST /admin/consents/:id/expire - EXPIRED → 400 error
POST /admin/consents/:id/expire - REJECTED → 400 error
```

#### **3I: Data Processing Tests**
```
POST /process - purpose mismatch → 403
POST /process - requesting uncons ented dataType → 403
POST /process - with valid ACTIVE consent → 200
POST /process - with subset of consented dataTypes → 200
```

### **Level 4: Security/Abuse Tests** (Newman Collection)

#### **4A: Input Validation**
```
POST /consents - userId with SQL injection (' OR '1'='1)
POST /consents - purpose with SQL injection
POST /consents - userId with XSS (<script>alert(1)</script>)
POST /consents - purpose with XSS
POST /consents - dataTypes with null bytes
POST /consents - unicode handling (emoji, RTL characters)
POST /consents - very long userId (>10000 chars)
POST /consents - very long purpose (>10000 chars)
POST /consents - very large dataTypes array
```

#### **4B: Token Security**
```
POST /consents/approve/validtoken - twice (replay protection)
POST /consents/approve - with token from different consent
POST /consents/approve - with malformed token format
POST /consents/approve - with extremely long token
POST /consents/approve - with null/undefined token
```

#### **4C: Admin Security**
```
POST /admin/consents/:id/expire - missing X-API-Key header
POST /admin/consents/:id/expire - X-API-Key: "" (empty)
POST /admin/consents/:id/expire - X-API-Key: wrong-value
POST /admin/consents/:id/expire - X-API-Key: admin-key-with-extra-spaces
```

#### **4D: Rate Limiting** *(Currently Not Implemented)*
```
[FUTURE] Rapid consecutive requests to same endpoint
[FUTURE] Brute force approval token attempts
[FUTURE] Brute force admin key attempts
```

### **Level 5: Audit & Admin Flows** (Newman Collection)

#### **5A: Audit Trail Integrity**
```
Create consent → verify CONSENT_REQUESTED in audit
Approve consent → verify CONSENT_APPROVED in audit
Revoke consent → verify CONSENT_REVOKED in audit
Process allowed → verify PROCESSING_ALLOWED in audit
Process denied → verify PROCESSING_DENIED in audit
Admin expire ACTIVE → verify CONSENT_EXPIRED with "forcedBy": "ADMIN"
Verify audit chain integrity (hashes chain correctly)
```

#### **5B: Audit Pagination**
```
GET /audit?page=1&limit=10 → returns first 10
GET /audit?page=2&limit=10 → returns next 10
GET /audit?page=100&limit=1000 → limit capped at 1000
GET /audit with no params → default limit=100, page=1
Verify total count matches actual records
```

#### **5C: Audit Ordering**
```
GET /audit → events ordered by timestamp ASC
Multiple events in same second → verify deterministic ordering (by ID?)
```

#### **5D: Complete Consent Lifecycle Audit**
```
1. Create consent (REQUESTED)
   - Audit: CONSENT_REQUESTED
2. Approve (ACTIVE)
   - Audit: CONSENT_APPROVED
3. Process data (allowed)
   - Audit: PROCESSING_ALLOWED
4. Revoke
   - Audit: CONSENT_REVOKED
5. Process data (denied)
   - Audit: PROCESSING_DENIED
Verify all events in audit in correct order
```

---

## Part 6: Additional Recommendations

### 🔒 **Security Improvements**
1. **Rate Limiting**: Add Redis/in-memory rate limiting middleware
2. **Request Signing**: Consider HMAC signatures for critical operations
3. **CORS**: Define explicit CORS policy
4. **Content-Type Validation**: Explicitly validate `application/json`
5. **Timeout**: Add request timeout (30s?)
6. **Input Size Limits**: Limit request body size (~1MB)

### 📊 **Operational Improvements**
1. **Structured Logging**: Replace console.log with JSON logging (winston/pino)
2. **Metrics**: Track consent approval rates, processing counts
3. **Monitoring**: Alert on approval token expiry rates, processing denials
4. **Request IDs**: Add correlation IDs for tracing

### 🏗️ **Code Quality Improvements**
1. **Extract wrap() helper**: Already done globally, good
2. **Shared mapRow()**: Already extracted, good
3. **Type safety**: Consider stricter TypeScript strict mode
4. **Test Coverage**: Aim for >80% code coverage

### ⚙️ **Configuration Improvements**
1. **Environment variables** for:
   - DB connection pool size
   - Approval token TTL (currently 24h hardcoded)
   - Consent validity default (currently no default)
   - Cron schedule (currently 10 min hardcoded)
   - Audit pagination limit cap (currently 1000)
   - Admin API key requirement enforcement

---

## Part 7: Implementation Priority

### Phase 1 (Immediate - Critical)
- [ ] Fix admin API key enforcement (reject if not set)
- [ ] Add request body validation to approve/reject routes
- [ ] Add validUntil > NOW validation on consent creation
- [ ] Implement unit tests for policy engine
- [ ] Implement unit tests for repositories

### Phase 2 (High Priority - This Sprint)
- [ ] Add audit filtering/authorization checks
- [ ] Add all API contract tests (Newman)
- [ ] Add security/abuse tests
- [ ] Implement request size limits & timeout
- [ ] Add structured logging

### Phase 3 (Medium Priority - Next Sprint)
- [ ] Rate limiting implementation
- [ ] Reduce cron interval to 1 minute (or event-driven)
- [ ] Add monitoring/metrics
- [ ] Add consent data retention policy
- [ ] Implement user audit filtering

### Phase 4 (Nice to Have)
- [ ] Request ID tracking
- [ ] CORS policy definition
- [ ] Enhanced error messages
- [ ] Database backup/recovery tests

---

## Part 8: Running Tests

### Unit Tests
```bash
npm test  # Runs basic.test.ts and repository.test.ts
```

### API Contract Tests
```bash
npx newman run CMP-MVP-Tests.postman_collection.json \
  -e CMP-Local.postman_environment.json \
  --reporters cli,json
```

### All Tests
```bash
npm test && npx newman run CMP-MVP-Tests.postman_collection.json
```

---

## Next Steps

1. **Review this document** with the team
2. **Prioritize fixes** based on risk/effort
3. **Implement unit tests** (basic.test.ts + repository.test.ts)
4. **Add Postman tests** per specifications in Part 5
5. **Run test suite** and iterate

