import { z } from 'zod';

// ============================================================
// SAML/SSO Configuration Schemas
// ============================================================

export const CreateSamlConfigSchema = z.object({
  idpEntityId: z.string().min(1).max(500).trim(),
  idpSsoUrl: z.string().url().max(2000),
  idpSloUrl: z.string().url().max(2000).optional(),
  idpCertificate: z.string().min(50).max(10000),
  spEntityId: z.string().max(500).optional(),
  nameIdFormat: z.string().max(200).optional(),
  attributeMapping: z.object({
    email: z.string().default('email'),
    name: z.string().default('displayName'),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
  }).optional(),
  autoProvision: z.boolean().optional(),
  defaultRole: z.string().max(50).optional(),
  allowedDomains: z.array(z.string().max(253)).optional(),
});

export const UpdateSamlConfigSchema = z.object({
  idpEntityId: z.string().min(1).max(500).trim().optional(),
  idpSsoUrl: z.string().url().max(2000).optional(),
  idpSloUrl: z.string().url().max(2000).optional(),
  idpCertificate: z.string().min(50).max(10000).optional(),
  spEntityId: z.string().max(500).optional(),
  nameIdFormat: z.string().max(200).optional(),
  attributeMapping: z.object({
    email: z.string(),
    name: z.string(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
  }).optional(),
  autoProvision: z.boolean().optional(),
  defaultRole: z.string().max(50).optional(),
  allowedDomains: z.array(z.string().max(253)).optional(),
  isActive: z.boolean().optional(),
});

export type CreateSamlConfigInput = z.infer<typeof CreateSamlConfigSchema>;
export type UpdateSamlConfigInput = z.infer<typeof UpdateSamlConfigSchema>;
