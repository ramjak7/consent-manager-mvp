import { pool } from '../db';

// ============================================================
// Consent Notice Repository (Notice Builder)
// ============================================================

export interface ConsentNotice {
  noticeId: string;
  orgId: string;
  title: string;
  slug: string;
  version: number;
  description: string | null;
  content: Record<string, { title: string; body: string; summary?: string }>;
  purposes: string[];
  dataCategories: string[];
  retentionDays: number | null;
  status: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
}

export interface CreateNoticeParams {
  orgId: string;
  title: string;
  slug: string;
  description?: string;
  content: Record<string, unknown>;
  purposes?: string[];
  dataCategories?: string[];
  retentionDays?: number;
  createdBy?: string;
}

function mapRow(row: any): ConsentNotice {
  return {
    noticeId: row.notice_id,
    orgId: row.org_id,
    title: row.title,
    slug: row.slug,
    version: row.version,
    description: row.description,
    content: row.content || {},
    purposes: row.purposes || [],
    dataCategories: row.data_categories || [],
    retentionDays: row.retention_days,
    status: row.status,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
  };
}

export async function createNotice(params: CreateNoticeParams): Promise<ConsentNotice> {
  const { rows } = await pool.query(
    `INSERT INTO consent_notices (org_id, title, slug, description, content, purposes, data_categories, retention_days, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      params.orgId,
      params.title,
      params.slug,
      params.description || null,
      JSON.stringify(params.content),
      JSON.stringify(params.purposes || []),
      JSON.stringify(params.dataCategories || []),
      params.retentionDays || null,
      params.createdBy || null,
    ]
  );
  return mapRow(rows[0]);
}

export async function getNoticeById(noticeId: string): Promise<ConsentNotice | null> {
  const { rows } = await pool.query(
    'SELECT * FROM consent_notices WHERE notice_id = $1',
    [noticeId]
  );
  return rows.length > 0 ? mapRow(rows[0]) : null;
}

export async function getNoticesByOrg(
  orgId: string,
  params?: { status?: string; page?: number; limit?: number }
): Promise<{ notices: ConsentNotice[]; pagination: { total: number; page: number; limit: number } }> {
  const page = params?.page || 1;
  const limit = params?.limit || 20;
  const offset = (page - 1) * limit;

  let whereClause = 'WHERE org_id = $1';
  const values: unknown[] = [orgId];

  if (params?.status) {
    whereClause += ' AND status = $2';
    values.push(params.status);
  }

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM consent_notices ${whereClause}`,
    values
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const dataValues = [...values, limit, offset];
  const { rows } = await pool.query(
    `SELECT * FROM consent_notices ${whereClause} ORDER BY updated_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
    dataValues
  );

  return {
    notices: rows.map(mapRow),
    pagination: { total, page, limit },
  };
}

export async function updateNotice(
  noticeId: string,
  params: Partial<{
    title: string;
    description: string;
    content: Record<string, unknown>;
    purposes: string[];
    dataCategories: string[];
    retentionDays: number;
    status: string;
  }>
): Promise<ConsentNotice | null> {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  const simpleFields: Record<string, string> = {
    title: 'title',
    description: 'description',
    retentionDays: 'retention_days',
    status: 'status',
  };

  for (const [key, col] of Object.entries(simpleFields)) {
    if ((params as any)[key] !== undefined) {
      setClauses.push(`${col} = $${paramIndex++}`);
      values.push((params as any)[key]);
    }
  }

  const jsonFields: Record<string, string> = {
    content: 'content',
    purposes: 'purposes',
    dataCategories: 'data_categories',
  };

  for (const [key, col] of Object.entries(jsonFields)) {
    if ((params as any)[key] !== undefined) {
      setClauses.push(`${col} = $${paramIndex++}`);
      values.push(JSON.stringify((params as any)[key]));
    }
  }

  if (params.status === 'published') {
    setClauses.push(`published_at = CURRENT_TIMESTAMP`);
  }

  if (setClauses.length === 0) return getNoticeById(noticeId);

  setClauses.push('updated_at = CURRENT_TIMESTAMP');
  values.push(noticeId);

  const { rows } = await pool.query(
    `UPDATE consent_notices SET ${setClauses.join(', ')} WHERE notice_id = $${paramIndex} RETURNING *`,
    values
  );
  return rows.length > 0 ? mapRow(rows[0]) : null;
}

export async function createNoticeVersion(
  orgId: string,
  slug: string,
  params: Omit<CreateNoticeParams, 'orgId' | 'slug'>
): Promise<ConsentNotice> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get latest version
    const { rows: versionRows } = await client.query(
      'SELECT MAX(version) as max_version FROM consent_notices WHERE org_id = $1 AND slug = $2',
      [orgId, slug]
    );
    const nextVersion = (versionRows[0]?.max_version || 0) + 1;

    // Archive previous published versions
    await client.query(
      `UPDATE consent_notices SET status = 'archived', updated_at = CURRENT_TIMESTAMP
       WHERE org_id = $1 AND slug = $2 AND status = 'published'`,
      [orgId, slug]
    );

    // Create new version
    const { rows } = await client.query(
      `INSERT INTO consent_notices (org_id, title, slug, version, description, content, purposes, data_categories, retention_days, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        orgId,
        params.title,
        slug,
        nextVersion,
        params.description || null,
        JSON.stringify(params.content),
        JSON.stringify(params.purposes || []),
        JSON.stringify(params.dataCategories || []),
        params.retentionDays || null,
        params.createdBy || null,
      ]
    );

    await client.query('COMMIT');
    return mapRow(rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function getPublishedNotice(orgId: string, slug: string): Promise<ConsentNotice | null> {
  const { rows } = await pool.query(
    `SELECT * FROM consent_notices WHERE org_id = $1 AND slug = $2 AND status = 'published' ORDER BY version DESC LIMIT 1`,
    [orgId, slug]
  );
  return rows.length > 0 ? mapRow(rows[0]) : null;
}

export async function deleteNotice(noticeId: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    `DELETE FROM consent_notices WHERE notice_id = $1 AND status = 'draft'`,
    [noticeId]
  );
  return (rowCount ?? 0) > 0;
}
