import { Router, Request, Response } from 'express';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/jwtAuth';
import { requirePermission } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import {
  createApiKey,
  getApiKeysByOrgId,
  getApiKeyById,
  updateApiKey,
  deleteApiKey,
  countApiKeysByOrg,
} from '../repositories/apiKeyRepo';
import { getOrganizationById } from '../repositories/organizationRepo';
import {
  CreateApiKeySchema,
  UpdateApiKeySchema,
  ApiKeyIdParamSchema,
} from '../schemas/apiKeySchemas';

const router = Router();
const adminLimiter = require('express-rate-limit').default({ windowMs: 60000, max: 30 });

// GET /api/v1/api-keys — List API keys for user's org
router.get(
  '/api-keys',
  adminLimiter,
  authenticateJWT,
  requirePermission('SYSTEM_CONFIG'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const orgId = (req as any).orgId || '00000000-0000-0000-0000-000000000001';
      const keys = await getApiKeysByOrgId(orgId);
      // Never return the hash
      res.json({ data: keys });
    } catch (error) {
      console.error('Error listing API keys:', error);
      res.status(500).json({ error: 'Failed to list API keys' });
    }
  }
);

// POST /api/v1/api-keys — Create a new API key
router.post(
  '/api-keys',
  adminLimiter,
  authenticateJWT,
  requirePermission('SYSTEM_CONFIG'),
  validate({ body: CreateApiKeySchema }),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const orgId = (req as any).orgId || '00000000-0000-0000-0000-000000000001';

      // Check org exists and key limit
      const org = await getOrganizationById(orgId);
      if (!org) {
        res.status(404).json({ error: 'Organization not found' });
        return;
      }

      const keyCount = await countApiKeysByOrg(orgId);
      if (keyCount >= org.maxApiKeys) {
        res.status(409).json({
          error: 'API key limit reached',
          message: `Maximum ${org.maxApiKeys} API keys allowed. Delete unused keys first.`,
        });
        return;
      }

      const { apiKey, rawKey } = await createApiKey({
        orgId,
        name: req.body.name,
        scopes: req.body.scopes,
        rateLimit: req.body.rateLimit,
        expiresAt: req.body.expiresAt,
        createdBy: req.user?.userId,
        metadata: req.body.metadata,
      });

      // Return the raw key ONLY on creation (cannot be retrieved later)
      res.status(201).json({
        data: apiKey,
        rawKey,
        message: 'Save this API key securely. It cannot be retrieved again.',
      });
    } catch (error) {
      console.error('Error creating API key:', error);
      res.status(500).json({ error: 'Failed to create API key' });
    }
  }
);

// PATCH /api/v1/api-keys/:keyId — Update API key
router.patch(
  '/api-keys/:keyId',
  adminLimiter,
  authenticateJWT,
  requirePermission('SYSTEM_CONFIG'),
  validate({ params: ApiKeyIdParamSchema, body: UpdateApiKeySchema }),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const orgId = (req as any).orgId || '00000000-0000-0000-0000-000000000001';

      // Verify key belongs to user's org
      const existing = await getApiKeyById(req.params.keyId);
      if (!existing || existing.orgId !== orgId) {
        res.status(404).json({ error: 'API key not found' });
        return;
      }

      const updated = await updateApiKey(req.params.keyId, req.body);
      res.json({ data: updated });
    } catch (error) {
      console.error('Error updating API key:', error);
      res.status(500).json({ error: 'Failed to update API key' });
    }
  }
);

// DELETE /api/v1/api-keys/:keyId — Revoke/delete API key
router.delete(
  '/api-keys/:keyId',
  adminLimiter,
  authenticateJWT,
  requirePermission('SYSTEM_CONFIG'),
  validate({ params: ApiKeyIdParamSchema }),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const orgId = (req as any).orgId || '00000000-0000-0000-0000-000000000001';

      // Verify key belongs to user's org
      const existing = await getApiKeyById(req.params.keyId);
      if (!existing || existing.orgId !== orgId) {
        res.status(404).json({ error: 'API key not found' });
        return;
      }

      await deleteApiKey(req.params.keyId);
      res.json({ message: 'API key deleted' });
    } catch (error) {
      console.error('Error deleting API key:', error);
      res.status(500).json({ error: 'Failed to delete API key' });
    }
  }
);

export default router;
