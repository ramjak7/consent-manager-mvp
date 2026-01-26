import { Pool } from "pg";

const poolConfig: any = {
  host: process.env.PG_HOST || "localhost",
  port: Number(process.env.PG_PORT || 5432),
  user: process.env.PG_USER || "postgres",
  database: process.env.PG_DATABASE || "consent_manager",
};

// Only set password if provided
if (process.env.PG_PASSWORD) {
  poolConfig.password = process.env.PG_PASSWORD;
}

export const pool = new Pool(poolConfig);