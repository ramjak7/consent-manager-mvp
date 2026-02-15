import { pool } from "../db";
import { v4 as uuidv4 } from "uuid";

export interface Purpose {
  purposeId: string;
  code: string;
  version: number;
  name: string;
  description: string;
  legalBasis: string;
  dataCategories: string[];
  isActive: boolean;
  retentionDays: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface CreatePurposeParams {
  code: string;
  name: string;
  description: string;
  legalBasis?: string;
  dataCategories?: string[];
  retentionDays?: number;
  createdBy?: string;
}

export interface UpdatePurposeParams {
  name?: string;
  description?: string;
  legalBasis?: string;
  dataCategories?: string[];
  retentionDays?: number;
  createdBy?: string;
}

const SELECT_COLUMNS = `
  purpose_id as "purposeId",
  code,
  version,
  name,
  description,
  legal_basis as "legalBasis",
  data_categories as "dataCategories",
  is_active as "isActive",
  retention_days as "retentionDays",
  created_at as "createdAt",
  updated_at as "updatedAt",
  created_by as "createdBy"
`;

/**
 * Get all active purposes (latest version of each code)
 */
export async function getActivePurposes(): Promise<Purpose[]> {
  const result = await pool.query(
    `SELECT ${SELECT_COLUMNS}
     FROM purposes
     WHERE is_active = true
     ORDER BY code`
  );
  return result.rows;
}

/**
 * Get all versions of a specific purpose code
 */
export async function getPurposeVersions(code: string): Promise<Purpose[]> {
  const result = await pool.query(
    `SELECT ${SELECT_COLUMNS}
     FROM purposes
     WHERE code = $1
     ORDER BY version DESC`,
    [code]
  );
  return result.rows;
}

/**
 * Get a specific purpose by ID
 */
export async function getPurposeById(
  purposeId: string
): Promise<Purpose | null> {
  const result = await pool.query(
    `SELECT ${SELECT_COLUMNS}
     FROM purposes
     WHERE purpose_id = $1`,
    [purposeId]
  );
  return result.rows[0] || null;
}

/**
 * Create a new purpose (version 1)
 */
export async function createPurpose(
  params: CreatePurposeParams
): Promise<Purpose> {
  const purposeId = uuidv4();
  const result = await pool.query(
    `INSERT INTO purposes (
      purpose_id, code, version, name, description, legal_basis,
      data_categories, retention_days, created_by
    ) VALUES ($1, $2, 1, $3, $4, $5, $6, $7, $8)
    RETURNING ${SELECT_COLUMNS}`,
    [
      purposeId,
      params.code.toLowerCase().replace(/\s+/g, "_"),
      params.name,
      params.description,
      params.legalBasis || "CONSENT",
      JSON.stringify(params.dataCategories || []),
      params.retentionDays || 2555,
      params.createdBy || null,
    ]
  );
  return result.rows[0];
}

/**
 * Create a new version of an existing purpose.
 * Deactivates the previous version and creates a new one with incremented version number.
 */
export async function createPurposeVersion(
  code: string,
  params: UpdatePurposeParams
): Promise<Purpose> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Get the current active version
    const current = await client.query(
      `SELECT * FROM purposes WHERE code = $1 AND is_active = true`,
      [code]
    );

    if (current.rows.length === 0) {
      throw new Error(`No active purpose found with code: ${code}`);
    }

    const existing = current.rows[0];
    const newVersion = existing.version + 1;

    // Deactivate current version
    await client.query(
      `UPDATE purposes SET is_active = false, updated_at = NOW() WHERE purpose_id = $1`,
      [existing.purpose_id]
    );

    // Create new version
    const purposeId = uuidv4();
    const result = await client.query(
      `INSERT INTO purposes (
        purpose_id, code, version, name, description, legal_basis,
        data_categories, retention_days, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING ${SELECT_COLUMNS}`,
      [
        purposeId,
        code,
        newVersion,
        params.name || existing.name,
        params.description || existing.description,
        params.legalBasis || existing.legal_basis,
        JSON.stringify(params.dataCategories || existing.data_categories),
        params.retentionDays ?? existing.retention_days,
        params.createdBy || null,
      ]
    );

    await client.query("COMMIT");
    return result.rows[0];
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Get all purposes (active and inactive) with pagination
 */
export async function getAllPurposes(params?: {
  page?: number;
  limit?: number;
  activeOnly?: boolean;
}): Promise<{ purposes: Purpose[]; pagination: any }> {
  const page = params?.page || 1;
  const limit = params?.limit || 50;
  const offset = (page - 1) * limit;

  let whereClause = "";
  if (params?.activeOnly) {
    whereClause = "WHERE is_active = true";
  }

  const countResult = await pool.query(
    `SELECT COUNT(*) as total FROM purposes ${whereClause}`
  );
  const total = parseInt(countResult.rows[0].total, 10);

  const result = await pool.query(
    `SELECT ${SELECT_COLUMNS}
     FROM purposes
     ${whereClause}
     ORDER BY code, version DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  return {
    purposes: result.rows,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}
