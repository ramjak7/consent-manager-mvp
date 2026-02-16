import { z } from 'zod';

// ============================================================
// API Key Schemas
// ============================================================

const validScopes = [
  'consent:read',
  'consent:write',
  'consent:revoke',
  'processing:validate',
  'audit:read',
  'erasure:read',
  'erasure:manage',
  'correction:read',
  'correction:manage',
  'purpose:read',
  'purpose:manage',
  'processor:read',
  'processor:manage',
  'webhook:manage',
  'notice:read',
  'notice:manage',
] as const;

export const CreateApiKeySchema = z.object({
  name: z.string().min(1).max(100).trim(),
  scopes: z.array(z.enum(validScopes, {
    error: 'Invalid scope',
  })).min(1),
  rateLimit: z.number().int().min(10).max(10000).optional(),
  expiresAt: z.string().datetime().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const UpdateApiKeySchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  scopes: z.array(z.enum(validScopes, {
    error: 'Invalid scope',
  })).min(1).optional(),
  rateLimit: z.number().int().min(10).max(10000).optional(),
  isActive: z.boolean().optional(),
});

export const ApiKeyIdParamSchema = z.object({
  keyId: z.string().uuid(),
});

export type CreateApiKeyInput = z.infer<typeof CreateApiKeySchema>;
export type UpdateApiKeyInput = z.infer<typeof UpdateApiKeySchema>;
export type ApiKeyScope = typeof validScopes[number];
