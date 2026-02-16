/**
 * Notice Schema Validation Tests
 */
import { describe, it, expect } from 'vitest';
import { CreateNoticeSchema, UpdateNoticeSchema, PublishNoticeSchema, NoticeQuerySchema } from '../../schemas/noticeSchemas';

describe('CreateNoticeSchema', () => {
  const valid = {
    title: 'Privacy Notice',
    slug: 'privacy-notice',
    content: {
      en: { title: 'Privacy Notice', body: 'We collect your data for...' },
    },
  };

  it('accepts minimal valid input', () => {
    expect(CreateNoticeSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts full valid input', () => {
    const result = CreateNoticeSchema.safeParse({
      ...valid,
      description: 'Our main privacy notice',
      content: {
        en: { title: 'Privacy Notice', body: 'We collect...', summary: 'Summary' },
        hi: { title: 'गोपनीयता सूचना', body: 'हम आपका डेटा...' },
      },
      purposes: ['marketing', 'analytics'],
      dataCategories: ['email', 'phone'],
      retentionDays: 365,
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty title', () => {
    expect(CreateNoticeSchema.safeParse({ ...valid, title: '' }).success).toBe(false);
  });

  it('rejects title exceeding 500 chars', () => {
    expect(CreateNoticeSchema.safeParse({ ...valid, title: 'a'.repeat(501) }).success).toBe(false);
  });

  it('rejects invalid slug format', () => {
    expect(CreateNoticeSchema.safeParse({ ...valid, slug: 'Invalid Slug!' }).success).toBe(false);
  });

  it('rejects uppercase slug', () => {
    expect(CreateNoticeSchema.safeParse({ ...valid, slug: 'UpperCase' }).success).toBe(false);
  });

  it('accepts hyphenated slug', () => {
    expect(CreateNoticeSchema.safeParse({ ...valid, slug: 'my-privacy-notice-v2' }).success).toBe(true);
  });

  it('rejects empty content (no languages)', () => {
    expect(CreateNoticeSchema.safeParse({ ...valid, content: {} }).success).toBe(false);
  });

  it('rejects content with empty body', () => {
    const result = CreateNoticeSchema.safeParse({
      ...valid,
      content: { en: { title: 'Test', body: '' } },
    });
    expect(result.success).toBe(false);
  });

  it('rejects retentionDays of zero', () => {
    expect(CreateNoticeSchema.safeParse({ ...valid, retentionDays: 0 }).success).toBe(false);
  });

  it('rejects retentionDays exceeding 36500', () => {
    expect(CreateNoticeSchema.safeParse({ ...valid, retentionDays: 36501 }).success).toBe(false);
  });

  it('accepts retentionDays at boundary values', () => {
    expect(CreateNoticeSchema.safeParse({ ...valid, retentionDays: 1 }).success).toBe(true);
    expect(CreateNoticeSchema.safeParse({ ...valid, retentionDays: 36500 }).success).toBe(true);
  });
});

describe('UpdateNoticeSchema', () => {
  it('accepts empty object', () => {
    expect(UpdateNoticeSchema.safeParse({}).success).toBe(true);
  });

  it('accepts partial title update', () => {
    expect(UpdateNoticeSchema.safeParse({ title: 'Updated Title' }).success).toBe(true);
  });

  it('accepts status field', () => {
    for (const status of ['draft', 'published', 'archived']) {
      expect(UpdateNoticeSchema.safeParse({ status }).success).toBe(true);
    }
  });

  it('rejects invalid status', () => {
    expect(UpdateNoticeSchema.safeParse({ status: 'deleted' }).success).toBe(false);
  });
});

describe('PublishNoticeSchema', () => {
  it('accepts empty object (no fields required)', () => {
    expect(PublishNoticeSchema.safeParse({}).success).toBe(true);
  });
});

describe('NoticeQuerySchema', () => {
  it('provides defaults for pagination', () => {
    const result = NoticeQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });

  it('accepts status filter', () => {
    const result = NoticeQuerySchema.safeParse({ status: 'published' });
    expect(result.success).toBe(true);
  });

  it('coerces string numbers for pagination', () => {
    const result = NoticeQuerySchema.safeParse({ page: '3', limit: '50' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(3);
      expect(result.data.limit).toBe(50);
    }
  });

  it('rejects limit above 100', () => {
    expect(NoticeQuerySchema.safeParse({ limit: '101' }).success).toBe(false);
  });
});
