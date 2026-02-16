import { z } from 'zod';

// ============================================================
// Organization Schemas
// ============================================================

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const CreateOrganizationSchema = z.object({
  name: z.string().min(2).max(200).trim(),
  slug: z.string().min(2).max(100).regex(slugRegex, 'Slug must be lowercase alphanumeric with hyphens only'),
  displayName: z.string().max(200).optional(),
  domain: z.string().max(253).optional(),
  plan: z.enum(['free', 'starter', 'professional', 'enterprise'], {
    error: 'Invalid plan',
  }).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

export const UpdateOrganizationSchema = z.object({
  name: z.string().min(2).max(200).trim().optional(),
  displayName: z.string().max(200).optional(),
  domain: z.string().max(253).optional(),
  plan: z.enum(['free', 'starter', 'professional', 'enterprise'], {
    error: 'Invalid plan',
  }).optional(),
  status: z.enum(['active', 'suspended', 'deactivated'], {
    error: 'Invalid status',
  }).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
  maxApiKeys: z.number().int().min(1).max(100).optional(),
  maxUsers: z.number().int().min(1).max(10000).optional(),
});

export const OrgIdParamSchema = z.object({
  orgId: z.string().uuid(),
});

export type CreateOrganizationInput = z.infer<typeof CreateOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof UpdateOrganizationSchema>;
