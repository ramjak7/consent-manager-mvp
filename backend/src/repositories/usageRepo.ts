import { pool } from '../db';

// ============================================================
// Usage Events Repository (Analytics & Billing Metering)
// ============================================================

export interface UsageEvent {
  eventId: string;
  orgId: string;
  eventType: string;
  endpoint: string | null;
  method: string | null;
  statusCode: number | null;
  responseTimeMs: number | null;
  userId: string | null;
  apiKeyId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface UsageSummary {
  day: string;
  eventType: string;
  eventCount: number;
  avgResponseMs: number;
  maxResponseMs: number;
}

export interface UsageStats {
  totalApiCalls: number;
  totalConsentsCollected: number;
  totalConsentsRevoked: number;
  totalErasureRequests: number;
  avgResponseTimeMs: number;
}

function mapRow(row: any): UsageEvent {
  return {
    eventId: row.event_id,
    orgId: row.org_id,
    eventType: row.event_type,
    endpoint: row.endpoint,
    method: row.method,
    statusCode: row.status_code,
    responseTimeMs: row.response_time_ms,
    userId: row.user_id,
    apiKeyId: row.api_key_id,
    metadata: row.metadata || {},
    createdAt: row.created_at,
  };
}

export async function recordUsageEvent(params: {
  orgId: string;
  eventType: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  responseTimeMs?: number;
  userId?: string;
  apiKeyId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await pool.query(
    `INSERT INTO usage_events (org_id, event_type, endpoint, method, status_code, response_time_ms, user_id, api_key_id, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      params.orgId,
      params.eventType,
      params.endpoint || null,
      params.method || null,
      params.statusCode || null,
      params.responseTimeMs || null,
      params.userId || null,
      params.apiKeyId || null,
      JSON.stringify(params.metadata || {}),
    ]
  );
}

export async function getUsageSummary(
  orgId: string,
  params?: { startDate?: string; endDate?: string; eventType?: string }
): Promise<UsageSummary[]> {
  let whereClause = 'WHERE org_id = $1';
  const values: unknown[] = [orgId];
  let paramIndex = 2;

  if (params?.startDate) {
    whereClause += ` AND created_at >= $${paramIndex++}`;
    values.push(params.startDate);
  }
  if (params?.endDate) {
    whereClause += ` AND created_at <= $${paramIndex++}`;
    values.push(params.endDate);
  }
  if (params?.eventType) {
    whereClause += ` AND event_type = $${paramIndex++}`;
    values.push(params.eventType);
  }

  const { rows } = await pool.query(
    `SELECT
       DATE(created_at) AS day,
       event_type,
       COUNT(*) AS event_count,
       COALESCE(AVG(response_time_ms)::INTEGER, 0) AS avg_response_ms,
       COALESCE(MAX(response_time_ms), 0) AS max_response_ms
     FROM usage_events ${whereClause}
     GROUP BY DATE(created_at), event_type
     ORDER BY day DESC, event_type`,
    values
  );

  return rows.map((row: any) => ({
    day: row.day,
    eventType: row.event_type,
    eventCount: parseInt(row.event_count, 10),
    avgResponseMs: row.avg_response_ms,
    maxResponseMs: row.max_response_ms,
  }));
}

export async function getUsageStats(
  orgId: string,
  days: number = 30
): Promise<UsageStats> {
  const { rows } = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE event_type = 'api_call') AS total_api_calls,
       COUNT(*) FILTER (WHERE event_type = 'consent_collected') AS total_consents_collected,
       COUNT(*) FILTER (WHERE event_type = 'consent_revoked') AS total_consents_revoked,
       COUNT(*) FILTER (WHERE event_type = 'erasure_requested') AS total_erasure_requests,
       COALESCE(AVG(response_time_ms) FILTER (WHERE event_type = 'api_call')::INTEGER, 0) AS avg_response_ms
     FROM usage_events
     WHERE org_id = $1 AND created_at >= NOW() - INTERVAL '1 day' * $2`,
    [orgId, days]
  );

  const row = rows[0];
  return {
    totalApiCalls: parseInt(row.total_api_calls, 10),
    totalConsentsCollected: parseInt(row.total_consents_collected, 10),
    totalConsentsRevoked: parseInt(row.total_consents_revoked, 10),
    totalErasureRequests: parseInt(row.total_erasure_requests, 10),
    avgResponseTimeMs: row.avg_response_ms,
  };
}

export async function getRecentUsageEvents(
  orgId: string,
  params?: { limit?: number; eventType?: string }
): Promise<UsageEvent[]> {
  const limit = params?.limit || 50;
  let whereClause = 'WHERE org_id = $1';
  const values: unknown[] = [orgId];

  if (params?.eventType) {
    whereClause += ' AND event_type = $2';
    values.push(params.eventType);
  }

  values.push(limit);
  const { rows } = await pool.query(
    `SELECT * FROM usage_events ${whereClause} ORDER BY created_at DESC LIMIT $${values.length}`,
    values
  );
  return rows.map(mapRow);
}
