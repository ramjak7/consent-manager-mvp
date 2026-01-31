# Database Management Guide

**Last Updated:** January 31, 2026  
**Environment:** Node.js + TypeScript + PostgreSQL 12+  
**Status:** Ready for Development

---

## Overview

This guide explains the database management system for the Consent Manager MVP. All schema changes are version-controlled through SQL migrations.

### Directory Structure

```
backend/db/
├── config.js                    # Migration configuration (reads .env)
├── migrate.js                   # Migration runner (main tool)
├── check.js                     # Health check & validation
├── canonical/
│   └── schema.sql               # Authoritative schema reference
├── migrations/
│   └── 001-init-schema.sql      # Initial schema migration
├── seeds/                       # (Reserved for test data)
├── snapshots/
│   └── schema_full_v1.sql       # Read-only reference snapshot
└── README.md                    # This file
```

---

## Getting Started

### Prerequisites

- PostgreSQL 12+
- Node.js 16+
- `.env` file configured with database credentials

### Environment Configuration

Create or update `.env` in the `backend/` directory:

```bash
# Development database
PG_HOST=localhost
PG_PORT=5432
PG_USER=postgres
PG_PASSWORD=yourpassword
PG_DATABASE=consent_manager

# (Optional) Test database for automated tests
PG_HOST_TEST=localhost
PG_PORT_TEST=5432
PG_USER_TEST=postgres
PG_PASSWORD_TEST=testpass
PG_DATABASE_TEST=consent_manager_test

# Admin API key
ADMIN_API_KEY=your_secure_key_here
```

### Initialize Database

For a **fresh development environment**:

```bash
cd backend
npm run db:init
```

This will:
1. Drop the public schema (⚠️ caution!)
2. Recreate the schema
3. Apply all migrations
4. Initialize migration tracker

For an **existing database** with migrations already applied:

```bash
npm run db:migrate
```

This applies only pending migrations.

---

## Migration Commands

### Apply Pending Migrations

```bash
npm run db:migrate
```

**Output:**
```
📦 Running migrations in [dev] environment...

📋 Found 1 pending migration(s):

  ⏳ Applying 001-init-schema.sql...
  ✅ Applied 001-init-schema.sql

✅ All migrations applied successfully!
```

### Check Migration Status

```bash
npm run db:status
```

**Output:**
```
📊 Migration Status [dev]

Available migrations:
  ✅ 001-init-schema.sql

Summary: 1/1 applied
```

### Rollback Last Migration

```bash
npm run db:rollback
```

**Caution:** This executes the `-- DOWN:` section of the migration. Only rollback if you understand the consequences.

### Health Check

```bash
npm run db:check
```

Verifies:
- ✅ Database connectivity
- ✅ Required tables exist
- ✅ All indexes present
- ✅ All triggers active
- ✅ Audit immutability enforced
- ✅ Migration tracker initialized

**Output:**
```
✅ Database connection: OK
✅ Tables: (2 present)
✅ Indexes: (1 present)
✅ Triggers: (1 active)
✅ Audit Immutability: immutable
✅ Migrations: 1 applied

✅ All checks passed (6/6)
```

---

## Schema Overview

### Tables

#### `consents` (Versioned Consent Records)

Stores consent requests with full history and state machine enforcement.

| Column | Type | Notes |
|--------|------|-------|
| `consent_id` | UUID | Primary key, unique per version |
| `user_id` | text | Data principal identifier |
| `purpose` | text | Purpose of consent (e.g., marketing) |
| `data_types` | jsonb | Array of data categories |
| `valid_until` | date | Expiry date (DPDP §6) |
| `status` | text | REQUESTED, ACTIVE, REJECTED, REVOKED, EXPIRED |
| `created_at` | timestamp | When this version created |
| `consent_group_id` | text | Stable ID: `{user_id}:{purpose}` |
| `version` | integer | Monotonic counter per group |
| `approval_token` | text | Temporary approval token (unique, nullable) |
| `approval_expires_at` | timestamp | When token expires |

**Constraints:**
- `PRIMARY KEY (consent_id)`
- `UNIQUE (approval_token)` - Prevents token reuse
- `UNIQUE (user_id, purpose) WHERE status='ACTIVE'` - Only one active per purpose

**Indexes:**
- `uniq_active_consent_per_purpose` - Enforces business rule and optimizes lookups

#### `audit_logs` (Immutable Compliance Log)

Append-only audit trail with hash chain integrity.

| Column | Type | Notes |
|--------|------|-------|
| `audit_id` | UUID | Primary key |
| `event_type` | text | CONSENT_REQUESTED, CONSENT_APPROVED, etc. |
| `consent_id` | text | Reference to consent (may be null) |
| `user_id` | text | Data principal |
| `timestamp` | timestamp | Event time (defaults to NOW()) |
| `details` | jsonb | Event-specific metadata |
| `prev_hash` | text | Previous log's hash (null for first) |
| `hash` | text | SHA-256 hash chain |

**Constraints:**
- `PRIMARY KEY (audit_id)`
- `TRIGGER audit_no_update` - Prevents UPDATE/DELETE (immutability)

**Permissions:**
- `GRANT SELECT, INSERT` - Read and append only
- `REVOKE DELETE, UPDATE` - No modification allowed

### Migration Tracking

Internal table `_schema_migrations` tracks applied migrations:

| Column | Type | Notes |
|--------|------|-------|
| `id` | serial | Auto-incrementing ID |
| `name` | varchar | Migration filename |
| `applied_at` | timestamp | When applied |

---

## Creating New Migrations

### File Naming Convention

```
NNN-description.sql
```

- `NNN` - Zero-padded sequence number (001, 002, 003, ...)
- `description` - Kebab-case description

**Examples:**
- `001-init-schema.sql`
- `002-add-approval-tokens-table.sql`
- `003-add-indexes-for-performance.sql`

### Migration Template

```sql
-- ============================================================================
-- Migration: NNN-description
-- Description: What this migration does
-- Version: 1.0
-- Created: YYYY-MM-DD
-- ============================================================================

-- UP: Apply changes
-- Place your CREATE/ALTER/INSERT statements here

-- DOWN: Rollback changes
-- BEGIN DOWN
-- Place your DROP/REVERT statements here (commented out)
-- END DOWN
```

### Example: Adding a New Table

```sql
-- ============================================================================
-- Migration: 002-add-data-principal-table
-- Description: Add explicit data_principal table for better compliance tracking
-- Version: 1.0
-- Created: 2026-01-31
-- ============================================================================

-- UP: Apply changes

CREATE TABLE IF NOT EXISTS public.data_principals (
    data_principal_id uuid PRIMARY KEY,
    external_ref text NOT NULL,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_data_principals_external_ref 
    ON data_principals(external_ref);

-- DOWN: Rollback changes
-- BEGIN DOWN
-- DROP INDEX IF EXISTS idx_data_principals_external_ref;
-- DROP TABLE IF EXISTS public.data_principals;
-- END DOWN
```

### Best Practices

1. **Idempotent migrations** - Use `CREATE TABLE IF NOT EXISTS`, `DROP IF EXISTS`
2. **Include rollback** - Write the `-- DOWN:` section for every migration
3. **Document changes** - Add comments explaining the `why`
4. **One concern per migration** - Don't mix unrelated changes
5. **Test rollbacks** - Verify `npm run db:rollback` works
6. **Never destructive in prod** - Backups before any DROP
7. **Use transactions** - Wrap in `BEGIN` ... `COMMIT` when possible

---

## Environments

### Development (default)

```bash
npm run db:migrate                    # Applies to dev database
NODE_ENV=dev npm run db:check         # Checks dev database
```

Uses: `PG_HOST`, `PG_PORT`, `PG_USER`, `PG_PASSWORD`, `PG_DATABASE`

### Test

```bash
NODE_ENV=test npm run db:migrate      # Applies to test database
NODE_ENV=test npm run db:init         # Fresh test database
NODE_ENV=test npm run db:check
```

Uses: `PG_HOST_TEST`, `PG_PORT_TEST`, `PG_USER_TEST`, `PG_PASSWORD_TEST`, `PG_DATABASE_TEST`

### Production

```bash
NODE_ENV=production npm run db:migrate
NODE_ENV=production npm run db:check
```

Uses: `PG_HOST`, `PG_PORT`, `PG_USER`, `PG_PASSWORD`, `PG_DATABASE`

⚠️ **Never run `db:init` in production!**

---

## Disaster Recovery

### Backup Before Migration

```bash
pg_dump -h localhost -U postgres consent_manager > backup-$(date +%Y%m%d-%H%M%S).sql
```

### Restore from Backup

```bash
psql -h localhost -U postgres consent_manager < backup-20260131-120000.sql
```

### Manual Rollback

If `npm run db:rollback` fails:

1. Restore from backup
2. Check migration logs in `_schema_migrations`
3. Run only confirmed migrations:
   ```bash
   npm run db:migrate
   ```

---

## Troubleshooting

### "Cannot connect to database"

```bash
# Check .env file
cat .env

# Test connection manually
psql -h localhost -U postgres -d consent_manager
```

### "Migration failed: table already exists"

Migrations are idempotent. Running twice is safe:
```bash
npm run db:migrate
npm run db:migrate    # Will skip already-applied migrations
```

### "Audit logs are immutable" error in tests

This is expected! Audit logs cannot be modified. If you need to clear test data:

```bash
-- Clear audit logs (test only!)
DELETE FROM audit_logs;

-- Clear consents
DELETE FROM consents;
```

### Connection pool exhausted

If you see "Client request timeout":

1. Check for stuck connections:
   ```sql
   SELECT * FROM pg_stat_activity WHERE datname = 'consent_manager';
   ```

2. Terminate idle connections:
   ```sql
   SELECT pg_terminate_backend(pid) 
   FROM pg_stat_activity 
   WHERE datname = 'consent_manager' AND state = 'idle';
   ```

---

## Integration with Application

The application automatically uses migrations. No changes needed to `src/db.ts`.

**On startup:**
```bash
npm run dev       # Application starts with configured database
```

**In tests:**
```bash
NODE_ENV=test npm run db:init    # Fresh test database
NODE_ENV=test npm test           # Run tests
```

---

## Schema Documentation

- **Canonical Reference:** `db/canonical/schema.sql` - Full authoritative schema
- **Snapshots:** `db/snapshots/schema_full_v1.sql` - Read-only historical snapshot
- **Migrations:** `db/migrations/*.sql` - Version-controlled change history

---

## Compliance & Audit Trail

All schema changes are:
- ✅ Version-controlled in migrations
- ✅ Timestamped and traceable
- ✅ Reversible (rollback possible)
- ✅ Documented with comments
- ✅ Tracked in `_schema_migrations` table

This ensures:
- **Reproducibility** - Any dev can initialize their own DB
- **Auditability** - Full change history available
- **Consistency** - All environments have same schema
- **Compliance** - DPDP requirements met by design

---

## References

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [pg (Node.js Driver)](https://node-postgres.com/)
- Database Configuration: `backend/db/config.js`
- Connection Pool: `backend/src/db.ts`
