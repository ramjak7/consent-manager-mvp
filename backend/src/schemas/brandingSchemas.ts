import { z } from 'zod';

// ============================================================
// Branding Schemas (White-label support)
// ============================================================

const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;

export const UpdateBrandingSchema = z.object({
  logoUrl: z.string().url().max(2000).optional(),
  faviconUrl: z.string().url().max(2000).optional(),
  primaryColor: z.string().regex(hexColorRegex, {
    error: 'Must be a valid hex color (e.g. #4F46E5)',
  }).optional(),
  secondaryColor: z.string().regex(hexColorRegex, {
    error: 'Must be a valid hex color',
  }).optional(),
  accentColor: z.string().regex(hexColorRegex, {
    error: 'Must be a valid hex color',
  }).optional(),
  fontFamily: z.string().max(200).optional(),
  customCss: z.string().max(50000).optional(),
  portalTitle: z.string().max(200).optional(),
  supportEmail: z.string().email().optional(),
  privacyPolicyUrl: z.string().url().max(2000).optional(),
  termsUrl: z.string().url().max(2000).optional(),
  footerText: z.string().max(500).optional(),
});

export type UpdateBrandingInput = z.infer<typeof UpdateBrandingSchema>;
