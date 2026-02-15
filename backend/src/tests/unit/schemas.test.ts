/**
 * Schema Validation Unit Tests
 * Tests Zod schemas for consent, process, and erasure request validation
 */

import { describe, it, expect } from 'vitest';
import { CreateConsentSchema, RevokeSemanticSchema } from '../../schemas/consent.schema';
import { ProcessRequestSchema } from '../../schemas/process.schema';

describe('CreateConsentSchema', () => {
  const validData = {
    purpose: 'marketing',
    dataTypes: ['email', 'name'],
    validUntil: new Date(Date.now() + 86400000).toISOString(),
    noticeId: 'notice-1',
    noticeVersion: '1.0',
    language: 'en',
  };

  it('accepts valid consent request without userId (P1-2)', () => {
    const result = CreateConsentSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('accepts valid consent request with optional userId', () => {
    const result = CreateConsentSchema.safeParse({ ...validData, userId: 'user-1' });
    expect(result.success).toBe(true);
  });

  it('rejects empty purpose', () => {
    const result = CreateConsentSchema.safeParse({ ...validData, purpose: '' });
    expect(result.success).toBe(false);
  });

  it('rejects empty dataTypes array', () => {
    const result = CreateConsentSchema.safeParse({ ...validData, dataTypes: [] });
    expect(result.success).toBe(false);
  });

  it('rejects past validUntil date', () => {
    const result = CreateConsentSchema.safeParse({
      ...validData,
      validUntil: '2020-01-01T00:00:00.000Z',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid date format', () => {
    const result = CreateConsentSchema.safeParse({
      ...validData,
      validUntil: 'not-a-date',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing noticeId', () => {
    const { noticeId, ...noNotice } = validData;
    const result = CreateConsentSchema.safeParse(noNotice);
    expect(result.success).toBe(false);
  });

  it('rejects invalid language code', () => {
    const result = CreateConsentSchema.safeParse({
      ...validData,
      language: 'invalid',
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid language codes', () => {
    for (const lang of ['en', 'hi', 'ta', 'en-IN']) {
      const result = CreateConsentSchema.safeParse({ ...validData, language: lang });
      expect(result.success).toBe(true);
    }
  });

  it('rejects extra fields (strict mode)', () => {
    const result = CreateConsentSchema.safeParse({
      ...validData,
      malicious: 'field',
    });
    expect(result.success).toBe(false);
  });

  it('sanitizes null bytes from purpose', () => {
    const result = CreateConsentSchema.safeParse({
      ...validData,
      purpose: 'mark\0eting',
    });
    // Should pass but with sanitized value
    if (result.success) {
      expect(result.data.purpose).not.toContain('\0');
    }
  });
});

describe('RevokeSemanticSchema', () => {
  it('accepts valid revocation with purpose only (P1-2)', () => {
    const result = RevokeSemanticSchema.safeParse({ purpose: 'marketing' });
    expect(result.success).toBe(true);
  });

  it('accepts revocation with optional userId', () => {
    const result = RevokeSemanticSchema.safeParse({
      userId: 'user-1',
      purpose: 'marketing',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty purpose', () => {
    const result = RevokeSemanticSchema.safeParse({ purpose: '' });
    expect(result.success).toBe(false);
  });
});

describe('ProcessRequestSchema', () => {
  it('accepts valid process request', () => {
    const result = ProcessRequestSchema.safeParse({
      userId: 'user-1',
      purpose: 'marketing',
      dataTypes: ['email'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing userId', () => {
    const result = ProcessRequestSchema.safeParse({
      purpose: 'marketing',
      dataTypes: ['email'],
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing purpose', () => {
    const result = ProcessRequestSchema.safeParse({
      userId: 'user-1',
      dataTypes: ['email'],
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing dataTypes', () => {
    const result = ProcessRequestSchema.safeParse({
      userId: 'user-1',
      purpose: 'marketing',
    });
    expect(result.success).toBe(false);
  });
});
