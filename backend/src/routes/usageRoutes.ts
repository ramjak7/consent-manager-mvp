import { Router, Response } from 'express';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/jwtAuth';
import { requirePermission } from '../middleware/rbac';
import {
  getUsageSummary,
  getUsageStats,
  getRecentUsageEvents,
} from '../repositories/usageRepo';

const router = Router();
const adminLimiter = require('express-rate-limit').default({ windowMs: 60000, max: 30 });

// GET /api/v1/admin/usage/stats — Get usage statistics
router.get(
  '/admin/usage/stats',
  adminLimiter,
  authenticateJWT,
  requirePermission('SYSTEM_MONITOR'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const orgId = (req as any).orgId || '00000000-0000-0000-0000-000000000001';
      const days = req.query.days ? parseInt(req.query.days as string, 10) : 30;
      const stats = await getUsageStats(orgId, days);
      res.json({ data: stats, period: `${days} days` });
    } catch (error) {
      console.error('Error getting usage stats:', error);
      res.status(500).json({ error: 'Failed to get usage statistics' });
    }
  }
);

// GET /api/v1/admin/usage/summary — Get daily usage summary
router.get(
  '/admin/usage/summary',
  adminLimiter,
  authenticateJWT,
  requirePermission('SYSTEM_MONITOR'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const orgId = (req as any).orgId || '00000000-0000-0000-0000-000000000001';
      const { startDate, endDate, eventType } = req.query;
      const summary = await getUsageSummary(orgId, {
        startDate: startDate as string,
        endDate: endDate as string,
        eventType: eventType as string,
      });
      res.json({ data: summary });
    } catch (error) {
      console.error('Error getting usage summary:', error);
      res.status(500).json({ error: 'Failed to get usage summary' });
    }
  }
);

// GET /api/v1/admin/usage/events — Get recent usage events
router.get(
  '/admin/usage/events',
  adminLimiter,
  authenticateJWT,
  requirePermission('SYSTEM_MONITOR'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const orgId = (req as any).orgId || '00000000-0000-0000-0000-000000000001';
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const eventType = req.query.eventType as string;
      const events = await getRecentUsageEvents(orgId, { limit, eventType });
      res.json({ data: events });
    } catch (error) {
      console.error('Error getting usage events:', error);
      res.status(500).json({ error: 'Failed to get usage events' });
    }
  }
);

export default router;
