/**
 * API Key Schema Validation Tests
 */
import { describe, it, expect } from 'vitest';
import { CreateApiKeySchema, UpdateApiKeySchema, ApiKeyIdParamSchema } from '../../schemas/apiKeySchemas';

describe('CreateApiKeySchema', () => {
  const valid = {
    name: 'Production SDK Key',
    scopes: ['consent:read', 'consent:write'],
  };

  it('accepts minimal valid input', () => {
    expect(CreateApiKeySchema.safeParse(valid).success).toBe(true);
  });

  it('accepts full valid input', () => {
    const result = CreateApiKeySchema.safeParse({
      ...valid,
      rateLimit: 5000,
      expiresAt: '2027-01-01T00:00:00Z',
      metadata: { env: 'production' },
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    expect(CreateApiKeySchema.safeParse({ ...valid, name: '' }).success).toBe(false);
  });

  it('rejects name exceeding 100 chars', () => {
    expect(CreateApiKeySchema.safeParse({ ...valid, name: 'a'.repeat(101) }).success).toBe(false);
  });

  it('rejects empty scopes array', () => {
    expect(CreateApiKeySchema.safeParse({ ...valid, scopes: [] }).success).toBe(false);
  });

  it('rejects invalid scope', () => {
    expect(CreateApiKeySchema.safeParse({ ...valid, scopes: ['invalid:scope'] }).success).toBe(false);
  });

  it('accepts all valid scopes', () => {
    const allScopes = [
      'consent:read', 'consent:write', 'consent:revoke',
      'processing:validate', 'audit:read',
      'erasure:read', 'erasure:manage',
      'correction:read', 'correction:manage',
      'purpose:read', 'purpose:manage',
      'processor:read', 'processor:manage',
      'webhook:manage', 'notice:read', 'notice:manage',
    ];
    expect(CreateApiKeySchema.safeParse({ ...valid, scopes: allScopes }).success).toBe(true);
  });

  it('rejects rateLimit below 10', () => {
    expect(CreateApiKeySchema.safeParse({ ...valid, rateLimit: 5 }).success).toBe(false);
  });

  it('rejects rateLimit above 10000', () => {
    expect(CreateApiKeySchema.safeParse({ ...valid, rateLimit: 10001 }).success).toBe(false);
  });

  it('rejects invalid datetime for expiresAt', () => {
    expect(CreateApiKeySchema.safeParse({ ...valid, expiresAt: 'not-a-date' }).success).toBe(false);
  });

  it('trims whitespace from name', () => {
    const result = CreateApiKeySchema.safeParse({ ...valid, name: '  My Key  ' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('My Key');
    }
  });
});

describe('UpdateApiKeySchema', () => {
  it('accepts empty object (all optional)', () => {
    expect(UpdateApiKeySchema.safeParse({}).success).toBe(true);
  });

  it('accepts name update', () => {
    expect(UpdateApiKeySchema.safeParse({ name: 'Updated Key' }).success).toBe(true);
  });

  it('accepts isActive toggle', () => {
    expect(UpdateApiKeySchema.safeParse({ isActive: false }).success).toBe(true);
  });

  it('accepts scopes update', () => {
    expect(UpdateApiKeySchema.safeParse({ scopes: ['consent:read'] }).success).toBe(true);
  });

  it('rejects invalid scope in update', () => {
    expect(UpdateApiKeySchema.safeParse({ scopes: ['bad:scope'] }).success).toBe(false);
  });
});

describe('ApiKeyIdParamSchema', () => {
  it('accepts valid UUID', () => {
    expect(ApiKeyIdParamSchema.safeParse({ keyId: '550e8400-e29b-41d4-a716-446655440000' }).success).toBe(true);
  });

  it('rejects non-UUID', () => {
    expect(ApiKeyIdParamSchema.safeParse({ keyId: 'abc123' }).success).toBe(false);
  });
});
