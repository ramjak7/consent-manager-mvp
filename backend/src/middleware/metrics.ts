/**
 * Prometheus Metrics Middleware
 * Purpose: Collect application metrics for monitoring and alerting
 * Reference: COMPREHENSIVE_AUDIT_REPORT.md Section P0-9
 */

import { Request, Response, NextFunction } from 'express';
import promClient from 'prom-client';

// Create a Registry to register the metrics
export const register = new promClient.Registry();

// Add default metrics (CPU, memory, event loop lag, etc.)
promClient.collectDefaultMetrics({ register });

/**
 * HTTP Request Duration Histogram
 * Tracks response time by method, route, and status code
 */
export const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5], // 10ms to 5s
  registers: [register],
});

/**
 * HTTP Request Counter
 * Total number of HTTP requests by method, route, and status
 */
export const httpRequestCounter = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

/**
 * Consent Operations Counter
 * Track consent lifecycle events
 */
export const consentOperations = new promClient.Counter({
  name: 'consent_operations_total',
  help: 'Total number of consent operations',
  labelNames: ['operation', 'status'],
  registers: [register],
});

/**
 * Active Consents Gauge
 * Current number of active consents (updated periodically)
 */
export const activeConsentsGauge = new promClient.Gauge({
  name: 'active_consents_total',
  help: 'Current number of active consents',
  registers: [register],
});

/**
 * Webhook Delivery Counter
 * Track webhook delivery attempts and outcomes
 */
export const webhookDeliveries = new promClient.Counter({
  name: 'webhook_deliveries_total',
  help: 'Total number of webhook delivery attempts',
  labelNames: ['webhook_id', 'event_type', 'status'],
  registers: [register],
});

/**
 * Audit Log Counter
 * Track audit log events by type
 */
export const auditLogCounter = new promClient.Counter({
  name: 'audit_log_events_total',
  help: 'Total number of audit log events',
  labelNames: ['event_type'],
  registers: [register],
});

/**
 * Rate Limit Hits Counter
 * Track when rate limits are triggered
 */
export const rateLimitHits = new promClient.Counter({
  name: 'rate_limit_hits_total',
  help: 'Total number of rate limit violations',
  labelNames: ['endpoint', 'ip'],
  registers: [register],
});

/**
 * Express middleware to track HTTP metrics
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  
  // Extract route pattern (e.g., /consents/:id instead of /consents/123)
  const route = req.route?.path || req.path;
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000; // Convert to seconds
    
    // Record request duration
    httpRequestDuration.labels(req.method, route, res.statusCode.toString()).observe(duration);
    
    // Increment request counter
    httpRequestCounter.labels(req.method, route, res.statusCode.toString()).inc();
  });
  
  next();
}

/**
 * Track consent operation metrics
 */
export function trackConsentOperation(operation: string, status: 'success' | 'failure') {
  consentOperations.labels(operation, status).inc();
}

/**
 * Track webhook delivery metrics
 */
export function trackWebhookDelivery(webhookId: string, eventType: string, status: string) {
  webhookDeliveries.labels(webhookId, eventType, status).inc();
}

/**
 * Track audit log event
 */
export function trackAuditEvent(eventType: string) {
  auditLogCounter.labels(eventType).inc();
}

/**
 * Track rate limit hit
 */
export function trackRateLimitHit(endpoint: string, ip: string) {
  rateLimitHits.labels(endpoint, ip).inc();
}

/**
 * Update active consents gauge (called periodically)
 */
export async function updateActiveConsentsGauge(pool: any) {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM consents WHERE status = 'ACTIVE' AND valid_until > NOW()`
    );
    
    const count = parseInt(result.rows[0]?.count || '0', 10);
    activeConsentsGauge.set(count);
  } catch (error) {
    console.error('Failed to update active consents gauge:', error);
  }
}
