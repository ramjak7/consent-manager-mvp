import "dotenv/config";
console.log("Running build:", process.env.NODE_ENV || "dev");
import "./db";
import { pool } from "./db";
import cron from "node-cron";
import { recordAudit } from "./repositories/auditRepo";
import { v7 as uuidv7 } from "uuid";
import express from "express";
import consentRoutes from "./routes/consentRoutes";
import auditRoutes from "./routes/auditRoutes";
import erasureRoutes from "./routes/erasureRoutes";
import correctionRoutes from "./routes/correctionRoutes";
import purposeRoutes from "./routes/purposeRoutes";
import processorRoutes from "./routes/processorRoutes";
import webhookRoutes from "./routes/webhookRoutes";
import userRoutes from "./routes/userRoutes";
import authRoutes from "./routes/authRoutes";
import { processWebhookDeliveries } from "./services/webhookService";
import { logger, requestLogger } from "./utils/logger";
import { metricsMiddleware, register as metricsRegister, updateActiveConsentsGauge } from "./middleware/metrics";
import { generalLimiter } from "./middleware/rateLimiter";
import { expireDueConsents } from "./jobs/expireConsentsJob";
import { archiveRetentionExpiredConsents, purgeOldArchivedConsents } from "./jobs/retentionArchivalJob";
import cookieParser from "cookie-parser";
import cors from "cors";

const app = express();
app.set('trust proxy', 1);
const PORT = parseInt(process.env.PORT || '3000', 10);
const REQUEST_TIMEOUT_MS = 30000;

// CORS configuration - allow frontend domain
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true, // Important: allow cookies
  })
);

// Cookie parser - for httpOnly cookies
app.use(cookieParser());

// Limit request body size to 1MB
app.use(express.json({ limit: '1mb' }));

// Structured logging middleware
app.use(requestLogger);

// Metrics collection middleware
app.use(metricsMiddleware);

// Request timeout enforcement (30 seconds)
app.use((req: any, res: any, next: any) => {
  req.setTimeout(REQUEST_TIMEOUT_MS);
  res.setTimeout(REQUEST_TIMEOUT_MS);
  next();
});

// Content-Type validation for POST/PUT/PATCH (only if body is present)
app.use((req: any, res: any, next: any) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentLength = req.get('content-length');
    const hasBody = contentLength && parseInt(contentLength) > 0;
    
    if (hasBody && !req.is('application/json')) {
      return res.status(415).json({ error: 'Content-Type must be application/json' });
    }
  }
  next();
});

// Apply general rate limiting to all routes
app.use(generalLimiter);

// API v1 — all business endpoints under /api/v1
app.use('/api/v1', consentRoutes);
app.use('/api/v1', auditRoutes);
app.use('/api/v1', erasureRoutes);
app.use('/api/v1', correctionRoutes);
app.use('/api/v1', purposeRoutes);
app.use('/api/v1', processorRoutes);
app.use('/api/v1/webhooks', webhookRoutes);
app.use('/api/v1', userRoutes);

// Auth routes — unversioned (OAuth2 redirect URLs shouldn't change)
app.use('/auth', authRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "UP" });
});

/**
 * Prometheus metrics endpoint
 * Exposes metrics for scraping by Prometheus
 */
app.get("/metrics", async (req, res) => {
  try {
    res.set('Content-Type', metricsRegister.contentType);
    const metrics = await metricsRegister.metrics();
    res.send(metrics);
  } catch (error) {
    logger.error('Failed to generate metrics', { error });
    res.status(500).send('Failed to generate metrics');
  }
});

// All route handlers extracted to routes/ modules (Phase 1 refactor)

app.listen(PORT, '0.0.0.0', () => {
  logger.info('Consent Manager backend running', { 
    port: PORT,
    environment: process.env.NODE_ENV || 'dev',
    metricsEnabled: true,
  });
  console.log(`Consent Manager backend running on port ${PORT}`);
});

/**
 * 🔁 Consent lifecycle enforcement cron
 * Runs every 10 minutes
 * Safe, idempotent, DPDP-compliant
 */
cron.schedule("*/10 * * * *", async () => {
  try {
    // 1️⃣ Expire ACTIVE consents past validity (records audits)
    await expireDueConsents();

    // 2️⃣ Reject stale REQUESTED consents and record audits
    const rejected = await pool.query(`
      UPDATE consents
      SET status = 'REJECTED',
          approval_token = NULL,
          approval_expires_at = NULL
      WHERE status = 'REQUESTED'
        AND valid_until < NOW()
      RETURNING *
    `);

    for (const row of rejected.rows) {
      await recordAudit({
        auditId: uuidv7(),
        eventType: "CONSENT_REJECTED",
        consentId: row.consent_id,
        userId: row.user_id,
        timestamp: new Date().toISOString(),
        details: {
          version: row.version,
          validUntil: row.valid_until,
          rejectedVia: "SCHEDULED_JOB",
        },
      });
    }

    if (rejected.rowCount) {
      console.log(
        `[CRON] Rejected ${rejected.rowCount} consents`
      );
    }
  } catch (err) {
    console.error("[CRON] Consent lifecycle job failed", err);
  }
});

/**
 * Webhook delivery processor
 * Runs every 2 minutes to process pending webhook deliveries with retry logic
 */
cron.schedule("*/2 * * * *", async () => {
  try {
    await processWebhookDeliveries();
  } catch (err) {
    logger.error('[CRON] Webhook delivery job failed', { error: err });
  }
});

/**
 * Metrics update job
 * Updates Prometheus gauges every 5 minutes
 */
cron.schedule("*/5 * * * *", async () => {
  try {
    await updateActiveConsentsGauge(pool);
  } catch (err) {
    logger.error('[CRON] Metrics update job failed', { error: err });
  }
});

/**
 * Retention archival job — DPDP §8(7)
 * Runs daily at 2:00 AM: archives consents past retention_until
 */
cron.schedule("0 2 * * *", async () => {
  try {
    const count = await archiveRetentionExpiredConsents();
    if (count > 0) {
      logger.info(`[CRON] Archived ${count} retention-expired consents`);
    }
  } catch (err) {
    logger.error('[CRON] Retention archival job failed', { error: err });
  }
});

/**
 * Retention purge job
 * Runs monthly (1st at 3:00 AM): hard-deletes archived records 1 year past retention
 */
cron.schedule("0 3 1 * *", async () => {
  try {
    const count = await purgeOldArchivedConsents();
    if (count > 0) {
      logger.info(`[CRON] Purged ${count} old archived consents`);
    }
  } catch (err) {
    logger.error('[CRON] Retention purge job failed', { error: err });
  }
});

// Global error handler (catches unexpected errors)
app.use((err: any, req: any, res: any, next: any) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});