# Database Snapshots Reference

**Purpose:** Archive and compare database schema versions  
**Status:** Read-only reference only  
**Location:** `db/snapshots/`

---

## Snapshot Files

### `schema_full_v1.sql`

**Generated:** 2026-01-31  
**From:** Live PostgreSQL 18.1 database using `pg_dump`  
**Purpose:** Authoritative schema reference snapshot

**What It Contains:**
- PostgreSQL version info
- Extensions (pgcrypto)
- Functions (prevent_audit_mutation)
- Tables (consents, audit_logs)
- Constraints (PRIMARY KEY, UNIQUE)
- Indexes (uniq_active_consent_per_purpose)
- Triggers (audit_no_update)
- Permissions (GRANT/REVOKE)

**How It Was Created:**
```bash
pg_dump -h localhost -U postgres --schema-only consent_manager > schema_full_v1.sql
```

---

## Using Snapshots

### Comparing Schemas

```bash
# Compare current database with snapshot
pg_dump -h localhost -U postgres --schema-only consent_manager > current_schema.sql
diff current_schema.sql snapshots/schema_full_v1.sql
```

### Recreating from Snapshot

⚠️ **Caution:** This will **DROP AND RECREATE** the entire schema

```bash
# Backup first!
pg_dump -h localhost -U postgres consent_manager > backup.sql

# Recreate from snapshot
psql -h localhost -U postgres consent_manager < snapshots/schema_full_v1.sql
```

### Restoring to a Point in Time

If you need to restore the database to match this snapshot:

```bash
# 1. Stop application
npm run dev  # Ctrl+C

# 2. Create backup of current state
pg_dump -U postgres consent_manager > backup_current.sql

# 3. Clear database
psql -U postgres -d consent_manager -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# 4. Restore from snapshot
psql -U postgres -d consent_manager < db/snapshots/schema_full_v1.sql

# 5. Restart application
npm run dev
```

---

## Snapshot Contents Summary

### Extensions
```
pgcrypto - For UUID and cryptographic functions
```

### Functions
```
prevent_audit_mutation() - Trigger function that prevents audit log modification
```

### Tables

**consents**
- Versioned consent records
- 9 columns (consent_id, user_id, purpose, data_types, valid_until, status, etc.)
- 2 constraints (PK, UNIQUE approval_token)

**audit_logs**
- Immutable append-only compliance log
- 8 columns (audit_id, event_type, consent_id, user_id, timestamp, details, prev_hash, hash)
- 1 constraint (PK)

### Indexes
```
uniq_active_consent_per_purpose - Enforces single ACTIVE per user+purpose
```

### Triggers
```
audit_no_update - Prevents UPDATE/DELETE on audit_logs
```

### Permissions
```
GRANT SELECT, INSERT, REFERENCES, TRIGGER, TRUNCATE, MAINTAIN ON audit_logs
REVOKE DELETE, UPDATE
```

---

## Schema Versioning

| Version | Date | Description | Location |
|---------|------|-------------|----------|
| 1.0 | 2026-01-31 | Initial schema with consents & audit_logs | schema_full_v1.sql |

---

## Migration System Reference

**Snapshots** are different from **Migrations**:

| Aspect | Snapshot | Migration |
|--------|----------|-----------|
| **Purpose** | Archive current state | Record incremental changes |
| **Modifiable** | ❌ No (read-only) | ❌ No (version-controlled) |
| **Usage** | Point-in-time reference | Version control & reproducibility |
| **Tracking** | Manual versioning | Automatic (_schema_migrations table) |
| **Rollback** | Manual restore | Automatic rollback script |

---

## Best Practices

1. **Treat as read-only** - Never modify snapshot files
2. **Version by date** - Use format: `schema_full_vX.sql`
3. **Document changes** - Note date and reason when creating new snapshot
4. **Keep with migrations** - Store alongside migration files
5. **Archive old versions** - Keep previous snapshots for reference
6. **Use for audits** - Compare snapshots to verify schema hasn't drifted

---

## When to Create a New Snapshot

- After major migrations applied in production
- For compliance/audit documentation
- When onboarding new environments
- For disaster recovery planning

**Create snapshot:**
```bash
pg_dump -h localhost -U postgres --schema-only consent_manager > db/snapshots/schema_full_v2.sql
# Update this file with new date and version
```

---

## Troubleshooting

### "Snapshot file is outdated"

Snapshots are **read-only references**. They don't update automatically.

To get the current schema:
```bash
npm run db:status      # See migrations applied
npm run db:check       # Verify current state
```

### "Restoring from snapshot broke my data"

Snapshots only contain schema (table structure), **not data**. 

To restore data:
```bash
# Use data backup instead
psql -U postgres consent_manager < backup_with_data.sql
```

### "I need to see schema from a specific date"

Find the corresponding snapshot in `db/snapshots/` directory. If not available:
1. Check git history: `git log --oneline db/snapshots/`
2. Restore from backup of that time
3. Generate new snapshot: `pg_dump ... > schema_full_vX.sql`

---

## Related Files

- **Migrations:** `db/migrations/*.sql` - Version-controlled schema changes
- **Canonical Schema:** `db/canonical/schema.sql` - Authoritative schema documentation
- **Database Guide:** `db/README.md` - Full database management documentation
- **Operations Guide:** `db/OPERATIONS.md` - Production deployment & maintenance

---

## Contact

For snapshot-related questions or disaster recovery needs, see:
- `db/README.md` - Disaster Recovery section
- `db/OPERATIONS.md` - Disaster Recovery section
