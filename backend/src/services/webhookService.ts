/**
 * Webhook Service
 * Purpose: Handle webhook delivery with retry logic and exponential backoff
 * Reference: COMPREHENSIVE_AUDIT_REPORT.md Section B.4 - P0-4
 */

import crypto from 'crypto';
import { logger } from '../utils/logger';
import { trackWebhookDelivery } from '../middleware/metrics';
import {
  getActiveWebhooksForEvent,
  createWebhookDelivery,
  updateDeliveryAttempt,
  getPendingDeliveries,
  getWebhookById,
  WebhookEvent,
  WebhookDelivery,
} from '../repositories/webhookRepo';

const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY_MS = 60000; // 1 minute

/**
 * Emit webhook event to all subscribed webhooks
 */
export async function emitWebhookEvent(
  eventType: WebhookEvent,
  payload: Record<string, any>
): Promise<void> {
  logger.info('Emitting webhook event', { eventType });

  // Get all active webhooks subscribed to this event
  const webhooks = await getActiveWebhooksForEvent(eventType);

  if (webhooks.length === 0) {
    logger.debug('No active webhooks subscribed', { eventType });
    return;
  }

  logger.info('Creating webhook deliveries', { eventType, count: webhooks.length });

  // Create delivery records for each webhook
  for (const webhook of webhooks) {
    await createWebhookDelivery({
      webhookId: webhook.webhookId,
      eventType,
      payload,
    });
  }

  // Note: Actual delivery happens in background job via processWebhookDeliveries()
}

/**
 * Process pending webhook deliveries (called by cron job)
 */
export async function processWebhookDeliveries(): Promise<void> {
  const pendingDeliveries = await getPendingDeliveries(50);

  if (pendingDeliveries.length === 0) {
    return;
  }

  logger.info('Processing webhook deliveries', { count: pendingDeliveries.length });

  for (const delivery of pendingDeliveries) {
    await deliverWebhook(delivery);
  }
}

/**
 * Deliver a single webhook with retry logic
 */
async function deliverWebhook(delivery: WebhookDelivery): Promise<void> {
  const webhook = await getWebhookById(delivery.webhookId);

  if (!webhook) {
    logger.error('Webhook not found, cancelling delivery', { webhookId: delivery.webhookId });
    await updateDeliveryAttempt({
      deliveryId: delivery.deliveryId,
      status: 'FAILED',
      responseStatus: 0,
      responseBody: 'Webhook not found',
    });
    trackWebhookDelivery(delivery.webhookId, delivery.eventType, 'FAILED');
    return;
  }

  if (!webhook.active) {
    logger.debug('Webhook inactive, skipping delivery', { webhookId: webhook.webhookId });
    return;
  }

  try {
    // Generate HMAC signature for payload verification
    const signature = generateWebhookSignature(delivery.payload, webhook.secret);

    // Send HTTP POST request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': delivery.eventType,
        'X-Delivery-ID': delivery.deliveryId,
        'User-Agent': 'ConsentManager-Webhook/1.0',
      },
      body: JSON.stringify(delivery.payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const responseBody = await response.text();

    // Success: 2xx status codes
    if (response.status >= 200 && response.status < 300) {
      logger.info('Webhook delivered successfully', { 
        webhookName: webhook.name,
        statusCode: response.status,
        deliveryId: delivery.deliveryId,
      });
      await updateDeliveryAttempt({
        deliveryId: delivery.deliveryId,
        status: 'DELIVERED',
        responseStatus: response.status,
        responseBody: responseBody.substring(0, 1000),
      });
      trackWebhookDelivery(webhook.webhookId, delivery.eventType, 'DELIVERED');
    } else {
      // Failed: non-2xx status
      logger.warn('Webhook delivery failed', { 
        webhookName: webhook.name,
        statusCode: response.status,
        deliveryId: delivery.deliveryId,
      });
      await handleFailedDelivery(delivery, response.status, responseBody);
    }
  } catch (error: any) {
    logger.error('Webhook delivery error', { 
      webhookName: webhook.name,
      error: error.message,
      deliveryId: delivery.deliveryId,
    });
    await handleFailedDelivery(delivery, 0, error.message);
  }
}

/**
 * Handle failed delivery with exponential backoff
 */
async function handleFailedDelivery(
  delivery: WebhookDelivery,
  responseStatus: number,
  responseBody: string
): Promise<void> {
  const nextAttempt = delivery.attempts + 1;

  if (nextAttempt >= MAX_RETRIES) {
    logger.error('Max webhook retries reached', { 
      deliveryId: delivery.deliveryId,
      attempts: nextAttempt,
    });
    await updateDeliveryAttempt({
      deliveryId: delivery.deliveryId,
      status: 'FAILED',
      responseStatus,
      responseBody: responseBody.substring(0, 1000),
    });
    trackWebhookDelivery(delivery.webhookId, delivery.eventType, 'FAILED');
    return;
  }

  // Exponential backoff: 1min, 2min, 4min, 8min, 16min
  const delayMs = INITIAL_RETRY_DELAY_MS * Math.pow(2, delivery.attempts);
  const nextRetryAt = new Date(Date.now() + delayMs);

  logger.info('Scheduling webhook retry', {
    deliveryId: delivery.deliveryId,
    attempt: nextAttempt,
    maxRetries: MAX_RETRIES,
    nextRetryAt: nextRetryAt.toISOString(),
  });

  await updateDeliveryAttempt({
    deliveryId: delivery.deliveryId,
    status: 'FAILED', // Still PENDING in status, but we update to track attempt
    responseStatus,
    responseBody: responseBody.substring(0, 1000),
    nextRetryAt,
  });
}

/**
 * Generate HMAC-SHA256 signature for webhook payload
 */
function generateWebhookSignature(payload: Record<string, any>, secret: string): string {
  const payloadString = JSON.stringify(payload);
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payloadString);
  return `sha256=${hmac.digest('hex')}`;
}

/**
 * Verify webhook signature (for testing endpoints)
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  const expected = `sha256=${expectedSignature}`;

  // Timing-safe comparison
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
