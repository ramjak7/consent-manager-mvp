import { Router, Request, Response } from 'express';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/jwtAuth';
import { requirePermission } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import {
  createOrganization,
  getOrganizationById,
  getOrganizationBySlug,
  updateOrganization,
  getAllOrganizations,
  deleteOrganization,
} from '../repositories/organizationRepo';
import {
  CreateOrganizationSchema,
  UpdateOrganizationSchema,
  OrgIdParamSchema,
} from '../schemas/organizationSchemas';

const router = Router();
const adminLimiter = require('express-rate-limit').default({ windowMs: 60000, max: 30 });

// GET /api/v1/admin/organizations — List all organizations
router.get(
  '/admin/organizations',
  adminLimiter,
  authenticateJWT,
  requirePermission('SYSTEM_CONFIG'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { status, page, limit } = req.query;
      const result = await getAllOrganizations({
        status: status as string,
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      });
      res.json({ data: result.organizations, pagination: result.pagination });
    } catch (error) {
      console.error('Error listing organizations:', error);
      res.status(500).json({ error: 'Failed to list organizations' });
    }
  }
);

// GET /api/v1/admin/organizations/:orgId — Get single organization
router.get(
  '/admin/organizations/:orgId',
  adminLimiter,
  authenticateJWT,
  requirePermission('SYSTEM_CONFIG'),
  validate({ params: OrgIdParamSchema }),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const org = await getOrganizationById(req.params.orgId);
      if (!org) {
        res.status(404).json({ error: 'Organization not found' });
        return;
      }
      res.json({ data: org });
    } catch (error) {
      console.error('Error getting organization:', error);
      res.status(500).json({ error: 'Failed to get organization' });
    }
  }
);

// POST /api/v1/admin/organizations — Create organization
router.post(
  '/admin/organizations',
  adminLimiter,
  authenticateJWT,
  requirePermission('SYSTEM_CONFIG'),
  validate({ body: CreateOrganizationSchema }),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const existing = await getOrganizationBySlug(req.body.slug);
      if (existing) {
        res.status(409).json({ error: 'Organization slug already exists' });
        return;
      }

      const org = await createOrganization({
        ...req.body,
        createdBy: req.user?.userId,
      });
      res.status(201).json({ data: org });
    } catch (error) {
      console.error('Error creating organization:', error);
      res.status(500).json({ error: 'Failed to create organization' });
    }
  }
);

// PATCH /api/v1/admin/organizations/:orgId — Update organization
router.patch(
  '/admin/organizations/:orgId',
  adminLimiter,
  authenticateJWT,
  requirePermission('SYSTEM_CONFIG'),
  validate({ params: OrgIdParamSchema, body: UpdateOrganizationSchema }),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const org = await updateOrganization(req.params.orgId, req.body);
      if (!org) {
        res.status(404).json({ error: 'Organization not found' });
        return;
      }
      res.json({ data: org });
    } catch (error) {
      console.error('Error updating organization:', error);
      res.status(500).json({ error: 'Failed to update organization' });
    }
  }
);

// DELETE /api/v1/admin/organizations/:orgId — Delete organization
router.delete(
  '/admin/organizations/:orgId',
  adminLimiter,
  authenticateJWT,
  requirePermission('SYSTEM_CONFIG'),
  validate({ params: OrgIdParamSchema }),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const deleted = await deleteOrganization(req.params.orgId);
      if (!deleted) {
        res.status(404).json({ error: 'Organization not found' });
        return;
      }
      res.json({ message: 'Organization deleted' });
    } catch (error) {
      console.error('Error deleting organization:', error);
      res.status(500).json({ error: 'Failed to delete organization' });
    }
  }
);

// GET /api/v1/organizations/current — Get current user's organization
router.get(
  '/organizations/current',
  authenticateJWT,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const orgId = (req as any).orgId || '00000000-0000-0000-0000-000000000001';
      const org = await getOrganizationById(orgId);
      if (!org) {
        res.status(404).json({ error: 'Organization not found' });
        return;
      }
      res.json({ data: org });
    } catch (error) {
      console.error('Error getting current organization:', error);
      res.status(500).json({ error: 'Failed to get organization' });
    }
  }
);

export default router;
