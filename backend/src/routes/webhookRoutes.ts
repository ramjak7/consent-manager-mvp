/**
 * Webhook Routes
 * Purpose: API endpoints for webhook management
 * Reference: COMPREHENSIVE_AUDIT_REPORT.md Section B.4 - P0-4
 */

import express from 'express';
import { v7 as uuidv7 } from 'uuid';
import {
  createWebhook,
  getAllWebhooks,
  getWebhookById,
  updateWebhookStatus,
  deleteWebhook,
  getWebhookDeliveries,
  cancelPendingDeliveries,
  createWebhookDelivery,
} from '../repositories/webhookRepo';
import { CreateWebhookSchema, UpdateWebhookStatusSchema, TestWebhookSchema } from '../schemas/webhook.schema';
import { validate } from '../middleware/validate';
import { requireApiKey } from '../middleware/auth';
import crypto from 'crypto';

const router = express.Router();

// All webhook routes require admin API key
router.use(requireApiKey);

/**
 * GET /webhooks
 * List all webhooks
 */
router.get('/', async (req, res) => {
  try {
    const webhooks = await getAllWebhooks();
    
    // Don't expose secrets in list view
    const sanitized = webhooks.map((w) => ({
      ...w,
      secret: '***REDACTED***',
    }));

    res.json(sanitized);
  } catch (error: any) {
    console.error('Error fetching webhooks:', error);
    res.status(500).json({ error: 'Failed to fetch webhooks' });
  }
});

/**
 * POST /webhooks
 * Register a new webhook
 */
router.post('/', validate({ body: CreateWebhookSchema }), async (req, res) => {
  try {
    const { name, url, events, secret, metadata } = req.body;

    const webhook = await createWebhook({
      name,
      url,
      events,
      secret,
      metadata,
    });

    res.status(201).json({
      ...webhook,
      secret: '***REDACTED***', // Don't return secret in response
    });
  } catch (error: any) {
    console.error('Error creating webhook:', error);
    res.status(500).json({ error: 'Failed to create webhook' });
  }
});

/**
 * GET /webhooks/:id
 * Get webhook details
 */
router.get('/:id', async (req, res) => {
  try {
    const webhook = await getWebhookById(req.params.id);

    if (!webhook) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    res.json({
      ...webhook,
      secret: '***REDACTED***',
    });
  } catch (error: any) {
    console.error('Error fetching webhook:', error);
    res.status(500).json({ error: 'Failed to fetch webhook' });
  }
});

/**
 * PATCH /webhooks/:id
 * Update webhook status (activate/deactivate)
 */
router.patch('/:id', validate({ body: UpdateWebhookStatusSchema }), async (req, res) => {
  try {
    const { active } = req.body;

    const webhook = await updateWebhookStatus(req.params.id, active);

    if (!webhook) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    // Cancel pending deliveries if deactivating
    if (!active) {
      const cancelled = await cancelPendingDeliveries(webhook.webhookId);
      console.log(`Cancelled ${cancelled} pending deliveries for webhook ${webhook.name}`);
    }

    res.json({
      ...webhook,
      secret: '***REDACTED***',
    });
  } catch (error: any) {
    console.error('Error updating webhook:', error);
    res.status(500).json({ error: 'Failed to update webhook' });
  }
});

/**
 * DELETE /webhooks/:id
 * Delete webhook (cascades to deliveries)
 */
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await deleteWebhook(req.params.id);

    if (!deleted) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    res.json({ message: 'Webhook deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting webhook:', error);
    res.status(500).json({ error: 'Failed to delete webhook' });
  }
});

/**
 * GET /webhooks/:id/deliveries
 * Get delivery history for a webhook
 */
router.get('/:id/deliveries', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const deliveries = await getWebhookDeliveries(req.params.id, Math.min(limit, 200));

    res.json(deliveries);
  } catch (error: any) {
    console.error('Error fetching deliveries:', error);
    res.status(500).json({ error: 'Failed to fetch deliveries' });
  }
});

/**
 * POST /webhooks/:id/test
 * Send test webhook event
 */
router.post('/:id/test', validate({ body: TestWebhookSchema }), async (req, res) => {
  try {
    const { eventType, payload = {} } = req.body;

    const webhook = await getWebhookById(req.params.id);

    if (!webhook) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    // Create test delivery
    const testPayload = {
      ...payload,
      test: true,
      timestamp: new Date().toISOString(),
      deliveryId: uuidv7(),
    };

    const delivery = await createWebhookDelivery({
      webhookId: webhook.webhookId,
      eventType,
      payload: testPayload,
    });

    res.json({
      message: 'Test webhook queued for delivery',
      deliveryId: delivery.deliveryId,
    });
  } catch (error: any) {
    console.error('Error sending test webhook:', error);
    res.status(500).json({ error: 'Failed to send test webhook' });
  }
});

/**
 * POST /webhooks/generate-secret
 * Generate a cryptographically secure webhook secret
 */
router.post('/generate-secret', (req, res) => {
  const secret = crypto.randomBytes(32).toString('hex');
  res.json({ secret });
});

export default router;
