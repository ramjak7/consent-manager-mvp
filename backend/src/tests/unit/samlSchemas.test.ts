/**
 * SAML Schema Validation Tests
 */
import { describe, it, expect } from 'vitest';
import { CreateSamlConfigSchema, UpdateSamlConfigSchema } from '../../schemas/samlSchemas';

describe('CreateSamlConfigSchema', () => {
  const validCert = '-----BEGIN CERTIFICATE-----\n' + 'A'.repeat(100) + '\n-----END CERTIFICATE-----';
  const valid = {
    idpEntityId: 'https://idp.example.com/metadata',
    idpSsoUrl: 'https://idp.example.com/sso',
    idpCertificate: validCert,
    spEntityId: 'https://consent.example.com',
  };

  it('accepts minimal valid input', () => {
    expect(CreateSamlConfigSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts full valid input', () => {
    const result = CreateSamlConfigSchema.safeParse({
      ...valid,
      idpSloUrl: 'https://idp.example.com/slo',
      nameIdFormat: 'urn:oasis:names:tc:SAML:2.0:nameid-format:persistent',
      attributeMapping: { email: 'urn:oid:0.9.2342.19200300.100.1.3' },
      autoProvision: true,
      defaultRole: 'DF_CLIENT',
      allowedDomains: ['example.com', 'corp.example.com'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing idpEntityId', () => {
    const { idpEntityId, ...rest } = valid;
    expect(CreateSamlConfigSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects missing idpSsoUrl', () => {
    const { idpSsoUrl, ...rest } = valid;
    expect(CreateSamlConfigSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects missing idpCertificate', () => {
    const { idpCertificate, ...rest } = valid;
    expect(CreateSamlConfigSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects short certificate', () => {
    expect(CreateSamlConfigSchema.safeParse({ ...valid, idpCertificate: 'short' }).success).toBe(false);
  });

  it('accepts missing spEntityId (optional)', () => {
    const { spEntityId, ...rest } = valid;
    expect(CreateSamlConfigSchema.safeParse(rest).success).toBe(true);
  });

  it('rejects invalid URL for idpSsoUrl', () => {
    expect(CreateSamlConfigSchema.safeParse({ ...valid, idpSsoUrl: 'not-a-url' }).success).toBe(false);
  });

  it('accepts valid SLO URL', () => {
    expect(CreateSamlConfigSchema.safeParse({ ...valid, idpSloUrl: 'https://idp.example.com/slo' }).success).toBe(true);
  });

  it('rejects invalid SLO URL', () => {
    expect(CreateSamlConfigSchema.safeParse({ ...valid, idpSloUrl: 'not-a-url' }).success).toBe(false);
  });

  it('accepts valid nameIdFormat', () => {
    const formats = [
      'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
      'urn:oasis:names:tc:SAML:2.0:nameid-format:persistent',
      'urn:oasis:names:tc:SAML:2.0:nameid-format:transient',
      'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified',
    ];
    for (const nameIdFormat of formats) {
      expect(CreateSamlConfigSchema.safeParse({ ...valid, nameIdFormat }).success).toBe(true);
    }
  });

  it('accepts any string for nameIdFormat (not enum)', () => {
    expect(CreateSamlConfigSchema.safeParse({ ...valid, nameIdFormat: 'custom-format' }).success).toBe(true);
  });

  it('accepts boolean autoProvision', () => {
    expect(CreateSamlConfigSchema.safeParse({ ...valid, autoProvision: false }).success).toBe(true);
  });

  it('accepts valid defaultRole', () => {
    for (const role of ['DF_CLIENT', 'DF_ADMIN', 'DF_VIEWER']) {
      expect(CreateSamlConfigSchema.safeParse({ ...valid, defaultRole: role }).success).toBe(true);
    }
  });

  it('accepts any string for defaultRole (not enum)', () => {
    expect(CreateSamlConfigSchema.safeParse({ ...valid, defaultRole: 'CUSTOM_ROLE' }).success).toBe(true);
  });

  it('accepts allowedDomains as string array', () => {
    expect(CreateSamlConfigSchema.safeParse({ ...valid, allowedDomains: ['example.com'] }).success).toBe(true);
  });
});

describe('UpdateSamlConfigSchema', () => {
  it('accepts empty object (all optional)', () => {
    expect(UpdateSamlConfigSchema.safeParse({}).success).toBe(true);
  });

  it('accepts partial updates', () => {
    expect(UpdateSamlConfigSchema.safeParse({ isActive: true }).success).toBe(true);
  });

  it('accepts autoProvision update', () => {
    expect(UpdateSamlConfigSchema.safeParse({ autoProvision: false }).success).toBe(true);
  });
});
