import { z } from 'zod';

// ============================================================
// Consent Notice Schemas (Notice Builder)
// ============================================================

const languageContentSchema = z.object({
  title: z.string().min(1).max(500),
  body: z.string().min(1).max(50000),
  summary: z.string().max(2000).optional(),
});

export const CreateNoticeSchema = z.object({
  title: z.string().min(1).max(500).trim(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens'),
  description: z.string().max(2000).optional(),
  content: z.record(z.string(), languageContentSchema).refine(
    (val) => Object.keys(val).length > 0,
    { message: 'At least one language content is required' }
  ),
  purposes: z.array(z.string()).optional(),
  dataCategories: z.array(z.string()).optional(),
  retentionDays: z.number().int().min(1).max(36500).optional(),
});

export const UpdateNoticeSchema = z.object({
  title: z.string().min(1).max(500).trim().optional(),
  description: z.string().max(2000).optional(),
  content: z.record(z.string(), languageContentSchema).optional(),
  purposes: z.array(z.string()).optional(),
  dataCategories: z.array(z.string()).optional(),
  retentionDays: z.number().int().min(1).max(36500).optional(),
  status: z.enum(['draft', 'published', 'archived'], {
    error: 'Invalid status',
  }).optional(),
});

export const PublishNoticeSchema = z.object({
  // No body needed, action is implicit
});

export const NoticeIdParamSchema = z.object({
  noticeId: z.string().uuid(),
});

export const NoticeSlugParamSchema = z.object({
  slug: z.string().min(1).max(100),
});

export const NoticeQuerySchema = z.object({
  status: z.enum(['draft', 'published', 'archived'], {
    error: 'Invalid status',
  }).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateNoticeInput = z.infer<typeof CreateNoticeSchema>;
export type UpdateNoticeInput = z.infer<typeof UpdateNoticeSchema>;
