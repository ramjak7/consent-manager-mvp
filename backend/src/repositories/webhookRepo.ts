/**
 * Webhook Repository
 * Purpose: Manage webhook registrations and delivery tracking
 * Reference: COMPREHENSIVE_AUDIT_REPORT.md Section B.4 - P0-4
 */

import { pool } from '../db';

export type WebhookEvent = 'CONSENT_REVOKED' | 'CONSENT_EXPIRED' | 'CONSENT_ACTIVE' | 'CONSENT_REJECTED';

export type Webhook = {
  webhookId: string;
  name: string;
  url: string;
  events: WebhookEvent[];
  secret: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, any>;
};

export type WebhookDelivery = {
  deliveryId: string;
  webhookId: string;
  eventType: string;
  payload: Record<string, any>;
  status: 'PENDING' | 'DELIVERED' | 'FAILED' | 'CANCELLED';
  attempts: number;
  lastAttemptAt: Date | null;
  nextRetryAt: Date | null;
  responseStatus: number | null;
  responseBody: string | null;
  createdAt: Date;
  deliveredAt: Date | null;
};

/**
 * Create a new webhook registration
 */
export async function createWebhook(params: {
  name: string;
  url: string;
  events: WebhookEvent[];
  secret: string;
  metadata?: Record<string, any>;
}): Promise<Webhook> {
  const { name, url, events, secret, metadata = {} } = params;

  const result = await pool.query(
    `
    INSERT INTO webhooks (name, url, events, secret, metadata)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
    `,
    [name, url, JSON.stringify(events), secret, JSON.stringify(metadata)]
  );

  return mapWebhookRow(result.rows[0]);
}

/**
 * Get webhook by ID
 */
export async function getWebhookById(webhookId: string): Promise<Webhook | null> {
  const result = await pool.query(
    `SELECT * FROM webhooks WHERE webhook_id = $1`,
    [webhookId]
  );

  if (!result.rows.length) return null;

  return mapWebhookRow(result.rows[0]);
}

/**
 * Get all active webhooks subscribed to a specific event
 */
export async function getActiveWebhooksForEvent(eventType: WebhookEvent): Promise<Webhook[]> {
  const result = await pool.query(
    `
    SELECT * FROM webhooks 
    WHERE active = true 
    AND events @> $1::jsonb
    ORDER BY created_at ASC
    `,
    [JSON.stringify([eventType])]
  );

  return result.rows.map(mapWebhookRow);
}

/**
 * Get all webhooks (for admin listing)
 */
export async function getAllWebhooks(): Promise<Webhook[]> {
  const result = await pool.query(
    `SELECT * FROM webhooks ORDER BY created_at DESC`
  );

  return result.rows.map(mapWebhookRow);
}

/**
 * Update webhook active status
 */
export async function updateWebhookStatus(
  webhookId: string,
  active: boolean
): Promise<Webhook | null> {
  const result = await pool.query(
    `
    UPDATE webhooks 
    SET active = $1, updated_at = CURRENT_TIMESTAMP 
    WHERE webhook_id = $2 
    RETURNING *
    `,
    [active, webhookId]
  );

  if (!result.rows.length) return null;

  return mapWebhookRow(result.rows[0]);
}

/**
 * Delete webhook (cascade deletes deliveries)
 */
export async function deleteWebhook(webhookId: string): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM webhooks WHERE webhook_id = $1`,
    [webhookId]
  );

  return (result.rowCount ?? 0) > 0;
}

/**
 * Create a webhook delivery record
 */
export async function createWebhookDelivery(params: {
  webhookId: string;
  eventType: string;
  payload: Record<string, any>;
}): Promise<WebhookDelivery> {
  const { webhookId, eventType, payload } = params;

  const result = await pool.query(
    `
    INSERT INTO webhook_deliveries (webhook_id, event_type, payload, status, next_retry_at)
    VALUES ($1, $2, $3, 'PENDING', CURRENT_TIMESTAMP)
    RETURNING *
    `,
    [webhookId, eventType, JSON.stringify(payload)]
  );

  return mapDeliveryRow(result.rows[0]);
}

/**
 * Update delivery attempt result
 */
export async function updateDeliveryAttempt(params: {
  deliveryId: string;
  status: 'DELIVERED' | 'FAILED';
  responseStatus: number;
  responseBody: string;
  nextRetryAt?: Date;
}): Promise<WebhookDelivery | null> {
  const { deliveryId, status, responseStatus, responseBody, nextRetryAt } = params;

  const deliveredAt = status === 'DELIVERED' ? 'CURRENT_TIMESTAMP' : 'NULL';

  const result = await pool.query(
    `
    UPDATE webhook_deliveries 
    SET 
      status = $1,
      attempts = attempts + 1,
      last_attempt_at = CURRENT_TIMESTAMP,
      next_retry_at = $2,
      response_status = $3,
      response_body = SUBSTRING($4, 1, 1000),
      delivered_at = ${deliveredAt}
    WHERE delivery_id = $5
    RETURNING *
    `,
    [status, nextRetryAt || null, responseStatus, responseBody, deliveryId]
  );

  if (!result.rows.length) return null;

  return mapDeliveryRow(result.rows[0]);
}

/**
 * Get pending deliveries that need retry
 */
export async function getPendingDeliveries(limit: number = 100): Promise<WebhookDelivery[]> {
  const result = await pool.query(
    `
    SELECT * FROM webhook_deliveries 
    WHERE status = 'PENDING' 
    AND next_retry_at <= CURRENT_TIMESTAMP
    AND attempts < 5
    ORDER BY next_retry_at ASC 
    LIMIT $1
    `,
    [limit]
  );

  return result.rows.map(mapDeliveryRow);
}

/**
 * Get delivery history for a webhook
 */
export async function getWebhookDeliveries(
  webhookId: string,
  limit: number = 50
): Promise<WebhookDelivery[]> {
  const result = await pool.query(
    `
    SELECT * FROM webhook_deliveries 
    WHERE webhook_id = $1 
    ORDER BY created_at DESC 
    LIMIT $2
    `,
    [webhookId, limit]
  );

  return result.rows.map(mapDeliveryRow);
}

/**
 * Cancel pending deliveries (e.g., when webhook is deactivated)
 */
export async function cancelPendingDeliveries(webhookId: string): Promise<number> {
  const result = await pool.query(
    `
    UPDATE webhook_deliveries 
    SET status = 'CANCELLED' 
    WHERE webhook_id = $1 AND status = 'PENDING'
    `,
    [webhookId]
  );

  return result.rowCount ?? 0;
}

// Helper functions to map database rows to TypeScript types

function mapWebhookRow(row: any): Webhook {
  return {
    webhookId: row.webhook_id,
    name: row.name,
    url: row.url,
    events: Array.isArray(row.events) ? row.events : JSON.parse(row.events),
    secret: row.secret,
    active: row.active,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    metadata: typeof row.metadata === 'object' ? row.metadata : JSON.parse(row.metadata || '{}'),
  };
}

function mapDeliveryRow(row: any): WebhookDelivery {
  return {
    deliveryId: row.delivery_id,
    webhookId: row.webhook_id,
    eventType: row.event_type,
    payload: typeof row.payload === 'object' ? row.payload : JSON.parse(row.payload),
    status: row.status,
    attempts: row.attempts,
    lastAttemptAt: row.last_attempt_at ? new Date(row.last_attempt_at) : null,
    nextRetryAt: row.next_retry_at ? new Date(row.next_retry_at) : null,
    responseStatus: row.response_status,
    responseBody: row.response_body,
    createdAt: new Date(row.created_at),
    deliveredAt: row.delivered_at ? new Date(row.delivered_at) : null,
  };
}
