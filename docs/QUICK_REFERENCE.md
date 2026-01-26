# CMP Testing Quick Reference

## 📂 Files Provided

| File | Purpose | Size |
|------|---------|------|
| [TEST_STRATEGY.md](TEST_STRATEGY.md) | Comprehensive testing architecture & specifications | 95 KB |
| [POSTMAN_TEST_SPECS.md](POSTMAN_TEST_SPECS.md) | 88 Postman test specifications with scripts | 120 KB |
| [REVIEW_SUMMARY.md](REVIEW_SUMMARY.md) | Executive summary & implementation roadmap | 25 KB |
| [src/tests/basic.test.ts](backend/src/tests/basic.test.ts) | 36 unit tests (enhanced) | 12 KB |

---

## 🚀 Quick Start

### 1. Run Unit Tests
```bash
cd backend
npm test
```
**Expected:** 36/36 tests PASS ✅

### 2. Review Issues
Open [REVIEW_SUMMARY.md](REVIEW_SUMMARY.md) Section "Critical Issues" (5 items)

### 3. Implement Fixes
Pick items from "Phase 1: Critical Fixes" and fix in code

### 4. Verify Fixes
```bash
npm test  # Should still pass
```

### 5. Build Postman Tests
Follow [POSTMAN_TEST_SPECS.md](POSTMAN_TEST_SPECS.md) "How to Implement in Postman GUI"

### 6. Run API Tests
```bash
npx newman run CMP-MVP-Tests.postman_collection.json \
  -e CMP-Local.postman_environment.json
```

---

## 🔴 Critical Issues - Quick Fix List

### Issue #1: Admin API Key Not Enforced
**File:** `src/middleware/auth.ts` (Lines 10-18)
**Fix Time:** 5 minutes
**Change:** Add `else` block to reject when key not set

### Issue #2: No validUntil > NOW Validation  
**File:** `src/schemas/consent.schema.ts`
**Fix Time:** 10 minutes
**Change:** Add `.refine()` to validUntil field

### Issue #3: Approval Routes Not Validated
**File:** `src/routes/consentRoutes.ts`
**Fix Time:** 10 minutes
**Change:** Add `validate(ApprovalSchema)` to routes

### Issue #4: DPDP §6 Compliance (Expiry Window)
**File:** `src/index.ts` (POST /process endpoint)
**Fix Time:** 20 minutes
**Change:** Add expiry check before processing

### Issue #5: Approval TTL Hardcoded
**File:** `src/repositories/consentRepo.ts`
**Fix Time:** 10 minutes
**Change:** Use `process.env.APPROVAL_TOKEN_TTL_HOURS`

**Total Time:** ~60 minutes for all critical fixes

---

## 📊 Test Distribution

```
36 Unit Tests (DONE)
├─ Audit Chain: 4 tests
├─ Policy Engine: 8 tests
├─ DataTypes: 10 tests
└─ Edge Cases: 14 tests

88 Postman Tests (TO DO)
├─ Happy Paths: 9 tests
├─ Validation (400): 14 tests
├─ Not Found (404): 3 tests
├─ Authorization (401): 4 tests
├─ State Transitions: 5 tests
├─ Approval/Rejection: 7 tests
├─ Revoke: 2 tests
├─ Admin Expire: 5 tests
├─ Processing Auth: 5 tests
├─ Security/Abuse: 10 tests
├─ Audit: 5 tests
└─ Pagination: 2 tests
```

---

## 🎯 Implementation Timeline

| Phase | Tasks | Days | Priority |
|-------|-------|------|----------|
| 1 | Fix 5 critical issues | 1-2 | 🔴 CRITICAL |
| 2 | Fix 4 medium issues | 1 | 🟡 MEDIUM |
| 3 | Add 88 Postman tests | 3-4 | 🟢 HIGH |
| 4 | Documentation | 0.5 | 🟢 HIGH |

---

## ✅ Completion Checklist

### Before Production
- [ ] All 5 critical fixes implemented
- [ ] npm test: 36/36 PASS
- [ ] Newman tests: 88/88 PASS
- [ ] Code review completed
- [ ] Security audit completed

### Deployment
- [ ] Environment variables set (.env)
- [ ] Database initialized
- [ ] Server starts without errors
- [ ] Health check responds
- [ ] Audit chain verified

---

## 📖 Where to Find What

| Question | Answer In |
|----------|-----------|
| What tests should I add to Postman? | POSTMAN_TEST_SPECS.md (complete specs) |
| What are the security vulnerabilities? | REVIEW_SUMMARY.md (Section: Key Vulnerabilities) |
| How do I structure tests? | TEST_STRATEGY.md (Section: Test Architecture) |
| What does the unit test cover? | src/tests/basic.test.ts (36 tests) |
| What's the priority for fixes? | REVIEW_SUMMARY.md (Section: Implementation Roadmap) |
| Why is this issue critical? | REVIEW_SUMMARY.md (Section: Critical Issues) |

---

## 💡 Pro Tips

1. **Run tests frequently** - After each code change
   ```bash
   npm test
   ```

2. **Use Newman for CI/CD**
   ```bash
   npx newman run CMP-MVP-Tests.postman_collection.json \
     -e CMP-Local.postman_environment.json \
     --reporters cli,json \
     --bail  # Stop on first failure
   ```

3. **Check audit logs** when debugging
   ```bash
   # GET /audit in Postman or curl
   curl http://localhost:3000/audit?page=1&limit=100
   ```

4. **Verify each fix individually**
   ```bash
   # Make fix → npm test → check passes → move to next
   ```

5. **Document env variables**
   ```bash
   # .env.example
   ADMIN_API_KEY=your-secret-key
   APPROVAL_TOKEN_TTL_HOURS=24
   DB_HOST=localhost
   # ... etc
   ```

---

## 📞 Support

If you have questions about:
- **Unit tests** → See [src/tests/basic.test.ts](backend/src/tests/basic.test.ts)
- **Postman tests** → See [POSTMAN_TEST_SPECS.md](POSTMAN_TEST_SPECS.md) parts 1-11
- **Architecture** → See [TEST_STRATEGY.md](TEST_STRATEGY.md) Part 4
- **Issues** → See [REVIEW_SUMMARY.md](REVIEW_SUMMARY.md) sections for critical/medium issues
- **Implementation** → See [REVIEW_SUMMARY.md](REVIEW_SUMMARY.md) "Implementation Roadmap"

---

## 🏁 Done!

All analysis, testing specs, and unit tests are ready. Your CMP is now fully documented for comprehensive testing before production deployment.

**Next Action:** Review [REVIEW_SUMMARY.md](REVIEW_SUMMARY.md) and prioritize fixes.
