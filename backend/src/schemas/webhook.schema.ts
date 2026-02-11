/**
 * Webhook Validation Schemas
 * Purpose: Zod schemas for webhook API endpoints
 */

import { z } from 'zod';

export const CreateWebhookSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  url: z
    .string()
    .url('Invalid URL')
    .refine((url) => url.startsWith('https://'), {
      message: 'Webhook URL must use HTTPS',
    }),
  events: z
    .array(
      z.enum([
        'CONSENT_REVOKED',
        'CONSENT_EXPIRED',
        'CONSENT_ACTIVE',
        'CONSENT_REJECTED',
      ])
    )
    .min(1, 'At least one event is required'),
  secret: z.string().min(32, 'Secret must be at least 32 characters'),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const UpdateWebhookStatusSchema = z.object({
  active: z.boolean(),
});

export const TestWebhookSchema = z.object({
  eventType: z.enum([
    'CONSENT_REVOKED',
    'CONSENT_EXPIRED',
    'CONSENT_ACTIVE',
    'CONSENT_REJECTED',
  ]),
  payload: z.record(z.string(), z.any()).optional(),
});
