import { pool } from '../db';

// ============================================================
// Organization Repository
// ============================================================

export interface Organization {
  orgId: string;
  name: string;
  slug: string;
  displayName: string | null;
  domain: string | null;
  plan: string;
  status: string;
  settings: Record<string, unknown>;
  maxApiKeys: number;
  maxUsers: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
}

export interface CreateOrganizationParams {
  name: string;
  slug: string;
  displayName?: string;
  domain?: string;
  plan?: string;
  settings?: Record<string, unknown>;
  createdBy?: string;
}

export interface UpdateOrganizationParams {
  name?: string;
  displayName?: string;
  domain?: string;
  plan?: string;
  status?: string;
  settings?: Record<string, unknown>;
  maxApiKeys?: number;
  maxUsers?: number;
}

function mapRow(row: any): Organization {
  return {
    orgId: row.org_id,
    name: row.name,
    slug: row.slug,
    displayName: row.display_name,
    domain: row.domain,
    plan: row.plan,
    status: row.status,
    settings: row.settings || {},
    maxApiKeys: row.max_api_keys,
    maxUsers: row.max_users,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
  };
}

export async function createOrganization(params: CreateOrganizationParams): Promise<Organization> {
  const { rows } = await pool.query(
    `INSERT INTO organizations (name, slug, display_name, domain, plan, settings, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      params.name,
      params.slug,
      params.displayName || null,
      params.domain || null,
      params.plan || 'free',
      JSON.stringify(params.settings || {}),
      params.createdBy || null,
    ]
  );
  return mapRow(rows[0]);
}

export async function getOrganizationById(orgId: string): Promise<Organization | null> {
  const { rows } = await pool.query('SELECT * FROM organizations WHERE org_id = $1', [orgId]);
  return rows.length > 0 ? mapRow(rows[0]) : null;
}

export async function getOrganizationBySlug(slug: string): Promise<Organization | null> {
  const { rows } = await pool.query('SELECT * FROM organizations WHERE slug = $1', [slug]);
  return rows.length > 0 ? mapRow(rows[0]) : null;
}

export async function updateOrganization(
  orgId: string,
  params: UpdateOrganizationParams
): Promise<Organization | null> {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  const fieldMap: Record<string, string> = {
    name: 'name',
    displayName: 'display_name',
    domain: 'domain',
    plan: 'plan',
    status: 'status',
    maxApiKeys: 'max_api_keys',
    maxUsers: 'max_users',
  };

  for (const [key, col] of Object.entries(fieldMap)) {
    if ((params as any)[key] !== undefined) {
      setClauses.push(`${col} = $${paramIndex++}`);
      values.push((params as any)[key]);
    }
  }

  if (params.settings !== undefined) {
    setClauses.push(`settings = $${paramIndex++}`);
    values.push(JSON.stringify(params.settings));
  }

  if (setClauses.length === 0) return getOrganizationById(orgId);

  setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(orgId);

  const { rows } = await pool.query(
    `UPDATE organizations SET ${setClauses.join(', ')} WHERE org_id = $${paramIndex} RETURNING *`,
    values
  );
  return rows.length > 0 ? mapRow(rows[0]) : null;
}

export async function getAllOrganizations(params?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<{ organizations: Organization[]; pagination: { total: number; page: number; limit: number } }> {
  const page = params?.page || 1;
  const limit = params?.limit || 20;
  const offset = (page - 1) * limit;

  let whereClause = '';
  const values: unknown[] = [];

  if (params?.status) {
    whereClause = 'WHERE status = $1';
    values.push(params.status);
  }

  const countResult = await pool.query(`SELECT COUNT(*) FROM organizations ${whereClause}`, values);
  const total = parseInt(countResult.rows[0].count, 10);

  const dataValues = [...values, limit, offset];
  const { rows } = await pool.query(
    `SELECT * FROM organizations ${whereClause} ORDER BY created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
    dataValues
  );

  return {
    organizations: rows.map(mapRow),
    pagination: { total, page, limit },
  };
}

export async function deleteOrganization(orgId: string): Promise<boolean> {
  const { rowCount } = await pool.query('DELETE FROM organizations WHERE org_id = $1', [orgId]);
  return (rowCount ?? 0) > 0;
}
