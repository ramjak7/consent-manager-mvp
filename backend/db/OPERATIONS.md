# Database Operations Guide

**Target Audience:** DevOps, DBAs, and Developers  
**Last Updated:** January 31, 2026

---

## Architecture Overview

The Consent Manager MVP uses a **migration-based database management system**:

```
┌─────────────────────────────────────────┐
│   Application (src/db.ts)               │
│   Uses: pg Pool connection              │
└────────────────┬────────────────────────┘
                 │
    ┌────────────┴────────────┐
    │                         │
┌───▼─────────────────┐  ┌──▼──────────────────────┐
│  Production DB      │  │  Dev/Test Migration     │
│  (Live data)        │  │  System (db/migrate.js) │
│                     │  │  Tracks: _schema_migrations
└─────────────────────┘  └──────────────────────────┘
```

---

## Core Concepts

### Migrations

SQL files defining schema changes, tracked in `_schema_migrations` table.

```
Sequence: 001 → 002 → 003
Status:   ✅   ✅   ⏳ (pending)
```

### Idempotency

All migrations use `IF NOT EXISTS` / `IF EXISTS`:

```sql
-- Safe to re-run
CREATE TABLE IF NOT EXISTS consents (...);
DROP INDEX IF EXISTS idx_name;
```

### Reversibility

Every migration has `-- DOWN:` section for rollback:

```
001-init-schema.sql
├─ UP:   Create schema
└─ DOWN: Drop schema
```

---

## Production Deployment Checklist

### Pre-Deployment

- [ ] Create database backup
- [ ] Test migrations in staging environment
- [ ] Verify `npm run db:check` passes
- [ ] Review all changes in migration file
- [ ] Have rollback plan documented

### Deployment

```bash
# 1. Verify current state
npm run db:status

# 2. Apply pending migrations
NODE_ENV=production npm run db:migrate

# 3. Verify post-migration state
NODE_ENV=production npm run db:check

# 4. Monitor application logs
tail -f logs/app.log
```

### Post-Deployment

- [ ] Verify application connects to database
- [ ] Run smoke tests
- [ ] Monitor database query performance
- [ ] Check audit logs for anomalies

---

## Maintenance Tasks

### Regular Health Checks

```bash
# Daily
npm run db:check

# Weekly
psql -U postgres -d consent_manager -c "\d"
psql -U postgres -d consent_manager -c "SELECT COUNT(*) FROM audit_logs;"
```

### Backup Strategy

```bash
# Daily backup
pg_dump -h localhost -U postgres consent_manager > \
  /backups/consent_manager_$(date +%Y%m%d_%H%M%S).sql

# Compress old backups
gzip /backups/consent_manager_*.sql
```

### Monitoring Queries

```sql
-- Active connections
SELECT count(*) FROM pg_stat_activity WHERE datname = 'consent_manager';

-- Largest tables
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) 
FROM pg_tables ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes WHERE schemaname != 'pg_catalog'
ORDER BY idx_scan DESC;

-- Recent audit entries
SELECT COUNT(*) FROM audit_logs WHERE timestamp > NOW() - INTERVAL '1 hour';
```

---

## Disaster Recovery

### Scenario 1: Failed Migration

**Problem:** Migration partially applied, database inconsistent

**Recovery:**
```bash
# 1. Stop application
systemctl stop cmp-backend

# 2. Restore from backup
psql -U postgres < backup-20260131_120000.sql

# 3. Verify state
npm run db:check

# 4. Restart application
systemctl start cmp-backend
```

### Scenario 2: Connection Exhaustion

**Problem:** Too many idle connections, new connections rejected

**Quick Fix:**
```sql
-- Terminate idle connections
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE datname = 'consent_manager' AND state = 'idle'
AND query_start < NOW() - INTERVAL '5 minutes';
```

**Permanent Fix:**
- Increase `max_connections` in `postgresql.conf`
- Implement connection pooling (PgBouncer)
- Review application connection logic

### Scenario 3: Audit Log Integrity Breach

**Problem:** Someone modified audit logs (should be impossible!)

**Investigation:**
```sql
-- Check for trigger bypasses
SELECT * FROM information_schema.triggers 
WHERE event_object_table = 'audit_logs';

-- Check for disabled triggers
SELECT * FROM pg_trigger WHERE tgrelid = 'audit_logs'::regclass;

-- Verify hash chain (sample)
SELECT audit_id, event_type, hash FROM audit_logs ORDER BY timestamp DESC LIMIT 10;
```

**Remediation:**
```sql
-- Rebuild audit table from backups if necessary
-- Contact compliance officer if modifications found
```

---

## Performance Tuning

### Index Analysis

```bash
# Check if indexes are being used
NODE_ENV=dev npm run db:check

# Analyze query plans
EXPLAIN ANALYZE SELECT * FROM consents WHERE user_id = 'user-123' AND status = 'ACTIVE';
```

### Connection Pooling

Current configuration in `src/db.ts`:
```typescript
const pool = new Pool({
  max: 20,           // Max connections
  idle: 10000,       // Timeout for idle connections
  connectionTimeout: 1000,
});
```

**Tuning Tips:**
- Increase `max` for high concurrency (load test first)
- Decrease `idle` timeout to release connections faster
- Monitor with: `SELECT count(*) FROM pg_stat_activity;`

### Query Optimization

```sql
-- Create missing indexes based on query patterns
CREATE INDEX idx_consents_status_valid_until 
  ON consents(status, valid_until) 
  WHERE status != 'EXPIRED';

-- Analyze query plans
EXPLAIN ANALYZE 
  SELECT * FROM consents 
  WHERE user_id = $1 AND purpose = $2 AND status = 'ACTIVE';
```

---

## Schema Evolution

### Adding a New Column

```sql
-- Migration: 004-add-legal-basis-column.sql
ALTER TABLE consents ADD COLUMN legal_basis text DEFAULT 'consent' NOT NULL;

-- DOWN
-- ALTER TABLE consents DROP COLUMN legal_basis;
```

### Renaming a Column

```sql
-- Migration: 005-rename-purposes-to-purpose-codes.sql
ALTER TABLE consents RENAME COLUMN purposes TO purpose_codes;

-- DOWN
-- ALTER TABLE consents RENAME COLUMN purpose_codes TO purposes;
```

### Creating a New Table

```sql
-- Migration: 006-add-consent-templates-table.sql
CREATE TABLE consent_templates (
  template_id uuid PRIMARY KEY,
  name text NOT NULL,
  content text NOT NULL,
  created_at timestamp DEFAULT NOW()
);

-- DOWN
-- DROP TABLE IF EXISTS consent_templates;
```

---

## Environment-Specific Setup

### Development

```bash
NODE_ENV=dev npm run db:init    # Fresh local DB
NODE_ENV=dev npm run dev        # Run app
```

### Staging

```bash
# Deploy to staging database
NODE_ENV=staging npm run db:migrate
npm run db:check
```

### Production

```bash
# Careful! Pre-deployment
NODE_ENV=production npm run db:status

# Deploy
NODE_ENV=production npm run db:migrate

# Post-deployment validation
NODE_ENV=production npm run db:check
```

---

## Compliance & Audit Trail

**Schema management supports DPDP compliance:**

- ✅ All changes version-controlled in `_schema_migrations`
- ✅ Immutable audit logs enforced by trigger
- ✅ Hash chain prevents tampering
- ✅ Full change history available
- ✅ Rollback capability for emergency recovery

**Audit Trail Query:**
```sql
-- Show all migrations applied
SELECT * FROM _schema_migrations ORDER BY applied_at;

-- Show all consent state changes
SELECT user_id, purpose, status, COUNT(*) FROM consents GROUP BY user_id, purpose, status;

-- Show recent audit activity
SELECT event_type, COUNT(*) as count 
FROM audit_logs 
WHERE timestamp > NOW() - INTERVAL '24 hours' 
GROUP BY event_type;
```

---

## References

- Migration System: `db/migrate.js`
- Configuration: `db/config.js`
- Health Check: `db/check.js`
- Schema: `db/canonical/schema.sql`
- Database Guide: `db/README.md`
- PostgreSQL Docs: https://www.postgresql.org/docs/
