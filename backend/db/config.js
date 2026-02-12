/**
 * Database Migration Configuration
 * Used by db-migrate and other DB management tools
 * 
 * Environment variables are read from .env at runtime
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Support DATABASE_URL (Railway/cloud) or individual PG_* vars (local dev)
if (process.env.DATABASE_URL) {
  module.exports = {
    dev: {
      driver: 'pg',
      connectionString: process.env.DATABASE_URL,
      schema: 'public',
      migrations: './migrations',
    },
    production: {
      driver: 'pg',
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      schema: 'public',
      migrations: './migrations',
    },
    test: {
      driver: 'pg',
      connectionString: process.env.DATABASE_URL,
      schema: 'public',
      migrations: './migrations',
    },
  };
} else {
  module.exports = {
    dev: {
      driver: 'pg',
      host: process.env.PG_HOST || 'localhost',
      port: Number(process.env.PG_PORT || 5432),
      user: process.env.PG_USER || 'postgres',
      password: process.env.PG_PASSWORD || '',
      database: process.env.PG_DATABASE || 'consent_manager',
      schema: 'public',
      migrations: './migrations',
    },
    test: {
      driver: 'pg',
      host: process.env.PG_HOST_TEST || 'localhost',
      port: Number(process.env.PG_PORT_TEST || 5432),
      user: process.env.PG_USER_TEST || 'postgres',
      password: process.env.PG_PASSWORD_TEST || '',
      database: process.env.PG_DATABASE_TEST || 'consent_manager_test',
      schema: 'public',
      migrations: './migrations',
    },
    production: {
      driver: 'pg',
      host: process.env.PG_HOST,
      port: Number(process.env.PG_PORT || 5432),
      user: process.env.PG_USER,
      password: process.env.PG_PASSWORD,
      database: process.env.PG_DATABASE,
      schema: 'public',
      migrations: './migrations',
    },
  };
}
