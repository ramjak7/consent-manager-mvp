import { Request, Response, NextFunction } from 'express';
import { recordUsageEvent } from '../repositories/usageRepo';

// ============================================================
// Usage Tracking Middleware (Analytics & Billing Metering)
// ============================================================

export interface UsageTrackingRequest extends Request {
  orgId?: string;
  apiKey?: { keyId: string; orgId: string };
  user?: { userId: string };
  _usageStartTime?: number;
}

/**
 * Middleware to track API usage per organization.
 * Records: endpoint, method, status code, response time.
 * Fire-and-forget — never blocks the response.
 */
export const trackUsage = (
  req: UsageTrackingRequest,
  res: Response,
  next: NextFunction
): void => {
  req._usageStartTime = Date.now();

  // Hook into response finish to capture status code and timing
  const originalEnd = res.end;
  res.end = function (this: Response, ...args: any[]) {
    const responseTimeMs = Date.now() - (req._usageStartTime || Date.now());
    const orgId = req.orgId;

    if (orgId) {
      // Determine event type from the request
      const eventType = classifyEvent(req.method, req.path);

      recordUsageEvent({
        orgId,
        eventType,
        endpoint: req.path,
        method: req.method,
        statusCode: res.statusCode,
        responseTimeMs,
        userId: req.user?.userId,
        apiKeyId: req.apiKey?.keyId,
      }).catch(() => {}); // Fire-and-forget
    }

    return originalEnd.apply(this, args as any);
  } as any;

  next();
};

/**
 * Classify an API request into an event type for analytics.
 */
function classifyEvent(method: string, path: string): string {
  if (path.includes('/consents') && method === 'POST' && !path.includes('revoke') && !path.includes('expire')) {
    return 'consent_collected';
  }
  if (path.includes('/revoke')) {
    return 'consent_revoked';
  }
  if (path.includes('/process') && method === 'POST') {
    return 'processing_validated';
  }
  if (path.includes('/erasure') && method === 'POST') {
    return 'erasure_requested';
  }
  if (path.includes('/correction') && method === 'POST') {
    return 'correction_requested';
  }
  return 'api_call';
}
