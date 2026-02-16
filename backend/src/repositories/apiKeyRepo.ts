import { pool } from '../db';
import crypto from 'crypto';

// ============================================================
// API Key Repository
// ============================================================

export interface ApiKey {
  keyId: string;
  orgId: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  rateLimit: number;
  isActive: boolean;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  createdBy: string | null;
  metadata: Record<string, unknown>;
}

export interface ApiKeyWithHash extends ApiKey {
  keyHash: string;
}

export interface CreateApiKeyParams {
  orgId: string;
  name: string;
  scopes?: string[];
  rateLimit?: number;
  expiresAt?: string;
  createdBy?: string;
  metadata?: Record<string, unknown>;
}

function mapRow(row: any): ApiKey {
  return {
    keyId: row.key_id,
    orgId: row.org_id,
    name: row.name,
    keyPrefix: row.key_prefix,
    scopes: row.scopes || [],
    rateLimit: row.rate_limit,
    isActive: row.is_active,
    lastUsedAt: row.last_used_at,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    createdBy: row.created_by,
    metadata: row.metadata || {},
  };
}

/**
 * Generate a new API key with format: cm_live_{32 random hex chars}
 * Returns { rawKey, keyPrefix, keyHash }
 */
export function generateApiKey(): { rawKey: string; keyPrefix: string; keyHash: string } {
  const randomPart = crypto.randomBytes(32).toString('hex');
  const rawKey = `cm_live_${randomPart}`;
  const keyPrefix = rawKey.substring(0, 16); // "cm_live_" + first 8 hex chars
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
  return { rawKey, keyPrefix, keyHash };
}

/**
 * Hash a raw API key for lookup
 */
export function hashApiKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}

export async function createApiKey(
  params: CreateApiKeyParams
): Promise<{ apiKey: ApiKey; rawKey: string }> {
  const { rawKey, keyPrefix, keyHash } = generateApiKey();

  const { rows } = await pool.query(
    `INSERT INTO api_keys (org_id, name, key_prefix, key_hash, scopes, rate_limit, expires_at, created_by, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      params.orgId,
      params.name,
      keyPrefix,
      keyHash,
      JSON.stringify(params.scopes || ['consent:read', 'consent:write', 'processing:validate']),
      params.rateLimit || 1000,
      params.expiresAt || null,
      params.createdBy || null,
      JSON.stringify(params.metadata || {}),
    ]
  );

  return { apiKey: mapRow(rows[0]), rawKey };
}

export async function getApiKeyByHash(keyHash: string): Promise<ApiKeyWithHash | null> {
  const { rows } = await pool.query(
    'SELECT * FROM api_keys WHERE key_hash = $1',
    [keyHash]
  );
  if (rows.length === 0) return null;
  return { ...mapRow(rows[0]), keyHash: rows[0].key_hash };
}

export async function getApiKeyById(keyId: string): Promise<ApiKey | null> {
  const { rows } = await pool.query('SELECT * FROM api_keys WHERE key_id = $1', [keyId]);
  return rows.length > 0 ? mapRow(rows[0]) : null;
}

export async function getApiKeysByOrgId(orgId: string): Promise<ApiKey[]> {
  const { rows } = await pool.query(
    'SELECT * FROM api_keys WHERE org_id = $1 ORDER BY created_at DESC',
    [orgId]
  );
  return rows.map(mapRow);
}

export async function updateApiKey(
  keyId: string,
  params: { name?: string; scopes?: string[]; rateLimit?: number; isActive?: boolean }
): Promise<ApiKey | null> {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (params.name !== undefined) {
    setClauses.push(`name = $${paramIndex++}`);
    values.push(params.name);
  }
  if (params.scopes !== undefined) {
    setClauses.push(`scopes = $${paramIndex++}`);
    values.push(JSON.stringify(params.scopes));
  }
  if (params.rateLimit !== undefined) {
    setClauses.push(`rate_limit = $${paramIndex++}`);
    values.push(params.rateLimit);
  }
  if (params.isActive !== undefined) {
    setClauses.push(`is_active = $${paramIndex++}`);
    values.push(params.isActive);
  }

  if (setClauses.length === 0) return getApiKeyById(keyId);

  values.push(keyId);
  const { rows } = await pool.query(
    `UPDATE api_keys SET ${setClauses.join(', ')} WHERE key_id = $${paramIndex} RETURNING *`,
    values
  );
  return rows.length > 0 ? mapRow(rows[0]) : null;
}

export async function deleteApiKey(keyId: string): Promise<boolean> {
  const { rowCount } = await pool.query('DELETE FROM api_keys WHERE key_id = $1', [keyId]);
  return (rowCount ?? 0) > 0;
}

export async function updateLastUsed(keyId: string): Promise<void> {
  await pool.query('UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE key_id = $1', [keyId]);
}

export async function countApiKeysByOrg(orgId: string): Promise<number> {
  const { rows } = await pool.query('SELECT COUNT(*) FROM api_keys WHERE org_id = $1', [orgId]);
  return parseInt(rows[0].count, 10);
}
