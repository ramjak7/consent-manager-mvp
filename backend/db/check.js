#!/usr/bin/env node

/**
 * Database Health Check & Validation
 * 
 * Verifies:
 * - Database connectivity
 * - Required schema exists
 * - All tables present
 * - All indexes present
 * - All triggers present
 * - Audit log immutability
 * 
 * Usage:
 *   npm run db:check
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { Pool } = require('pg');

const ENV = process.env.NODE_ENV || 'dev';

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
// CHECKS
// ============================================================================

async function checkConnection(pool) {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Database connection: OK');
    console.log(`   Server time: ${result.rows[0].now}`);
    return true;
  } catch (err) {
    console.error('❌ Database connection: FAILED');
    console.error(`   ${err.message}`);
    return false;
  }
}

async function checkTables(pool) {
  console.log('\n📋 Tables:');
  
  const tables = ['consents', 'audit_logs'];
  let allPresent = true;

  for (const table of tables) {
    try {
      const result = await pool.query(
        `SELECT to_regclass('public.${table}') as exists`
      );
      const exists = result.rows[0].exists !== null;
      
      if (exists) {
        const rowCount = await pool.query(
          `SELECT COUNT(*) as count FROM ${table}`
        );
        console.log(`  ✅ ${table} (${rowCount.rows[0].count} rows)`);
      } else {
        console.log(`  ❌ ${table} (missing)`);
        allPresent = false;
      }
    } catch (err) {
      console.log(`  ❌ ${table} (error: ${err.message})`);
      allPresent = false;
    }
  }

  return allPresent;
}

async function checkIndexes(pool) {
  console.log('\n📑 Indexes:');

  const indexes = [
    'uniq_active_consent_per_purpose',
  ];

  let allPresent = true;

  for (const index of indexes) {
    try {
      const result = await pool.query(
        `SELECT indexname FROM pg_indexes WHERE indexname = $1`,
        [index]
      );
      
      if (result.rows.length > 0) {
        console.log(`  ✅ ${index}`);
      } else {
        console.log(`  ❌ ${index} (missing)`);
        allPresent = false;
      }
    } catch (err) {
      console.log(`  ❌ ${index} (error: ${err.message})`);
      allPresent = false;
    }
  }

  return allPresent;
}

async function checkTriggers(pool) {
  console.log('\n🔔 Triggers:');

  const triggers = [
    { name: 'audit_no_update', table: 'audit_logs' },
  ];

  let allPresent = true;

  for (const trigger of triggers) {
    try {
      const result = await pool.query(
        `SELECT trigger_name FROM information_schema.triggers 
         WHERE trigger_name = $1 AND event_object_table = $2`,
        [trigger.name, trigger.table]
      );
      
      if (result.rows.length > 0) {
        console.log(`  ✅ ${trigger.name} on ${trigger.table}`);
      } else {
        console.log(`  ❌ ${trigger.name} (missing)`);
        allPresent = false;
      }
    } catch (err) {
      console.log(`  ❌ ${trigger.name} (error: ${err.message})`);
      allPresent = false;
    }
  }

  return allPresent;
}

async function checkAuditImmutability(pool) {
  console.log('\n🔒 Audit Immutability:');

  try {
    // Try to update an audit log
    const testId = '00000000-0000-0000-0000-000000000000';
    
    try {
      await pool.query(
        `UPDATE audit_logs SET event_type = 'TEST' WHERE audit_id = $1`,
        [testId]
      );
      console.log('  ❌ Audit logs are mutable (SECURITY ISSUE!)');
      return false;
    } catch (err) {
      if (err.message.includes('immutable') || err.message.includes('Audit logs')) {
        console.log('  ✅ Audit logs are immutable (trigger enforcing)');
        return true;
      } else {
        console.log('  ⚠️  Update failed but not due to immutability trigger');
        console.log(`     ${err.message}`);
        return false;
      }
    }
  } catch (err) {
    console.log(`  ⚠️  Could not verify immutability: ${err.message}`);
    return false;
  }
}

async function checkMigrationStatus(pool) {
  console.log('\n📦 Migrations:');

  try {
    const result = await pool.query(`
      SELECT COUNT(*) as count FROM _schema_migrations
    `);
    const count = result.rows[0].count;
    console.log(`  ✅ Migration tracker exists (${count} applied)`);
    return true;
  } catch (err) {
    console.log(`  ⚠️  Migration tracker not initialized`);
    return false;
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const pool = new Pool(dbConfig);

  console.log(`\n🔍 Database Health Check [${ENV}]\n`);
  console.log(`Host: ${dbConfig.host}:${dbConfig.port}`);
  console.log(`Database: ${dbConfig.database}\n`);
  console.log('─'.repeat(60));

  const checks = [];

  try {
    const connOK = await checkConnection(pool);
    checks.push(connOK);

    if (connOK) {
      const tablesOK = await checkTables(pool);
      checks.push(tablesOK);

      const indexesOK = await checkIndexes(pool);
      checks.push(indexesOK);

      const triggersOK = await checkTriggers(pool);
      checks.push(triggersOK);

      const auditOK = await checkAuditImmutability(pool);
      checks.push(auditOK);

      const migrationsOK = await checkMigrationStatus(pool);
      checks.push(migrationsOK);
    }

    console.log('\n' + '─'.repeat(60));

    const passed = checks.filter(c => c === true).length;
    const total = checks.length;

    if (checks.every(c => c)) {
      console.log(`\n✅ All checks passed (${passed}/${total})\n`);
      process.exit(0);
    } else {
      console.log(`\n⚠️  Some checks failed (${passed}/${total})\n`);
      process.exit(1);
    }
  } catch (err) {
    console.error('\n❌ Fatal error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
