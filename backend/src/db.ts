import { Pool, PoolConfig } from "pg";
import * as fs from "fs";

// Support both DATABASE_URL (Railway/cloud) and individual PG_* vars (local dev)
let poolConfig: PoolConfig;

if (process.env.DATABASE_URL) {
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' 
      ? { rejectUnauthorized: false } 
      : undefined,
  };
  console.log("✅ Using DATABASE_URL for PostgreSQL connection");
} else {
  poolConfig = {
    host: process.env.PG_HOST || "localhost",
    port: Number(process.env.PG_PORT || 5432),
    user: process.env.PG_USER || "postgres",
    database: process.env.PG_DATABASE || "consent_manager",
  };

  // Only set password if provided
  if (process.env.PG_PASSWORD) {
    poolConfig.password = process.env.PG_PASSWORD;
  }

  // SSL/TLS Configuration (Production)
  if (process.env.PG_SSL === "true") {
    poolConfig.ssl = {
      rejectUnauthorized: process.env.PG_SSL_REJECT_UNAUTHORIZED !== "false",
    };
    if (process.env.PG_SSL_CA) {
      poolConfig.ssl.ca = fs.readFileSync(process.env.PG_SSL_CA).toString();
    }
    if (process.env.PG_SSL_CERT) {
      poolConfig.ssl.cert = fs.readFileSync(process.env.PG_SSL_CERT).toString();
    }
    if (process.env.PG_SSL_KEY) {
      poolConfig.ssl.key = fs.readFileSync(process.env.PG_SSL_KEY).toString();
    }
    console.log("✅ PostgreSQL SSL/TLS enabled");
  }

  console.log(`✅ Using individual PG_* vars (host: ${poolConfig.host})`);
}

// Encryption key configuration (for pgcrypto)
// Set this as a session parameter for column-level encryption
const encryptionKey = process.env.ENCRYPTION_KEY;

export const pool = new Pool(poolConfig);

// Set encryption key as session parameter for all connections
if (encryptionKey) {
  pool.on("connect", async (client) => {
    try {
      // Note: PostgreSQL SET command doesn't support parameterized queries
      // Using string concatenation with quotes to prevent SQL injection
      await client.query(`SET app.encryption_key = '${encryptionKey.replace(/'/g, "''")}'`);
    } catch (err) {
      console.error("❌ Failed to set encryption key:", err);
    }
  });
  console.log("✅ Column-level encryption enabled");
}