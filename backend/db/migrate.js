#!/usr/bin/env node

/**
 * Database Migration Runner
 * 
 * Provides a simple migration management system for PostgreSQL.
 * Tracks applied migrations in a _schema_migrations table.
 * 
 * Usage:
 *   npm run db:migrate        # Apply all pending migrations
 *   npm run db:status         # Show migration status
 *   npm run db:init           # Initialize fresh database
 * 
 * Environment:
 *   - Reads .env from parent directory (backend/)
 *   - Supports NODE_ENV: dev (default), test, production
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const fs = require('fs');
const { Pool } = require('pg');

// ============================================================================
// CONFIGURATION
// ============================================================================

const ENV = process.env.NODE_ENV || 'dev';
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

const config = {
  dev: {
    host: process.env.PG_HOST || 'localhost',
    port: Number(process.env.PG_PORT || 5432),
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || '',
    database: process.env.PG_DATABASE || 'consent_manager',
  },
  test: {
    host: process.env.PG_HOST_TEST || 'localhost',
    port: Number(process.env.PG_PORT_TEST || 5432),
    user: process.env.PG_USER_TEST || 'postgres',
    password: process.env.PG_PASSWORD_TEST || '',
    database: process.env.PG_DATABASE_TEST || 'consent_manager_test',
  },
  production: {
    host: process.env.PG_HOST,
    port: Number(process.env.PG_PORT || 5432),
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    database: process.env.PG_DATABASE,
  },
};

const dbConfig = config[ENV];

// ============================================================================
// MIGRATION TRACKER
// ============================================================================

async function ensureMigrationsTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _schema_migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function getAppliedMigrations(pool) {
  const result = await pool.query(
    'SELECT name FROM _schema_migrations ORDER BY applied_at ASC'
  );
  return result.rows.map(row => row.name);
}

async function recordMigration(pool, name) {
  await pool.query(
    'INSERT INTO _schema_migrations (name) VALUES ($1)',
    [name]
  );
}

// ============================================================================
// MIGRATION LOADER
// ============================================================================

function getMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.warn('⚠️  Migrations directory does not exist:', MIGRATIONS_DIR);
    return [];
  }

  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();
}

function getMigrationContent(filename) {
  const filepath = path.join(MIGRATIONS_DIR, filename);
  const content = fs.readFileSync(filepath, 'utf8');
  return content;
}

// ============================================================================
// COMMANDS
// ============================================================================

async function migrate(pool) {
  console.log(`\n📦 Running migrations in [${ENV}] environment...\n`);

  await ensureMigrationsTable(pool);
  const applied = await getAppliedMigrations(pool);
  const available = getMigrationFiles();

  const pending = available.filter(m => !applied.includes(m));

  if (pending.length === 0) {
    console.log('✅ All migrations are up to date!\n');
    return;
  }

  console.log(`📋 Found ${pending.length} pending migration(s):\n`);

  for (const migrationFile of pending) {
    try {
      console.log(`  ⏳ Applying ${migrationFile}...`);
      
      const content = getMigrationContent(migrationFile);
      const [upSection] = content.split('-- DOWN:');
      
      await pool.query(upSection);
      await recordMigration(pool, migrationFile);
      
      console.log(`  ✅ Applied ${migrationFile}\n`);
    } catch (err) {
      console.error(`  ❌ FAILED: ${migrationFile}`);
      console.error(`     Error: ${err.message}\n`);
      throw err;
    }
  }

  console.log(`✅ All migrations applied successfully!\n`);
}

async function status(pool) {
  console.log(`\n📊 Migration Status [${ENV}]\n`);

  await ensureMigrationsTable(pool);
  const applied = await getAppliedMigrations(pool);
  const available = getMigrationFiles();

  console.log('Available migrations:');
  for (const file of available) {
    const isApplied = applied.includes(file);
    const icon = isApplied ? '✅' : '⏳';
    console.log(`  ${icon} ${file}`);
  }

  console.log(`\nSummary: ${applied.length}/${available.length} applied\n`);
}

async function rollback(pool) {
  console.log(`\n⚠️  Rolling back last migration [${ENV}]...\n`);

  await ensureMigrationsTable(pool);
  const applied = await getAppliedMigrations(pool);

  if (applied.length === 0) {
    console.log('ℹ️  No migrations to rollback.\n');
    return;
  }

  const lastMigration = applied[applied.length - 1];
  console.log(`Rolling back: ${lastMigration}`);

  try {
    const content = getMigrationContent(lastMigration);
    const [, downSection] = content.split('-- DOWN:');

    if (!downSection || downSection.trim().length === 0) {
      console.warn('⚠️  No rollback instructions defined in migration.\n');
      return;
    }

    // Clean up commented SQL
    const downSQL = downSection
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && line.trim())
      .join('\n');

    await pool.query(downSQL);
    await pool.query('DELETE FROM _schema_migrations WHERE name = $1', [lastMigration]);

    console.log(`✅ Rolled back ${lastMigration}\n`);
  } catch (err) {
    console.error(`❌ Rollback failed: ${err.message}\n`);
    throw err;
  }
}

async function init(pool) {
  console.log(`\n🔄 Initializing fresh database [${ENV}]...\n`);

  // Drop schema (caution!)
  console.log('⚠️  Dropping public schema...');
  try {
    await pool.query('DROP SCHEMA IF EXISTS public CASCADE');
  } catch (err) {
    console.warn('⚠️  Could not drop schema:', err.message);
  }

  console.log('✅ Creating public schema...');
  await pool.query('CREATE SCHEMA public');

  // Reset migrations table
  await pool.query('DROP TABLE IF EXISTS _schema_migrations');

  // Apply all migrations
  await migrate(pool);
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const command = process.argv[2] || 'migrate';
  
  const pool = new Pool(dbConfig);

  try {
    switch (command) {
      case 'migrate':
        await migrate(pool);
        break;
      case 'status':
        await status(pool);
        break;
      case 'rollback':
        await rollback(pool);
        break;
      case 'init':
        await init(pool);
        break;
      default:
        console.log(`\nUnknown command: ${command}`);
        console.log('\nUsage:');
        console.log('  node migrate.js migrate    # Apply pending migrations');
        console.log('  node migrate.js status     # Show migration status');
        console.log('  node migrate.js rollback   # Rollback last migration');
        console.log('  node migrate.js init       # Initialize fresh database\n');
        process.exit(1);
    }
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
