# Database Setup Quick Start

**Time Required:** 5 minutes

## For Developers

### 1. Create `.env` file

```bash
cd backend
cp .env.example .env
```

Edit `.env` with your local PostgreSQL credentials:

```
PG_HOST=localhost
PG_PORT=5432
PG_USER=postgres
PG_PASSWORD=your_password_here
PG_DATABASE=consent_manager
```

### 2. Initialize Database

```bash
npm run db:init
```

Output:
```
📦 Running migrations in [dev] environment...
  ⏳ Applying 001-init-schema.sql...
  ✅ Applied 001-init-schema.sql
✅ All migrations applied successfully!
```

### 3. Verify Setup

```bash
npm run db:check
```

Output:
```
✅ Database connection: OK
✅ Tables: consents, audit_logs (2 present)
✅ Indexes: uniq_active_consent_per_purpose (1 present)
✅ Triggers: audit_no_update on audit_logs (1 active)
✅ Audit Immutability: immutable
✅ Migrations: 1 applied

✅ All checks passed (6/6)
```

### 4. Start Development Server

```bash
npm run dev
```

---

## Common Commands

```bash
# Apply pending migrations
npm run db:migrate

# Check what needs to be applied
npm run db:status

# Rollback last migration
npm run db:rollback

# Run full health check
npm run db:check

# Initialize fresh database (dev only!)
npm run db:init
```

---

## Test Environment

```bash
# Set up test database
NODE_ENV=test npm run db:init

# Run tests
NODE_ENV=test npm test
```

---

## Next Steps

- Read full docs: `db/README.md`
- View schema: `db/canonical/schema.sql`
- Check migrations: `db/migrations/`
- Run application: `npm run dev`

---

## Troubleshooting

**"Cannot connect to database"**
- Check PostgreSQL is running: `psql -U postgres`
- Verify `.env` credentials
- Check firewall allows localhost:5432

**"Tables don't exist"**
- Run: `npm run db:migrate`
- Verify with: `npm run db:check`

**"Migration failed"**
- Check database logs
- See `db/README.md` troubleshooting section

---

For detailed documentation, see [`db/README.md`](README.md)
