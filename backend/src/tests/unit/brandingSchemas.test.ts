/**
 * Branding Schema Validation Tests
 */
import { describe, it, expect } from 'vitest';
import { UpdateBrandingSchema } from '../../schemas/brandingSchemas';

describe('UpdateBrandingSchema', () => {
  it('accepts empty object (all optional)', () => {
    expect(UpdateBrandingSchema.safeParse({}).success).toBe(true);
  });

  it('accepts valid hex colors', () => {
    const result = UpdateBrandingSchema.safeParse({
      primaryColor: '#4F46E5',
      secondaryColor: '#7c3aed',
      accentColor: '#06b6d4',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid hex color (no hash)', () => {
    expect(UpdateBrandingSchema.safeParse({ primaryColor: '4F46E5' }).success).toBe(false);
  });

  it('rejects invalid hex color (too short)', () => {
    expect(UpdateBrandingSchema.safeParse({ primaryColor: '#4F4' }).success).toBe(false);
  });

  it('rejects invalid hex color (too long)', () => {
    expect(UpdateBrandingSchema.safeParse({ primaryColor: '#4F46E5FF' }).success).toBe(false);
  });

  it('rejects invalid hex color (non-hex chars)', () => {
    expect(UpdateBrandingSchema.safeParse({ primaryColor: '#ZZZZZZ' }).success).toBe(false);
  });

  it('accepts valid portal title', () => {
    expect(UpdateBrandingSchema.safeParse({ portalTitle: 'My Consent Portal' }).success).toBe(true);
  });

  it('rejects portal title exceeding 200 chars', () => {
    expect(UpdateBrandingSchema.safeParse({ portalTitle: 'a'.repeat(201) }).success).toBe(false);
  });

  it('accepts valid URLs', () => {
    const result = UpdateBrandingSchema.safeParse({
      logoUrl: 'https://example.com/logo.png',
      faviconUrl: 'https://example.com/favicon.ico',
      privacyPolicyUrl: 'https://example.com/privacy',
      termsUrl: 'https://example.com/terms',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid URLs', () => {
    expect(UpdateBrandingSchema.safeParse({ logoUrl: 'not-a-url' }).success).toBe(false);
  });

  it('accepts valid email for supportEmail', () => {
    expect(UpdateBrandingSchema.safeParse({ supportEmail: 'support@example.com' }).success).toBe(true);
  });

  it('rejects invalid email', () => {
    expect(UpdateBrandingSchema.safeParse({ supportEmail: 'not-an-email' }).success).toBe(false);
  });

  it('accepts valid font family', () => {
    expect(UpdateBrandingSchema.safeParse({ fontFamily: 'Inter, system-ui, sans-serif' }).success).toBe(true);
  });

  it('accepts custom CSS', () => {
    expect(UpdateBrandingSchema.safeParse({ customCss: '.widget { color: red; }' }).success).toBe(true);
  });

  it('rejects custom CSS exceeding 50000 chars', () => {
    expect(UpdateBrandingSchema.safeParse({ customCss: 'a'.repeat(50001) }).success).toBe(false);
  });

  it('accepts complete branding config', () => {
    const result = UpdateBrandingSchema.safeParse({
      logoUrl: 'https://example.com/logo.png',
      faviconUrl: 'https://example.com/favicon.ico',
      primaryColor: '#4F46E5',
      secondaryColor: '#7C3AED',
      accentColor: '#06B6D4',
      fontFamily: 'Inter',
      portalTitle: 'Acme Consent',
      supportEmail: 'privacy@acme.com',
      privacyPolicyUrl: 'https://acme.com/privacy',
      termsUrl: 'https://acme.com/terms',
      customCss: '.consent-banner { background: white; }',
    });
    expect(result.success).toBe(true);
  });
});
