import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { getApiKeyByHash, updateLastUsed } from '../repositories/apiKeyRepo';

// ============================================================
// API Key Authentication Middleware (Per-Organization)
// ============================================================

export interface ApiKeyAuthenticatedRequest extends Request {
  apiKey?: {
    keyId: string;
    orgId: string;
    scopes: string[];
    rateLimit: number;
  };
  orgId?: string;
}

/**
 * Authenticate requests using per-organization API keys.
 * Looks up key hash in DB, validates active/not-expired, sets req.apiKey and req.orgId.
 * Falls through if no API key provided (allows JWT auth to handle it).
 */
export const authenticateApiKey = async (
  req: ApiKeyAuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const apiKeyHeader = req.headers['x-api-key'];

  if (!apiKeyHeader || typeof apiKeyHeader !== 'string') {
    // No API key provided — fall through to JWT auth
    next();
    return;
  }

  try {
    // Validate key format
    if (!apiKeyHeader.startsWith('cm_live_')) {
      res.status(401).json({
        error: 'Invalid API key format',
        message: 'API keys must start with "cm_live_"',
      });
      return;
    }

    // Hash and lookup
    const keyHash = crypto.createHash('sha256').update(apiKeyHeader).digest('hex');
    const apiKey = await getApiKeyByHash(keyHash);

    if (!apiKey) {
      res.status(401).json({
        error: 'Invalid API key',
        message: 'The provided API key is not valid',
      });
      return;
    }

    if (!apiKey.isActive) {
      res.status(401).json({
        error: 'API key deactivated',
        message: 'This API key has been deactivated',
      });
      return;
    }

    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
      res.status(401).json({
        error: 'API key expired',
        message: 'This API key has expired',
      });
      return;
    }

    // Set request context
    req.apiKey = {
      keyId: apiKey.keyId,
      orgId: apiKey.orgId,
      scopes: apiKey.scopes,
      rateLimit: apiKey.rateLimit,
    };
    req.orgId = apiKey.orgId;

    // Update last used (fire-and-forget)
    updateLastUsed(apiKey.keyId).catch(() => {});

    next();
  } catch (error) {
    console.error('API key authentication error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
};

/**
 * Require a specific API key scope.
 * Must be used after authenticateApiKey middleware.
 */
export const requireScope = (scope: string) => {
  return (req: ApiKeyAuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.apiKey) {
      res.status(401).json({
        error: 'API key required',
        message: 'This endpoint requires API key authentication',
      });
      return;
    }

    if (!req.apiKey.scopes.includes(scope)) {
      res.status(403).json({
        error: 'Insufficient scope',
        message: `This API key does not have the required scope: ${scope}`,
        requiredScope: scope,
        currentScopes: req.apiKey.scopes,
      });
      return;
    }

    next();
  };
};

/**
 * Require any of the listed API key scopes.
 */
export const requireAnyScope = (scopes: string[]) => {
  return (req: ApiKeyAuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.apiKey) {
      res.status(401).json({
        error: 'API key required',
        message: 'This endpoint requires API key authentication',
      });
      return;
    }

    const hasScope = scopes.some((s) => req.apiKey!.scopes.includes(s));
    if (!hasScope) {
      res.status(403).json({
        error: 'Insufficient scope',
        message: `This API key requires one of: ${scopes.join(', ')}`,
        requiredScopes: scopes,
        currentScopes: req.apiKey.scopes,
      });
      return;
    }

    next();
  };
};
