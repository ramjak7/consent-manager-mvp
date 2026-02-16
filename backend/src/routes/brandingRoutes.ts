import { Router, Response } from 'express';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/jwtAuth';
import { requirePermission } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { getBranding, upsertBranding } from '../repositories/brandingRepo';
import { UpdateBrandingSchema } from '../schemas/brandingSchemas';
import { OrgIdParamSchema } from '../schemas/organizationSchemas';

const router = Router();
const adminLimiter = require('express-rate-limit').default({ windowMs: 60000, max: 30 });

// GET /api/v1/branding — Get branding for current org (public-facing for SDK/portal)
router.get(
  '/branding',
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const orgId = (req as any).orgId || '00000000-0000-0000-0000-000000000001';
      const branding = await getBranding(orgId);
      if (!branding) {
        res.json({
          data: {
            orgId,
            primaryColor: '#4F46E5',
            secondaryColor: '#7C3AED',
            accentColor: '#06B6D4',
            fontFamily: 'Inter, system-ui, sans-serif',
            portalTitle: 'Consent Manager',
          },
        });
        return;
      }
      res.json({ data: branding });
    } catch (error) {
      console.error('Error getting branding:', error);
      res.status(500).json({ error: 'Failed to get branding' });
    }
  }
);

// GET /api/v1/admin/organizations/:orgId/branding — Get branding by org ID (admin)
router.get(
  '/admin/organizations/:orgId/branding',
  adminLimiter,
  authenticateJWT,
  requirePermission('SYSTEM_CONFIG'),
  validate({ params: OrgIdParamSchema }),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const branding = await getBranding(req.params.orgId);
      res.json({ data: branding });
    } catch (error) {
      console.error('Error getting branding:', error);
      res.status(500).json({ error: 'Failed to get branding' });
    }
  }
);

// PUT /api/v1/admin/branding — Update branding for current org
router.put(
  '/admin/branding',
  adminLimiter,
  authenticateJWT,
  requirePermission('SYSTEM_CONFIG'),
  validate({ body: UpdateBrandingSchema }),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const orgId = (req as any).orgId || '00000000-0000-0000-0000-000000000001';
      const branding = await upsertBranding(orgId, req.body);
      res.json({ data: branding });
    } catch (error) {
      console.error('Error updating branding:', error);
      res.status(500).json({ error: 'Failed to update branding' });
    }
  }
);

export default router;
