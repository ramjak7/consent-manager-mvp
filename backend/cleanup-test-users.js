// Cleanup script for duplicate test users
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: parseInt(process.env.PG_PORT || '5432'),
  database: process.env.PG_DATABASE || 'consent_manager',
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || 'postgres',
});

async function cleanup() {
  try {
    const result = await pool.query(
      `DELETE FROM users WHERE email = 'developer@example.com' RETURNING user_id, email`
    );
    console.log(`✅ Deleted ${result.rowCount} test user(s):`);
    result.rows.forEach(row => {
      console.log(`   - User ID: ${row.user_id}, Email: ${row.email}`);
    });
  } catch (error) {
    console.error('❌ Error cleaning up users:', error.message);
  } finally {
    await pool.end();
  }
}

cleanup();
