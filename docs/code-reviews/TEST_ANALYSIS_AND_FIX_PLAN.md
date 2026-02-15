# TEST ANALYSIS & COMPREHENSIVE FIX PLAN

> **Rev 1** | 2026-02-15 | Companion to [COMPREHENSIVE_AUDIT_REPORT.md](COMPREHENSIVE_AUDIT_REPORT.md) Rev 2

---

## PART 1: POSTMAN/NEWMAN COLLECTION GAP ANALYSIS

### 1.1 Collection Overview

**File:** `backend/CMP-MVP-Tests.postman_collection.json` (4,477 lines)
**Environment:** `backend/CMP-Local.postman_environment.json`

| Folder | Name | Requests | Focus |
|--------|------|----------|-------|
| 1 | Happy Path | 9 | Full lifecycle: health → create → get → approve → process → revoke → audit → admin-expire |
| 2 | Validation Errors | 14 | Missing/invalid fields on POST /consents, /consents/revoke, /process |
| 3 | NotFound & Authorization | 9 | 404s, invalid tokens, API key auth (missing/invalid/empty/valid) |
| 4 | State & Approval | 25 | Status enforcement, token reuse, rejection, multi-version |
| 5 | Admin & Revoke | 7 | Semantic revoke edge cases, admin force-expire state transitions |
| 6 | Processing & Security | 17 | Purpose/dataType mismatch, SQL injection, XSS, null byte, token attacks, unicode |
| 7 | Audit & Admin Flows | 12 | Full lifecycle audit trail, pagination, chain integrity, admin force-expire |
| 8 | Additional Tests | 17 | Rejection/versioning, DPDP §6 compliance, path traversal, rate limiting, large payload, UUID validation |
| **TOTAL** | | **110** | |

### 1.2 Endpoints TESTED by Postman (10 of 38)

| # | Endpoint | Auth Used | Notes |
|---|----------|-----------|-------|
| 1 | `GET /health` | None | ✅ Working |
| 2 | `POST /consents` | None | ⚠️ **STALE** — missing required `noticeId`, `noticeVersion`, `language` fields |
| 3 | `GET /consents/:id` | None | ✅ Working |
| 4 | `POST /consents/approve/:token` | None (token-based) | ✅ Working |
| 5 | `POST /consents/reject/:token` | None (token-based) | ✅ Working |
| 6 | `POST /consents/revoke` | None | ✅ Semantic revoke tested |
| 7 | `POST /process` | None | ✅ Working |
| 8 | `GET /audit` | `X-API-Key` header | ⚠️ **STALE** — now requires JWT + RBAC `AUDIT_READ` permission, not X-API-Key |
| 9 | `POST /admin/consents/:id/expire` | `X-API-Key` header | ⚠️ **STALE** — now requires JWT + RBAC `CONSENT_FORCE_EXPIRE` permission |
| 10 | `POST /consents/:id/revoke` | — | Only semantic revoke tested; ID-based revoke NOT exercised |

### 1.3 Endpoints NOT TESTED by Postman (28 of 38) — 73.7% untested

| Category | Endpoint | Auth Required | Gap Severity |
|----------|----------|---------------|--------------|
| **Metrics** | `GET /metrics` | None | 🟡 LOW |
| **Dashboard** | `GET /api/consents` | JWT | 🔴 HIGH — core DP dashboard |
| **Receipts** | `GET /consents/:id/receipt` | None | 🔴 HIGH — ISO 29184 compliance |
| **Receipts** | `GET /consents/:id/receipt.pdf` | None | 🔴 HIGH — regulatory requirement |
| **Revoke** | `POST /consents/:id/revoke` | None | 🟡 MEDIUM — semantic revoke covers similar logic |
| **Activity** | `GET /api/activity-log` | JWT | 🔴 HIGH — core DP dashboard |
| **Erasure** | `POST /api/erasure-requests` | JWT | 🔴 HIGH — DPDP §12(1) right to erasure |
| **Erasure** | `GET /api/erasure-requests` | JWT | 🔴 HIGH — user erasure list |
| **Erasure** | `GET /api/erasure-requests/:id` | JWT | 🟡 MEDIUM |
| **Admin Erasure** | `GET /admin/erasure-requests` | JWT + RBAC ADMIN | 🟡 MEDIUM |
| **Admin Erasure** | `PATCH /admin/erasure-requests/:id/status` | JWT + RBAC ADMIN | 🔴 HIGH — erasure workflow |
| **Webhooks** | `GET /webhooks` | X-API-Key | 🟡 MEDIUM |
| **Webhooks** | `POST /webhooks` | X-API-Key | 🔴 HIGH — webhook registration |
| **Webhooks** | `GET /webhooks/:id` | X-API-Key | 🟡 LOW |
| **Webhooks** | `PATCH /webhooks/:id` | X-API-Key | 🟡 MEDIUM |
| **Webhooks** | `DELETE /webhooks/:id` | X-API-Key | 🟡 MEDIUM |
| **Webhooks** | `GET /webhooks/:id/deliveries` | X-API-Key | 🟡 LOW |
| **Webhooks** | `POST /webhooks/:id/test` | X-API-Key | 🟡 LOW |
| **Webhooks** | `POST /webhooks/generate-secret` | X-API-Key | 🟡 LOW |
| **Auth** | `GET /auth/login` | None | 🔴 HIGH — OAuth2 flow |
| **Auth** | `GET /auth/callback` | None | 🔴 HIGH — OAuth2 JWT issuance |
| **Auth** | `POST /auth/logout` | None | 🟡 MEDIUM |
| **Users** | `GET /api/users/me` | JWT | 🔴 HIGH — session identity |
| **Users** | `GET /api/users/:id` | JWT + RBAC | 🟡 MEDIUM |
| **Users** | `POST /api/users/:id/roles` | JWT + RBAC | 🔴 HIGH — RBAC assignment |
| **Users** | `DELETE /api/users/:id/roles/:roleName` | JWT + RBAC | 🟡 MEDIUM |
| **Users** | `POST /api/users/service-accounts` | JWT + RBAC | 🔴 HIGH — service account creation |
| **Users** | `POST /api/users/:id/deactivate` | JWT + RBAC | 🟡 MEDIUM |

### 1.4 CRITICAL Postman Collection Bugs

#### BUG-1: All `POST /consents` requests will FAIL ⛔

The current codebase requires `noticeId`, `noticeVersion`, and `language` in the `CreateConsentSchema`. **Every** consent creation request in the Postman collection omits these fields:

```json
// CURRENT (BROKEN)
{"userId": "user-1", "purpose": "marketing", "dataTypes": ["name"], "validUntil": "2026-12-31T23:59:59Z"}

// REQUIRED
{"userId": "user-1", "purpose": "marketing", "dataTypes": ["name"], "validUntil": "2026-12-31T23:59:59Z",
 "noticeId": "notice-v1", "noticeVersion": "1.0.0", "language": "en"}
```

This affects **~60+ of 110 requests** because most folders create consents as setup steps. The collection is effectively **non-functional** against the current codebase.

#### BUG-2: Admin/Audit endpoints use wrong auth mechanism

Tests use `X-API-Key: {{adminApiKey}}` header, but the audit and admin endpoints now require:
- JWT token via `authenticateJWT` middleware
- RBAC permission check via `requirePermission()`

All Folder 7 audit tests and admin force-expire tests will return **401 Unauthorized**.

#### BUG-3: Pre-request scripts also create consents without required fields

The `prerequest` scripts in Folders 5, 7, and 8 use `pm.sendRequest()` to create consents, and these ALSO omit `noticeId/noticeVersion/language`. These setup steps will fail, cascading errors to all dependent tests.

### 1.5 Quality Issues in Assertions

| Issue | Examples | Impact |
|-------|----------|--------|
| **Loose status checks** | `pm.expect([200, 201, 400]).to.include(pm.response.code)` for SQL injection | Passes regardless of behavior — test is meaningless |
| **Loose status checks** | `pm.expect([200, 201]).to.include(pm.response.code)` for XSS | Doesn't assert XSS is actually sanitized |
| **Missing body assertions** | Rate limiting test only checks `[200, 429]` | Doesn't verify rate-limit headers or response body |
| **No error message checks** | Many 400 tests only check status code | Doesn't verify correct error reason |
| **No response shape validation** | Happy path doesn't validate full response schema | Could miss missing/extra fields |

---

## PART 2: TEST LAYER COMPARISON & CONSOLIDATION ANALYSIS

### 2.1 Layer Comparison

| Dimension | `basic.test.ts` (Layer 1) | Postman/Newman (Layer 2) |
|-----------|---------------------------|--------------------------|
| **Type** | Unit tests (in-process) | API integration tests (HTTP) |
| **Infrastructure** | None (no DB, no HTTP server) | Running server + PostgreSQL |
| **Speed** | ~50ms total | ~30-60s total |
| **Functions tested** | `verifyAuditChain`, `evaluateConsentPolicy` | 10 of 38 HTTP endpoints |
| **Test count** | ~30 assertions | ~110 requests |
| **Test runner** | Custom (process.exit-based) | Newman CLI / Postman UI |
| **CI/CD friendliness** | Run via `npm test` | Requires `newman run` + running server |
| **Statefulness** | Stateless (pure functions) | Stateful (tests depend on execution order) |
| **Coverage scope** | 2 pure functions | Consent lifecycle, validation, security, audit |
| **Current status** | ✅ Likely working | ⛔ Broken (missing required fields, wrong auth) |

### 2.2 What Each Layer Uniquely Covers

**Only in basic.test.ts:**
- Audit hash computation correctness
- Audit chain tamper detection
- Policy engine decision logic at function level
- Boundary conditions (version 0, -1, empty arrays, 10K-length strings, 100-element arrays)

**Only in Postman/Newman:**
- HTTP status codes and response shapes
- Zod validation rejection (missing fields, wrong types)
- State machine transitions via API
- Security attacks (SQLi, XSS, null byte, path traversal)
- Multi-step workflows (create → approve → process → revoke → audit)
- Token lifecycle (approval, rejection, reuse prevention)
- Admin operations via API
- Pagination behavior

**In neither (gaps):**
- 28 of 38 endpoints (see §1.3)
- OAuth2 login/callback flow
- JWT authentication enforcement
- RBAC permission enforcement
- Webhook registration, delivery, HMAC signing
- Consent receipt generation (JSON + PDF)
- Erasure request lifecycle
- User/role management
- Middleware logic (rate limiting, validation, error handling)
- Database repository functions in isolation
- Cron job (consent expiry)
- Webhook delivery retry logic

### 2.3 Consolidation Options

#### Option A: Single comprehensive.test.ts (Vitest/Jest + Supertest)

| Pros | Cons |
|------|------|
| Single `npm test` command | Large effort to rewrite 110 Postman tests |
| CI/CD native (no external tools) | Loses Postman UI explorability |
| Can mock DB for unit tests | Need to manage test DB setup/teardown |
| Parallel execution possible | Integration tests still need running DB |
| Unified coverage reporting | Loss of "API documentation" aspect of Postman |
| TypeScript type safety | |

#### Option B: Single comprehensive Newman collection

| Pros | Cons |
|------|------|
| 110 tests already exist as starting point | Can't test pure functions |
| Visual exploration in Postman UI | Requires running server + DB |
| Tests real HTTP stack end-to-end | Sequential/stateful execution (slow, fragile) |
| API documentation double-duty | Harder to run in CI/CD (need server startup) |
| | No type safety |
| | Environment variable management overhead |

#### Option C: Keep Both Layers, Fix & Expand (RECOMMENDED) ✅

| Pros | Cons |
|------|------|
| Each layer tests different concerns | Two places to maintain |
| Unit tests: fast, isolated, CI-friendly | Need clear ownership of what goes where |
| Integration tests: realistic E2E | |
| Aligns with testing pyramid best practices | |
| Can add supertest layer for CI/CD HTTP tests | |

### 2.4 Recommendation

**Keep both layers** with these changes:

1. **Layer 1 (Unit):** Migrate `basic.test.ts` to Vitest, EXPAND massively to cover all pure functions, repositories (with mocked DB), middleware, schemas, and utility functions.

2. **Layer 2 (Integration):** FIX the Postman collection (add required fields, fix auth), EXPAND to cover all 38 endpoints. This remains the "exploratory/documentation" test suite.

3. **Layer 3 (NEW — CI Integration):** Add a `supertest`-based integration test file that tests critical API paths in CI/CD without needing Newman or Postman. This is the HTTP equivalent of basic.test.ts — runs via `npm test`, no external tools.

---

## PART 3: COMPREHENSIVE FIX PLAN

### 3.0 Issue Master List

Consolidated from COMPREHENSIVE_AUDIT_REPORT.md Rev 2 findings + Postman analysis above.

| ID | Severity | Source | Issue Summary |
|----|----------|--------|---------------|
| NEW-SEC-01 | 🔴 CRITICAL | Audit Rev 2 | 6 consent endpoints lack authentication (POST /consents, GET /consents/:id, receipts, revoke) |
| NEW-SEC-02 | 🟡 HIGH | Audit Rev 2 | Client-side userId in grant consent flow — should come from JWT |
| NEW-TEST-01 | 🔴 CRITICAL | Audit Rev 2 | Testing vastly insufficient (corrected: basic.test.ts exists + Postman exists but broken) |
| NEW-PERF-01 | 🟡 MEDIUM | Audit Rev 2 | Activity log O(n) full-table scan |
| NEW-ARCH-01 | 🟡 HIGH | Audit Rev 2 | index.ts monolith (1013 lines) — all routes inline |
| NEW-DATA-01 | 🟡 LOW | Audit Rev 2 | Phantom metadata column reference in userRepo |
| PM-BUG-1 | ⛔ BLOCKER | Postman Analysis | All POST /consents requests missing noticeId/noticeVersion/language |
| PM-BUG-2 | ⛔ BLOCKER | Postman Analysis | Admin/audit tests use X-API-Key, now requires JWT+RBAC |
| PM-BUG-3 | ⛔ BLOCKER | Postman Analysis | Pre-request scripts also broken (same as PM-BUG-1) |
| PM-GAP-1 | 🔴 HIGH | Postman Analysis | 28 of 38 endpoints untested (73.7%) |
| PM-QUAL-1 | 🟡 MEDIUM | Postman Analysis | Loose/meaningless assertions (accept multiple status codes) |
| UNIT-GAP-1 | 🔴 HIGH | Test Analysis | Only 2 functions have unit tests (verifyAuditChain, evaluateConsentPolicy) |
| UNIT-GAP-2 | 🟡 MEDIUM | Test Analysis | Custom test harness (process.exit) — no standard runner |
| ROUTE-LEGACY | 🟡 HIGH | Audit Rev 2 | Legacy routes (/consents) coexist with new routes (/api/consents) — reconciliation needed |
| CI-GAP | 🔴 HIGH | Audit Rev 2 | No CI/CD pipeline (GitHub Actions, etc.) |
| DOC-GAP | 🟡 LOW | Audit Rev 2 | API documentation doesn't cover all 38 endpoints |

### 3.1 Phased Fix Plan

---

#### PHASE 0: IMMEDIATE FIXES (1-2 days)
**Goal:** Make existing tests runnable again

| Task | ID Resolved | Effort | Details |
|------|-------------|--------|---------|
| **P0-1** Fix all Postman `POST /consents` request bodies to include `noticeId`, `noticeVersion`, `language` | PM-BUG-1, PM-BUG-3 | 2h | Find-replace all consent creation bodies (inline + prerequest scripts). Add `"noticeId": "test-notice-v1", "noticeVersion": "1.0.0", "language": "en"` to every request. ~30 locations. |
| **P0-2** Fix Postman admin/audit tests to use JWT auth | PM-BUG-2 | 2h | Add a prerequest script in Folder 7 collection-level that calls `/auth/login` → `/auth/callback` to get a JWT, then use `Authorization: Bearer {{jwt}}` instead of `X-API-Key`. OR: temporarily add X-API-Key fallback to admin routes (NOT recommended for production). |
| **P0-3** Update Postman environment file | PM-BUG-1,2 | 30m | Add `noticeId`, `noticeVersion`, `language`, `jwtToken` variables to `CMP-Local.postman_environment.json` |
| **P0-4** Run Newman to verify fixes | — | 1h | `npx newman run CMP-MVP-Tests.postman_collection.json -e CMP-Local.postman_environment.json --reporters cli,json` |

---

#### PHASE 1: SECURITY HARDENING (3-5 days)
**Goal:** Close critical auth gaps

| Task | ID Resolved | Effort | Details |
|------|-------------|--------|---------|
| **P1-1** Add `authenticateJWT` to `POST /consents` | NEW-SEC-01 | 2h | Consent creation must require authenticated user. Extract `userId` from `req.user.userId` instead of request body. |
| **P1-2** Add `authenticateJWT` to `GET /consents/:id` | NEW-SEC-01 | 1h | Verify requesting user owns the consent or has ADMIN role. |
| **P1-3** Add `authenticateJWT` to receipt endpoints | NEW-SEC-01 | 1h | `GET /consents/:id/receipt` and `/consents/:id/receipt.pdf` — same ownership check. |
| **P1-4** Add `authenticateJWT` to `POST /consents/:id/revoke` | NEW-SEC-01 | 1h | Only consent owner or admin can revoke by ID. |
| **P1-5** Add `authenticateJWT` to `POST /consents/revoke` (semantic) | NEW-SEC-01 | 1h | Extract userId from JWT, ignore body userId. |
| **P1-6** Fix userId source in grant consent flow | NEW-SEC-02 | 2h | Frontend `GrantConsentPage.tsx` should NOT supply userId — backend extracts from JWT. Update `CreateConsentSchema` to make userId optional (fallback to `req.user.userId`). |
| **P1-7** Remove legacy unauthenticated API key fallback in admin routes | — | 1h | Ensure all admin routes use JWT+RBAC exclusively (no X-API-Key bypass). |
| **P1-8** Update Postman collection for auth changes | — | 3h | All tests that create/read/revoke consents now need JWT Bearer token. Add auth setup flow to collection prerequest. |

---

#### PHASE 2: ARCHITECTURE CLEANUP (3-5 days)
**Goal:** Reduce monolith, consolidate routes

| Task | ID Resolved | Effort | Details |
|------|-------------|--------|---------|
| **P2-1** Extract consent routes from index.ts into route files | NEW-ARCH-01 | 4h | Move `POST /consents`, `GET /consents/:id`, receipt endpoints, revoke endpoints, `POST /process` into `routes/consentRoutes.ts` (which already has approve/reject). |
| **P2-2** Extract admin routes into `routes/adminRoutes.ts` | NEW-ARCH-01 | 2h | Move `POST /admin/consents/:id/expire`, `GET/PATCH /admin/erasure-requests/*` into dedicated admin router. |
| **P2-3** Extract audit routes into `routes/auditRoutes.ts` | NEW-ARCH-01 | 1h | Move `GET /audit`, `GET /api/activity-log` into audit router. |
| **P2-4** Consolidate legacy/new route paths | ROUTE-LEGACY | 3h | Decision needed: migrate everything to `/api/*` prefix or keep mixed. Document decision in ADR. |
| **P2-5** Fix phantom metadata column | NEW-DATA-01 | 30m | Remove or add the `metadata` column reference in userRepo. |
| **P2-6** Add DB index for activity-log query | NEW-PERF-01 | 1h | `CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id)` — convert O(n) scan to O(log n). |

---

#### PHASE 3: TEST INFRASTRUCTURE (3-5 days)
**Goal:** Establish proper testing framework

| Task | ID Resolved | Effort | Details |
|------|-------------|--------|---------|
| **P3-1** Install Vitest + supertest + test utilities | UNIT-GAP-2 | 2h | `npm i -D vitest @vitest/coverage-v8 supertest @types/supertest`. Configure `vitest.config.ts`. |
| **P3-2** Migrate basic.test.ts to Vitest | UNIT-GAP-2 | 2h | Replace custom `test()` harness with `describe/it/expect`. Keep all 30 existing tests. |
| **P3-3** Set up test DB infrastructure | — | 4h | Docker-compose for test Postgres, or use `pg-mem` for in-memory. Implement `setupTestDB()` / `teardownTestDB()` helpers. Seed with migration scripts. |
| **P3-4** Create supertest app factory | — | 2h | Export Express `app` without `app.listen()` for supertest usage. Create `createTestApp()` helper. |
| **P3-5** Configure `npm test` to run Vitest | — | 30m | Update `package.json` scripts. Add coverage thresholds. |

---

#### PHASE 4: COMPREHENSIVE UNIT TESTS (5-7 days)
**Goal:** Cover all pure functions and repositories

| Task | ID Resolved | Effort | Priority | Details |
|------|-------------|--------|----------|---------|
| **P4-1** Policy engine tests (expand existing) | UNIT-GAP-1 | 1d | HIGH | Add: expired validUntil, null consent, concurrent version scenarios |
| **P4-2** Consent repository tests | UNIT-GAP-1 | 1d | HIGH | Test all CRUD ops: `createConsent`, `getConsentById`, `revokeConsent`, `getUserConsents`, version incrementing, status transitions |
| **P4-3** Audit repository tests | UNIT-GAP-1 | 1d | HIGH | Test: `insertAuditLog`, hash chain creation, pagination, user-filtered queries |
| **P4-4** User repository tests | UNIT-GAP-1 | 0.5d | MEDIUM | Test: `findOrCreateUser`, role assignment, service account creation, deactivation |
| **P4-5** Webhook repository tests | UNIT-GAP-1 | 0.5d | MEDIUM | Test: webhook CRUD, delivery recording, retry logic |
| **P4-6** Erasure repository tests | UNIT-GAP-1 | 0.5d | HIGH | Test: create/list/update erasure requests, status transitions |
| **P4-7** Schema validation tests | UNIT-GAP-1 | 0.5d | HIGH | Test every Zod schema (CreateConsentSchema, ProcessRequestSchema, etc.) with valid/invalid inputs |
| **P4-8** Middleware tests | UNIT-GAP-1 | 1d | HIGH | Test: `authenticateJWT` (valid/invalid/expired tokens), `requirePermission`, `validate`, `requireApiKey` |
| **P4-9** Utility function tests | UNIT-GAP-1 | 0.5d | MEDIUM | Test: `generateConsentReceipt`, `computeAuditHash`, `buildConsentFilterQuery`, webhook HMAC signing |

---

#### PHASE 5: COMPREHENSIVE INTEGRATION TESTS (5-7 days)
**Goal:** Test all 38 endpoints via supertest + fix Postman collection

| Task | ID Resolved | Effort | Priority | Details |
|------|-------------|--------|----------|---------|
| **P5-1** Auth flow integration tests | PM-GAP-1 | 1d | HIGH | Test: `/auth/login` redirect, `/auth/callback` JWT issuance, `/auth/logout` cookie clearing |
| **P5-2** Consent lifecycle integration tests | PM-GAP-1 | 1d | HIGH | Test: create → approve → process → revoke full cycle with proper JWT auth |
| **P5-3** Dashboard endpoint tests | PM-GAP-1 | 0.5d | HIGH | Test: `GET /api/consents` (pagination, filtering, sorting), `GET /api/activity-log` |
| **P5-4** Receipt endpoint tests | PM-GAP-1 | 0.5d | HIGH | Test: JSON receipt structure against ISO 29184, PDF generation (stream response) |
| **P5-5** Erasure request lifecycle tests | PM-GAP-1 | 1d | HIGH | Test: user creates → admin reviews → status transitions (PENDING→PROCESSING→COMPLETED/REJECTED) |
| **P5-6** Webhook management tests | PM-GAP-1 | 1d | MEDIUM | Test: all 8 webhook endpoints, HMAC signature verification, delivery retry |
| **P5-7** User/RBAC management tests | PM-GAP-1 | 1d | HIGH | Test: role assignment, permission enforcement, service account creation, user deactivation |
| **P5-8** Security integration tests | PM-QUAL-1 | 0.5d | HIGH | Test: unauthenticated access denied, RBAC enforcement, IDOR prevention, rate limiting |
| **P5-9** Update Postman collection to cover all 38 endpoints | PM-GAP-1 | 2d | MEDIUM | Add 9 new Postman folders for untested endpoints. Fix all assertions to be strict. |

---

#### PHASE 6: CI/CD & QUALITY GATES (2-3 days)
**Goal:** Automated testing on every push

| Task | ID Resolved | Effort | Details |
|------|-------------|--------|---------|
| **P6-1** Create `.github/workflows/test.yml` | CI-GAP | 2h | GitHub Actions: checkout → install → lint → unit tests → integration tests (with test DB) |
| **P6-2** Add coverage gate | CI-GAP | 1h | Fail CI if coverage drops below 70% (target 80%+) |
| **P6-3** Add Newman run to CI | CI-GAP | 2h | Start server in background, run Newman, report results |
| **P6-4** Add lint + type-check to CI | CI-GAP | 1h | `tsc --noEmit` + ESLint in CI pipeline |
| **P6-5** Add pre-commit hooks | — | 1h | Husky + lint-staged for format/lint/type-check on commit |
| **P6-6** API docs generation | DOC-GAP | 2h | Generate OpenAPI spec from Zod schemas or add Swagger annotations |

---

### 3.2 Effort Summary

| Phase | Duration | WorkItems | Key Deliverable |
|-------|----------|-----------|-----------------|
| **Phase 0** | 1-2 days | 4 | Postman collection runnable again |
| **Phase 1** | 3-5 days | 8 | All endpoints authenticated, userId from JWT |
| **Phase 2** | 3-5 days | 6 | Monolith split, routes consolidated, DB indexed |
| **Phase 3** | 3-5 days | 5 | Vitest + supertest infrastructure |
| **Phase 4** | 5-7 days | 9 | All pure functions/repos have unit tests |
| **Phase 5** | 5-7 days | 9 | All 38 endpoints have integration tests |
| **Phase 6** | 2-3 days | 6 | CI/CD pipeline with quality gates |
| **TOTAL** | **22-34 days** | **47** | **Production-ready test coverage + security + architecture** |

### 3.3 Dependency Graph

```
Phase 0 (Fix Postman) ──────────────────────────────────┐
                                                        │
Phase 1 (Security) ──→ Phase 2 (Architecture) ──→ Phase 5 (Integration Tests)
                                                        │
Phase 3 (Test Infra) ──→ Phase 4 (Unit Tests) ──────────┤
                                                        │
                                                        └──→ Phase 6 (CI/CD)
```

- Phase 0 is independent and can start immediately
- Phase 1 and Phase 3 can run in PARALLEL
- Phase 2 depends on Phase 1 (auth changes affect route structure)
- Phase 4 depends on Phase 3 (needs Vitest infrastructure)
- Phase 5 depends on Phase 2 + Phase 3 (needs both clean routes and test infra)
- Phase 6 depends on Phase 4 + Phase 5 (needs tests to exist before CI/CD)

### 3.4 Corrections to Audit Report

The following findings in COMPREHENSIVE_AUDIT_REPORT.md Rev 2 need correction:

1. **NEW-TEST-01** stated "Only 1 test file exists" and "zero automated test coverage" — this is **partially incorrect**. The Postman/Newman collection has 110 API test requests. However, the collection is **broken** (stale request bodies, wrong auth), so the practical effect is similar. Suggest rewording to: "Two test layers exist but both are insufficient. basic.test.ts covers only 2 functions. Postman collection has 110 requests but is broken (stale schemas, wrong auth) and only covers 10 of 38 endpoints."

2. **Testing score 2.0/10** — Should be revised upward to **3.0-3.5/10** acknowledging the Postman collection exists (even if broken). The intent and structure is there; execution is stale.

3. **Rev 1 claim of "36 unit tests, 88 API specs"** — This was approximately correct: basic.test.ts has ~30 assertions, and the Postman collection has 110 requests (was counted as 88 in Rev 1, likely before Folder 8 was added). Both exist; both need significant work.

---

### 3.5 Priority Order (If time-constrained)

If only 1 week is available, do in this order:

1. **P0-1 to P0-4** — Fix Postman collection (2h)
2. **P1-1 to P1-6** — Secure endpoints (2 days)
3. **P3-1, P3-2** — Install Vitest, migrate basic.test.ts (4h)
4. **P2-6** — Add DB index for activity-log (30m)
5. **P5-2** — Consent lifecycle supertest integration test (1 day)
6. **P6-1** — Basic GitHub Actions CI (2h)

This gets: authenticated endpoints, working tests, basic CI — the three most critical gaps closed.

---

*End of document*
