import { Request, Response, NextFunction } from 'express';
import { ApiKeyAuthenticatedRequest } from './apiKeyAuth';

// ============================================================
// Organization Context Middleware
// Extracts org_id from API key or user context and attaches to request.
// ============================================================

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

export interface OrgContextRequest extends Request {
  orgId?: string;
  apiKey?: ApiKeyAuthenticatedRequest['apiKey'];
  user?: any;
}

/**
 * Extract organization context from request.
 * Priority:
 * 1. API key → org_id from key
 * 2. JWT user → org_id from user record
 * 3. Default org (backward compatibility)
 */
export const extractOrgContext = (
  req: OrgContextRequest,
  _res: Response,
  next: NextFunction
): void => {
  // If API key auth already set orgId, use it
  if (req.orgId) {
    next();
    return;
  }

  // If JWT user has org_id, use it
  if (req.user?.orgId) {
    req.orgId = req.user.orgId;
    next();
    return;
  }

  // Fallback to default org for backward compatibility
  req.orgId = DEFAULT_ORG_ID;
  next();
};

/**
 * Require that org context is present.
 * Should be used after extractOrgContext.
 */
export const requireOrgContext = (
  req: OrgContextRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.orgId) {
    res.status(400).json({
      error: 'Organization context required',
      message: 'Unable to determine organization context from the request',
    });
    return;
  }
  next();
};
