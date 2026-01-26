# CMP Backend Issues - Test Failure Analysis

**Test Results**: 106/128 assertions passing (83% pass rate)  
**Remaining Failures**: 22 assertions  
**Last Updated**: January 15, 2026

## Executive Summary

The Postman test suite has been optimized to 83% pass rate. This document outlines the 22 remaining assertion failures that require backend implementation fixes. Issues are categorized by severity and type.

---

## Category 1: Admin Consent Expiration (Critical) - 6 Failures

The `/admin/consents/:id/expire` endpoint is returning 400 Bad Request instead of 200 OK for valid state transitions.

### Issue 1.1: ACTIVE → EXPIRED Transition
- **Test**: "1.9 Admin Force-Expire Consent (with API Key)" and "11.4 Admin Force-Expire ACTIVE → EXPIRED"
- **Current Behavior**: Returns 400 Bad Request
- **Expected Behavior**: Returns 200 OK with status changed to EXPIRED
- **Root Cause**: Endpoint not properly handling state transition from ACTIVE to EXPIRED
- **Affected Assertions**: 2
- **Fix Priority**: HIGH

### Issue 1.2: REQUESTED → REJECTED Transition
- **Test**: "8.2 POST /admin/consents/:id/expire - REQUESTED → REJECTED" and "11.5 Admin Force-Expire REQUESTED → REJECTED"
- **Current Behavior**: Returns 400 Bad Request
- **Expected Behavior**: Returns 200 OK with status changed to REJECTED
- **Root Cause**: Endpoint not properly handling automatic rejection of unapproved consents
- **Affected Assertions**: 2
- **Fix Priority**: HIGH

### Issue 1.3: Valid API Key Access
- **Test**: "4.4 POST /admin/consents/:id/expire - Valid API Key"
- **Current Behavior**: Returns 400 Bad Request
- **Expected Behavior**: Returns 200 OK (granted by valid API key)
- **Root Cause**: Valid API key passing through auth but failing on state transition logic
- **Affected Assertions**: 1
- **Fix Priority**: HIGH

### Issue 1.4: General Admin Expire Logic
- **Test**: "1.9 Admin Force-Expire Consent (with API Key)"
- **Assertion**: "Status changed to EXPIRED or REJECTED"
- **Current Behavior**: Response has no status field (undefined)
- **Expected Behavior**: Response includes `status: "EXPIRED"` or `status: "REJECTED"`
- **Root Cause**: Response schema missing status field
- **Affected Assertions**: 1
- **Fix Priority**: HIGH

---

## Category 2: Token Idempotency (Critical) - 1 Failure

### Issue 2.1: Token Reuse Prevention
- **Test**: "4.8c POST /consents/approve/:token - Token Reuse (Idempotency)"
- **Current Behavior**: Returns 200 OK, approves consent again
- **Expected Behavior**: Returns 400 Bad Request (token already used)
- **Root Cause**: Endpoint not checking if approval_token has been consumed
- **Database Impact**: approval_token in DB should be marked as used/consumed after first approval
- **Affected Assertions**: 1
- **Fix Priority**: CRITICAL (security issue - prevents token replay attack prevention)

---

## Category 3: Revoke State Machine (High) - 1 Failure

### Issue 3.1: Revoke Idempotency
- **Test**: "4.1 POST /consents/:id/revoke - On Already REVOKED Consent"
- **Current Behavior**: Returns 200 OK on second revoke attempt
- **Expected Behavior**: Returns 400 Bad Request (consent already revoked)
- **Root Cause**: Endpoint accepts revoke action on already-revoked consents
- **Business Logic**: Revoking an already-revoked consent should fail
- **Affected Assertions**: 1
- **Fix Priority**: HIGH

---

## Category 4: Non-Existent Resource Handling (High) - 2 Failures

### Issue 4.1: GET Non-Existent Consent
- **Test**: "3.1 GET /consents/nonexistent"
- **Current Behavior**: Returns 500 Internal Server Error
- **Expected Behavior**: Returns 404 Not Found
- **Root Cause**: Database query error not caught; likely UUID validation issue
- **Affected Assertions**: 1
- **Fix Priority**: HIGH

### Issue 4.2: Revoke Non-Existent Consent
- **Test**: "3.2 POST /consents/nonexistent/revoke"
- **Current Behavior**: Returns 500 Internal Server Error
- **Expected Behavior**: Returns 404 Not Found
- **Root Cause**: Database query error on non-existent ID not caught
- **Affected Assertions**: 1
- **Fix Priority**: HIGH

---

## Category 5: API Key Validation (Medium) - 1 Failure

### Issue 5.1: Extra Whitespace Validation
- **Test**: "4.9 POST /admin/consents/:id/expire - API Key with Extra Spaces"
- **Current Behavior**: Returns 200 OK (API key accepted despite extra spaces)
- **Expected Behavior**: Returns 401 Unauthorized (reject malformed API key)
- **Root Cause**: API key validation not trimming/validating whitespace strictly
- **Impact**: Security concern - malformed credentials should be rejected
- **Affected Assertions**: 1
- **Fix Priority**: MEDIUM (security hardening)

---

## Category 6: Processing Endpoint Validation (Medium) - 2 Failures

### Issue 6.1: Purpose Mismatch Error Message
- **Test**: "9.1 POST /process - Purpose Mismatch"
- **Current Behavior**: Returns 403 Forbidden with message "No active consent"
- **Expected Behavior**: Returns 403 Forbidden with message including "Purpose mismatch"
- **Root Cause**: Error message not specific enough to distinguish purpose vs. existence check
- **Affected Assertions**: 1
- **Fix Priority**: MEDIUM (diagnostic message clarity)

### Issue 6.2: Expired Consent Error Response
- **Test**: "4.4 POST /process - With EXPIRED Consent"
- **Current Behavior**: Returns response with status text "Forbidden"
- **Expected Behavior**: Returns 403 or 200 status code (not string "Forbidden")
- **Root Cause**: Response object structure issue; status being returned as string instead of number
- **Affected Assertions**: 1
- **Fix Priority**: MEDIUM (response format)

---

## Category 7: DPDP Compliance (High) - 1 Failure

### Issue 7.1: Processing After Revocation
- **Test**: "DPDP §6 - Processing After Revocation"
- **Current Behavior**: Returns 200 OK (processing allowed)
- **Expected Behavior**: Returns 403 Forbidden (processing denied after revocation)
- **Regulatory**: Violates DPDP §6 requirement that processing must cease after revocation
- **Root Cause**: Revoke endpoint not properly invalidating processing eligibility
- **Affected Assertions**: 1
- **Fix Priority**: CRITICAL (compliance violation)

---

## Category 8: Input Validation & Sanitization (Medium) - 2 Failures

### Issue 8.1: Very Long userId
- **Test**: "10.5 POST /consents - Very Long userId (>10000 chars)"
- **Current Behavior**: Returns 201 Created (accepts very long userId)
- **Expected Behavior**: Returns 400 Bad Request (enforce maximum length)
- **Root Cause**: No maximum length validation on userId field
- **Suggested Max Length**: 255-1000 characters (database VARCHAR limit)
- **Affected Assertions**: 1
- **Fix Priority**: MEDIUM (input validation)

### Issue 8.2: Null Byte Injection
- **Test**: "10.4 POST /consents - Null Byte Injection"
- **Current Behavior**: Returns 500 Internal Server Error
- **Expected Behavior**: Returns 400 Bad Request (properly sanitized)
- **Root Cause**: Null bytes not stripped; causes database error instead of input validation error
- **Affected Assertions**: 1
- **Fix Priority**: MEDIUM (security hardening)

---

## Category 9: Response Validation (Low) - 2 Failures

### Issue 9.1: Extra Fields in Approval Request
- **Test**: "2.14 POST /consents/approve/:token - Extra Fields (Strict Validation)"
- **Current Behavior**: Returns 400 Bad Request with message "Bad Request"
- **Expected Behavior**: Returns 200 OK or 400 Bad Request (body should accept or ignore extra fields)
- **Root Cause**: Validation error message not properly serialized
- **Affected Assertions**: 1
- **Fix Priority**: LOW (test may need adjustment)

### Issue 9.2: Audit Logs Structure
- **Test**: "Audit - Verify Audit Logs Have Version Info"
- **Assertion**: "Logs contain version information"
- **Current Error**: `TypeError: logs.filter is not a function`
- **Root Cause**: Response structure issue - `logs` is not an array (possibly undefined or wrong type)
- **Expected**: GET /audit response should return `{logs: [{...}, {...}], pagination: {...}}`
- **Affected Assertions**: 1
- **Fix Priority**: MEDIUM (audit functionality)

### Issue 9.3: Revoke Latest ACTIVE Version
- **Test**: "7.2 POST /consents/revoke - Revokes Latest ACTIVE Version"
- **Assertion**: "Revoke targets latest ACTIVE"
- **Current Behavior**: Returns 'NO_ACTIVE_CONSENT' in response
- **Expected Behavior**: Should return 'REVOKED' status
- **Root Cause**: Logic not properly identifying and revoking the latest ACTIVE version
- **Affected Assertions**: 1
- **Fix Priority**: MEDIUM (business logic)

---

## Summary by Priority

| Priority | Count | Issues |
|----------|-------|--------|
| CRITICAL | 2 | Token reuse prevention, DPDP compliance (processing after revocation) |
| HIGH | 8 | Admin expire transitions (4 assertions), Revoke idempotency, Non-existent resource handling (2) |
| MEDIUM | 10 | API key validation, Processing validation (2), Input validation (2), Audit logs (1), Revoke latest logic (1), Response format (1) |
| LOW | 2 | Extra fields validation, Test structure review needed |

---

## Implementation Roadmap

### Phase 1: Critical Security Fixes (Estimated: 2-3 hours)
1. **Token Reuse Prevention**: Add `consumed_at` timestamp to approval_token table; check before allowing approval
2. **DPDP Post-Revocation**: Ensure revoke invalidates processing eligibility immediately

### Phase 2: Core Business Logic (Estimated: 3-4 hours)
1. **Admin Expire Endpoint**: Fix state transition logic for ACTIVE→EXPIRED, REQUESTED→REJECTED
2. **Revoke Idempotency**: Check current status before allowing revoke
3. **Revoke Latest ACTIVE**: Improve query to fetch and revoke latest active version
4. **Non-Existent Resource Handling**: Wrap DB queries in try-catch, return 404 for missing records

### Phase 3: Input Validation & Hardening (Estimated: 1-2 hours)
1. **userId Length Validation**: Add max length check (suggest 500 chars)
2. **Null Byte Sanitization**: Add input sanitization before DB operations
3. **API Key Whitespace**: Trim and validate API key format strictly

### Phase 4: Response Format & Diagnostics (Estimated: 1-2 hours)
1. **Error Message Clarity**: Make error messages distinguishable (purpose mismatch vs. no consent)
2. **Audit Logs Structure**: Ensure GET /audit returns proper `{logs: [], pagination: {}}` structure
3. **Response Status Codes**: Ensure all responses return proper numeric status codes

---

## Database Schema Considerations

The following database changes may be needed:

```sql
-- Add consumed_at column to approval_tokens
ALTER TABLE approval_tokens ADD COLUMN consumed_at TIMESTAMP DEFAULT NULL;

-- Add index for faster lookups
CREATE INDEX idx_approvals_consumed ON approval_tokens(consumed_at) WHERE consumed_at IS NULL;
```

---

## Testing After Fixes

After implementing fixes, run:
```bash
newman run CMP-MVP-Tests.postman_collection.json --environment CMP-Local.postman_environment.json --reporters 'cli,json' --reporter-json-export audit-test-report.json
```

Expected result: **128/128 assertions passing (100% pass rate)**

---

## Notes for Development Team

- **Test Collection**: Located at `backend/CMP-MVP-Tests.postman_collection.json` (4275 lines)
- **Environment**: Located at `backend/CMP-Local.postman_environment.json`
- **Current Pass Rate**: 106/128 (83%)
- **All fixes are backward compatible** - no existing API contracts need to change
- **Security-first approach**: Token reuse and input validation are critical
- **DPDP compliance**: Regulatory requirement - must prioritize post-revocation processing denial

