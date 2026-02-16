import { Router, Response } from 'express';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/jwtAuth';
import { requirePermission } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import {
  createSamlConfig,
  getSamlConfigByOrg,
  updateSamlConfig,
  deleteSamlConfig,
} from '../repositories/samlConfigRepo';
import { CreateSamlConfigSchema, UpdateSamlConfigSchema } from '../schemas/samlSchemas';

const router = Router();
const adminLimiter = require('express-rate-limit').default({ windowMs: 60000, max: 30 });

// GET /api/v1/admin/sso/saml — Get SAML config for current org
router.get(
  '/admin/sso/saml',
  adminLimiter,
  authenticateJWT,
  requirePermission('SYSTEM_CONFIG'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const orgId = (req as any).orgId || '00000000-0000-0000-0000-000000000001';
      const config = await getSamlConfigByOrg(orgId);
      if (!config) {
        res.json({ data: null, message: 'No SAML configuration found' });
        return;
      }
      // Mask certificate for security
      res.json({
        data: {
          ...config,
          idpCertificate: config.idpCertificate
            ? `${config.idpCertificate.substring(0, 50)}... (${config.idpCertificate.length} chars)`
            : null,
        },
      });
    } catch (error) {
      console.error('Error getting SAML config:', error);
      res.status(500).json({ error: 'Failed to get SAML configuration' });
    }
  }
);

// POST /api/v1/admin/sso/saml — Create SAML config
router.post(
  '/admin/sso/saml',
  adminLimiter,
  authenticateJWT,
  requirePermission('SYSTEM_CONFIG'),
  validate({ body: CreateSamlConfigSchema }),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const orgId = (req as any).orgId || '00000000-0000-0000-0000-000000000001';

      // Check if config already exists
      const existing = await getSamlConfigByOrg(orgId);
      if (existing) {
        res.status(409).json({
          error: 'SAML configuration already exists',
          message: 'Use PATCH to update the existing configuration',
        });
        return;
      }

      const config = await createSamlConfig({
        orgId,
        ...req.body,
      });

      res.status(201).json({
        data: config,
        message: 'SAML configuration created. Set isActive to true to enable SSO.',
      });
    } catch (error) {
      console.error('Error creating SAML config:', error);
      res.status(500).json({ error: 'Failed to create SAML configuration' });
    }
  }
);

// PATCH /api/v1/admin/sso/saml — Update SAML config
router.patch(
  '/admin/sso/saml',
  adminLimiter,
  authenticateJWT,
  requirePermission('SYSTEM_CONFIG'),
  validate({ body: UpdateSamlConfigSchema }),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const orgId = (req as any).orgId || '00000000-0000-0000-0000-000000000001';

      const existing = await getSamlConfigByOrg(orgId);
      if (!existing) {
        res.status(404).json({ error: 'No SAML configuration found. Create one first.' });
        return;
      }

      const config = await updateSamlConfig(orgId, req.body);
      res.json({ data: config });
    } catch (error) {
      console.error('Error updating SAML config:', error);
      res.status(500).json({ error: 'Failed to update SAML configuration' });
    }
  }
);

// DELETE /api/v1/admin/sso/saml — Delete SAML config
router.delete(
  '/admin/sso/saml',
  adminLimiter,
  authenticateJWT,
  requirePermission('SYSTEM_CONFIG'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const orgId = (req as any).orgId || '00000000-0000-0000-0000-000000000001';
      const deleted = await deleteSamlConfig(orgId);
      if (!deleted) {
        res.status(404).json({ error: 'No SAML configuration found' });
        return;
      }
      res.json({ message: 'SAML configuration deleted. SSO has been disabled.' });
    } catch (error) {
      console.error('Error deleting SAML config:', error);
      res.status(500).json({ error: 'Failed to delete SAML configuration' });
    }
  }
);

// POST /api/v1/admin/sso/saml/test — Test SAML config (dry run)
router.post(
  '/admin/sso/saml/test',
  adminLimiter,
  authenticateJWT,
  requirePermission('SYSTEM_CONFIG'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const orgId = (req as any).orgId || '00000000-0000-0000-0000-000000000001';
      const config = await getSamlConfigByOrg(orgId);
      if (!config) {
        res.status(404).json({ error: 'No SAML configuration found' });
        return;
      }

      // Validate certificate format
      const certValid = config.idpCertificate.includes('BEGIN CERTIFICATE');

      // Validate URL format
      const ssoUrlValid = config.idpSsoUrl.startsWith('https://');

      const issues: string[] = [];
      if (!certValid) issues.push('Certificate does not appear to be in PEM format');
      if (!ssoUrlValid) issues.push('SSO URL should use HTTPS');
      if (!config.isActive) issues.push('SAML is not yet activated');

      res.json({
        data: {
          configId: config.configId,
          idpEntityId: config.idpEntityId,
          idpSsoUrl: config.idpSsoUrl,
          isActive: config.isActive,
          certificateValid: certValid,
          ssoUrlValid,
          issues,
          status: issues.length === 0 ? 'ready' : 'issues_found',
        },
      });
    } catch (error) {
      console.error('Error testing SAML config:', error);
      res.status(500).json({ error: 'Failed to test SAML configuration' });
    }
  }
);

export default router;
