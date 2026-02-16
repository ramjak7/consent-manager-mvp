import { Router, Request, Response } from 'express';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/jwtAuth';
import { requirePermission } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import {
  createNotice,
  getNoticeById,
  getNoticesByOrg,
  updateNotice,
  createNoticeVersion,
  getPublishedNotice,
  deleteNotice,
} from '../repositories/noticeRepo';
import {
  CreateNoticeSchema,
  UpdateNoticeSchema,
  NoticeIdParamSchema,
  NoticeSlugParamSchema,
  NoticeQuerySchema,
} from '../schemas/noticeSchemas';

const router = Router();
const adminLimiter = require('express-rate-limit').default({ windowMs: 60000, max: 30 });

// GET /api/v1/notices — List notices for current org
router.get(
  '/notices',
  authenticateJWT,
  validate({ query: NoticeQuerySchema }),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const orgId = (req as any).orgId || '00000000-0000-0000-0000-000000000001';
      const { status, page, limit } = req.query as any;
      const result = await getNoticesByOrg(orgId, {
        status,
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      });
      res.json({ data: result.notices, pagination: result.pagination });
    } catch (error) {
      console.error('Error listing notices:', error);
      res.status(500).json({ error: 'Failed to list notices' });
    }
  }
);

// GET /api/v1/notices/published/:slug — Get published notice by slug (public-facing)
router.get(
  '/notices/published/:slug',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const orgId = (req as any).orgId || '00000000-0000-0000-0000-000000000001';
      const notice = await getPublishedNotice(orgId, req.params.slug);
      if (!notice) {
        res.status(404).json({ error: 'Notice not found or not published' });
        return;
      }
      res.json({ data: notice });
    } catch (error) {
      console.error('Error getting published notice:', error);
      res.status(500).json({ error: 'Failed to get notice' });
    }
  }
);

// GET /api/v1/notices/:noticeId — Get notice by ID
router.get(
  '/notices/:noticeId',
  authenticateJWT,
  validate({ params: NoticeIdParamSchema }),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const notice = await getNoticeById(req.params.noticeId);
      if (!notice) {
        res.status(404).json({ error: 'Notice not found' });
        return;
      }
      res.json({ data: notice });
    } catch (error) {
      console.error('Error getting notice:', error);
      res.status(500).json({ error: 'Failed to get notice' });
    }
  }
);

// POST /api/v1/admin/notices — Create a new notice
router.post(
  '/admin/notices',
  adminLimiter,
  authenticateJWT,
  requirePermission('PURPOSE_MANAGE'),
  validate({ body: CreateNoticeSchema }),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const orgId = (req as any).orgId || '00000000-0000-0000-0000-000000000001';
      const notice = await createNotice({
        orgId,
        ...req.body,
        createdBy: req.user?.userId,
      });
      res.status(201).json({ data: notice });
    } catch (error: any) {
      if (error.code === '23505') {
        res.status(409).json({ error: 'A notice with this slug already exists' });
        return;
      }
      console.error('Error creating notice:', error);
      res.status(500).json({ error: 'Failed to create notice' });
    }
  }
);

// PATCH /api/v1/admin/notices/:noticeId — Update a notice
router.patch(
  '/admin/notices/:noticeId',
  adminLimiter,
  authenticateJWT,
  requirePermission('PURPOSE_MANAGE'),
  validate({ params: NoticeIdParamSchema, body: UpdateNoticeSchema }),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const existing = await getNoticeById(req.params.noticeId);
      if (!existing) {
        res.status(404).json({ error: 'Notice not found' });
        return;
      }

      // Can only edit draft notices
      if (existing.status !== 'draft' && req.body.content) {
        res.status(400).json({
          error: 'Cannot modify published notice content',
          message: 'Create a new version instead',
        });
        return;
      }

      const notice = await updateNotice(req.params.noticeId, req.body);
      res.json({ data: notice });
    } catch (error) {
      console.error('Error updating notice:', error);
      res.status(500).json({ error: 'Failed to update notice' });
    }
  }
);

// POST /api/v1/admin/notices/:noticeId/publish — Publish a notice
router.post(
  '/admin/notices/:noticeId/publish',
  adminLimiter,
  authenticateJWT,
  requirePermission('PURPOSE_MANAGE'),
  validate({ params: NoticeIdParamSchema }),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const existing = await getNoticeById(req.params.noticeId);
      if (!existing) {
        res.status(404).json({ error: 'Notice not found' });
        return;
      }

      if (existing.status !== 'draft') {
        res.status(400).json({
          error: 'Only draft notices can be published',
          currentStatus: existing.status,
        });
        return;
      }

      const notice = await updateNotice(req.params.noticeId, { status: 'published' });
      res.json({ data: notice, message: 'Notice published successfully' });
    } catch (error) {
      console.error('Error publishing notice:', error);
      res.status(500).json({ error: 'Failed to publish notice' });
    }
  }
);

// POST /api/v1/admin/notices/:slug/versions — Create a new version of a notice
router.post(
  '/admin/notices/:slug/versions',
  adminLimiter,
  authenticateJWT,
  requirePermission('PURPOSE_MANAGE'),
  validate({ params: NoticeSlugParamSchema, body: CreateNoticeSchema }),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const orgId = (req as any).orgId || '00000000-0000-0000-0000-000000000001';
      const notice = await createNoticeVersion(orgId, req.params.slug, {
        ...req.body,
        createdBy: req.user?.userId,
      });
      res.status(201).json({ data: notice });
    } catch (error) {
      console.error('Error creating notice version:', error);
      res.status(500).json({ error: 'Failed to create notice version' });
    }
  }
);

// DELETE /api/v1/admin/notices/:noticeId — Delete a draft notice
router.delete(
  '/admin/notices/:noticeId',
  adminLimiter,
  authenticateJWT,
  requirePermission('PURPOSE_MANAGE'),
  validate({ params: NoticeIdParamSchema }),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const deleted = await deleteNotice(req.params.noticeId);
      if (!deleted) {
        res.status(404).json({
          error: 'Notice not found or not in draft status',
          message: 'Only draft notices can be deleted',
        });
        return;
      }
      res.json({ message: 'Notice deleted' });
    } catch (error) {
      console.error('Error deleting notice:', error);
      res.status(500).json({ error: 'Failed to delete notice' });
    }
  }
);

export default router;
