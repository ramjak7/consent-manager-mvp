# Consent Manager MVP — Backend Setup & Review Summary

## Overview
This is a privacy-compliant consent management system (DPDP-compliant) built with Node.js, Express, TypeScript, and PostgreSQL.

## Key Improvements Applied

### 🔐 Security & Configuration
- **DB credentials → Environment variables**: Moved hardcoded credentials from `db.ts` to `.env` (see `.env.example`)
- Added `dotenv` dependency for secure configuration management
- Created `.env.example` template for setup

### 🐛 Bug Fixes
1. **Duplicated expiry logic**: Removed redundant `setInterval` (kept single `cron.schedule`)
2. **Approval flow invariant**: Fixed `approveConsentByToken` to revoke existing ACTIVE consent when approving a new one (maintains "only one ACTIVE per user+purpose" rule)
3. **Data type handling**: Fixed `mapRow` to properly parse `dataTypes` from JSON/JSONB
4. **Audit verification**: Fixed `verifyAudit.ts` script to actually check result and exit non-zero on failure

### ✅ Validation & Error Handling
- **Added Zod schemas**: Created `consent.schema.ts` for `CreateConsent` and `RevokeSemanticSchema`
- **Applied validation middleware**: All main routes now use strict Zod validation
- **Async error wrapper**: Added `wrap()` helper to catch unhandled exceptions in async route handlers
- **Global error handler**: Added middleware to catch and log unhandled errors
- **Pagination on `/audit`**: Prevents returning unlimited logs in production

### 📊 Code Quality
- Consolidated row mapping: Use shared `mapRow` function to avoid duplication
- Improved audit script to validate chain before reporting success
- Better consistency across repository functions

## Setup Instructions

### Prerequisites
- Node.js 16+ and npm
- PostgreSQL 12+

### Installation
```bash
cd backend
npm install
```

### Configuration & Database Setup

**Quick Start (5 minutes):**
```bash
cp .env.example .env
# Edit .env with your database credentials

# Initialize database (one-time)
npm run db:init

# Verify database is ready
npm run db:check
```

For detailed database management, see [Database Setup Guide](db/README.md) and [Quick Start](db/QUICKSTART.md).

### Database Commands

```bash
npm run db:init        # Initialize fresh database (dev only)
npm run db:migrate     # Apply pending migrations
npm run db:status      # Check migration status
npm run db:rollback    # Rollback last migration
npm run db:check       # Health check
```

### Running the Server
**Development** (with hot reload):
```bash
npm run dev
```

**Production**:
```bash
npm run build
npm start
```

### Running Tests
```bash
npx ts-node src/tests/basic.test.ts
```

### Verify Audit Chain
```bash
npx ts-node src/scripts/verifyAudit.ts
```

## API Endpoints

### Core Consent Flows
- `POST /consents` — Create new consent request (schema validated)
- `GET /consents/:id` — Fetch consent by ID
- `POST /consents/:id/revoke` — Revoke specific consent version
- `POST /consents/revoke` — Semantic revoke (latest ACTIVE for user+purpose)
- `POST /consents/approve/:token` — Approve consent by token
- `POST /consents/reject/:token` — Reject consent by token

### Data Processing
- `POST /process` — Check consent and process data (schema validated)

### Admin & Audit
- `GET /audit?page=1&limit=100` — Paginated audit logs
- `POST /admin/consents/:id/expire` — Force-expire consent (no auth, add middleware in prod)
- `GET /health` — Health check

## Architecture Highlights

### Invariants
- **Single ACTIVE per (userId, purpose)**: Enforced atomically in `approveConsentByToken`
- **Authorization always on latest ACTIVE**: `/process` fetches latest ACTIVE version only
- **Audit immutability**: Hash chain prevents tampering

### Consent Lifecycle
```
REQUESTED → APPROVED → ACTIVE → (EXPIRED | REVOKED)
         → REJECTED
```

### Expiry Enforcement
- **On-demand**: Checked in `GET /consents/:id` and `/process`
- **Scheduled**: Cron job every 10 minutes (` */10 * * * *`)
- **Idempotent**: Multiple expiry checks don't cause errors

## Remaining Recommendations

### High Priority (Production)
- **Add auth middleware**: Admin endpoints need API key or JWT validation
- **Database connection pooling**: Already using pg Pool, but monitor max connections
- **Add request rate limiting**: Prevent abuse on approval/revocation flows
- **Encrypt sensitive audit details**: Consider encrypting `details` JSON in audit logs

### Medium Priority
- **Add database migrations**: Use a tool like Knex or db-migrate for schema versioning
- **Add structured logging**: Use Winston or Bunyan instead of console.log
- **Add health check for DB**: `/health` should verify database connectivity
- **Add metrics**: Track consent approval rates, processing latency

### Nice-to-Have
- **Implement idempotency tokens**: Add `processing_sessions` table to prevent replay attacks (noted in code)
- **Add webhook notifications**: Notify external systems on consent state changes
- **Implement consent expiry notifications**: Warn users before consent expires
- **Add API documentation**: Generate OpenAPI/Swagger spec

## Testing Notes
- `src/tests/basic.test.ts` includes tests for:
  - Audit chain verification
  - Policy enforcement (purpose matching, data type subsetting)
  - Inactive consent rejection
- Recommend adding integration tests with actual database before production

## Database Schema

**Version-Controlled Schema Management:**

All schema is managed through migrations for reproducibility and auditability:

- **Migrations:** `db/migrations/*.sql` - Version-controlled schema changes
- **Canonical Schema:** `db/canonical/schema.sql` - Authoritative schema reference
- **Snapshots:** `db/snapshots/schema_full_v1.sql` - Read-only historical snapshot

**Core Tables:**

1. **consents** - Versioned consent records with state machine
   - Enforces single ACTIVE consent per (user_id, purpose)
   - Supports full consent history
   - Tracks approval token lifecycle

2. **audit_logs** - Immutable append-only compliance log
   - Enforced immutability via trigger
   - Hash chain prevents tampering
   - Legal evidence for DPDP compliance

**Key Invariants:**
- ✅ Only one ACTIVE consent per (user_id, purpose) - enforced by unique index
- ✅ Audit logs are immutable - enforced by trigger
- ✅ All schema changes are version-controlled - enforced by migration system

See [Database Guide](db/README.md) for detailed schema documentation, field descriptions, and constraints.

## Support & Next Steps
- Run `npm run dev` to start development server on port 3000
- Use the Postman collection (`CMP-MVP-Tests.postman_collection.json`) for testing endpoints
- Check `audit-test-report.json` for recent test results
