/**
 * Organization Schema Validation Tests
 */
import { describe, it, expect } from 'vitest';
import { CreateOrganizationSchema, UpdateOrganizationSchema, OrgIdParamSchema } from '../../schemas/organizationSchemas';

describe('CreateOrganizationSchema', () => {
  const valid = {
    name: 'Acme Corporation',
    slug: 'acme-corp',
  };

  it('accepts minimal valid input', () => {
    expect(CreateOrganizationSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts full valid input', () => {
    const result = CreateOrganizationSchema.safeParse({
      ...valid,
      displayName: 'Acme Corp',
      domain: 'acme.com',
      plan: 'enterprise',
      settings: { feature_x: true },
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    expect(CreateOrganizationSchema.safeParse({ ...valid, name: '' }).success).toBe(false);
  });

  it('rejects name exceeding 200 chars', () => {
    expect(CreateOrganizationSchema.safeParse({ ...valid, name: 'a'.repeat(201) }).success).toBe(false);
  });

  it('rejects slug with uppercase', () => {
    expect(CreateOrganizationSchema.safeParse({ ...valid, slug: 'Acme-Corp' }).success).toBe(false);
  });

  it('rejects slug with spaces', () => {
    expect(CreateOrganizationSchema.safeParse({ ...valid, slug: 'acme corp' }).success).toBe(false);
  });

  it('rejects slug starting with hyphen', () => {
    expect(CreateOrganizationSchema.safeParse({ ...valid, slug: '-acme' }).success).toBe(false);
  });

  it('rejects slug with consecutive hyphens', () => {
    expect(CreateOrganizationSchema.safeParse({ ...valid, slug: 'acme--corp' }).success).toBe(false);
  });

  it('accepts single-word slug', () => {
    expect(CreateOrganizationSchema.safeParse({ ...valid, slug: 'acme' }).success).toBe(true);
  });

  it('rejects invalid plan', () => {
    expect(CreateOrganizationSchema.safeParse({ ...valid, plan: 'premium' }).success).toBe(false);
  });

  it('accepts all valid plans', () => {
    for (const plan of ['free', 'starter', 'professional', 'enterprise']) {
      expect(CreateOrganizationSchema.safeParse({ ...valid, plan }).success).toBe(true);
    }
  });

  it('defaults plan to undefined when not provided', () => {
    const result = CreateOrganizationSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.plan).toBeUndefined();
    }
  });

  it('trims whitespace from name', () => {
    const result = CreateOrganizationSchema.safeParse({ ...valid, name: '  Acme  ' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Acme');
    }
  });
});

describe('UpdateOrganizationSchema', () => {
  it('accepts empty object (all optional)', () => {
    expect(UpdateOrganizationSchema.safeParse({}).success).toBe(true);
  });

  it('accepts partial updates', () => {
    expect(UpdateOrganizationSchema.safeParse({ name: 'New Name' }).success).toBe(true);
  });

  it('accepts status update', () => {
    for (const status of ['active', 'suspended', 'deactivated']) {
      expect(UpdateOrganizationSchema.safeParse({ status }).success).toBe(true);
    }
  });

  it('rejects invalid status', () => {
    expect(UpdateOrganizationSchema.safeParse({ status: 'deleted' }).success).toBe(false);
  });

  it('accepts maxApiKeys within range', () => {
    expect(UpdateOrganizationSchema.safeParse({ maxApiKeys: 50 }).success).toBe(true);
  });

  it('rejects maxApiKeys below 1', () => {
    expect(UpdateOrganizationSchema.safeParse({ maxApiKeys: 0 }).success).toBe(false);
  });

  it('rejects maxApiKeys above 100', () => {
    expect(UpdateOrganizationSchema.safeParse({ maxApiKeys: 101 }).success).toBe(false);
  });
});

describe('OrgIdParamSchema', () => {
  it('accepts valid UUID', () => {
    expect(OrgIdParamSchema.safeParse({ orgId: '550e8400-e29b-41d4-a716-446655440000' }).success).toBe(true);
  });

  it('rejects non-UUID string', () => {
    expect(OrgIdParamSchema.safeParse({ orgId: 'not-a-uuid' }).success).toBe(false);
  });

  it('rejects missing orgId', () => {
    expect(OrgIdParamSchema.safeParse({}).success).toBe(false);
  });
});
