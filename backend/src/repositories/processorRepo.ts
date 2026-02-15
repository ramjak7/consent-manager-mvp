import { pool } from "../db";
import { v4 as uuidv4 } from "uuid";

export interface Processor {
  processorId: string;
  name: string;
  entityType: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  country: string;
  dpaSigned: boolean;
  dpaSignedDate?: string;
  dpaExpiryDate?: string;
  authorizedPurposes: string[];
  authorizedDataCategories: string[];
  crossBorderTransfer: boolean;
  transferCountries: string[];
  status: "ACTIVE" | "SUSPENDED" | "TERMINATED" | "PENDING_REVIEW";
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  notes?: string;
}

export interface CreateProcessorParams {
  name: string;
  entityType?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  country?: string;
  dpaSigned?: boolean;
  dpaSignedDate?: string;
  dpaExpiryDate?: string;
  authorizedPurposes?: string[];
  authorizedDataCategories?: string[];
  crossBorderTransfer?: boolean;
  transferCountries?: string[];
  notes?: string;
  createdBy?: string;
}

export interface UpdateProcessorParams {
  name?: string;
  entityType?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  country?: string;
  dpaSigned?: boolean;
  dpaSignedDate?: string;
  dpaExpiryDate?: string;
  authorizedPurposes?: string[];
  authorizedDataCategories?: string[];
  crossBorderTransfer?: boolean;
  transferCountries?: string[];
  status?: "ACTIVE" | "SUSPENDED" | "TERMINATED" | "PENDING_REVIEW";
  notes?: string;
}

const SELECT_COLUMNS = `
  processor_id as "processorId",
  name,
  entity_type as "entityType",
  contact_email as "contactEmail",
  contact_phone as "contactPhone",
  address,
  country,
  dpa_signed as "dpaSigned",
  dpa_signed_date as "dpaSignedDate",
  dpa_expiry_date as "dpaExpiryDate",
  authorized_purposes as "authorizedPurposes",
  authorized_data_categories as "authorizedDataCategories",
  cross_border_transfer as "crossBorderTransfer",
  transfer_countries as "transferCountries",
  status,
  created_at as "createdAt",
  updated_at as "updatedAt",
  created_by as "createdBy",
  notes
`;

/**
 * Get all processors with optional filtering
 */
export async function getAllProcessors(params?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<{ processors: Processor[]; pagination: any }> {
  const page = params?.page || 1;
  const limit = params?.limit || 50;
  const offset = (page - 1) * limit;

  let whereClause = "";
  const queryParams: any[] = [];

  if (params?.status) {
    whereClause = "WHERE status = $1";
    queryParams.push(params.status);
  }

  const countResult = await pool.query(
    `SELECT COUNT(*) as total FROM processors ${whereClause}`,
    queryParams
  );
  const total = parseInt(countResult.rows[0].total, 10);

  const result = await pool.query(
    `SELECT ${SELECT_COLUMNS}
     FROM processors
     ${whereClause}
     ORDER BY name
     LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`,
    [...queryParams, limit, offset]
  );

  return {
    processors: result.rows,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}

/**
 * Get a single processor by ID
 */
export async function getProcessorById(
  processorId: string
): Promise<Processor | null> {
  const result = await pool.query(
    `SELECT ${SELECT_COLUMNS} FROM processors WHERE processor_id = $1`,
    [processorId]
  );
  return result.rows[0] || null;
}

/**
 * Create a new processor
 */
export async function createProcessor(
  params: CreateProcessorParams
): Promise<Processor> {
  const processorId = uuidv4();
  const result = await pool.query(
    `INSERT INTO processors (
      processor_id, name, entity_type, contact_email, contact_phone,
      address, country, dpa_signed, dpa_signed_date, dpa_expiry_date,
      authorized_purposes, authorized_data_categories,
      cross_border_transfer, transfer_countries, notes, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    RETURNING ${SELECT_COLUMNS}`,
    [
      processorId,
      params.name,
      params.entityType || "COMPANY",
      params.contactEmail || null,
      params.contactPhone || null,
      params.address || null,
      params.country || "IN",
      params.dpaSigned || false,
      params.dpaSignedDate || null,
      params.dpaExpiryDate || null,
      JSON.stringify(params.authorizedPurposes || []),
      JSON.stringify(params.authorizedDataCategories || []),
      params.crossBorderTransfer || false,
      JSON.stringify(params.transferCountries || []),
      params.notes || null,
      params.createdBy || null,
    ]
  );
  return result.rows[0];
}

/**
 * Update an existing processor
 */
export async function updateProcessor(
  processorId: string,
  params: UpdateProcessorParams
): Promise<Processor | null> {
  const setClauses: string[] = [];
  const values: any[] = [];
  let idx = 2; // $1 is processorId

  const fieldMap: Record<string, string> = {
    name: "name",
    entityType: "entity_type",
    contactEmail: "contact_email",
    contactPhone: "contact_phone",
    address: "address",
    country: "country",
    dpaSigned: "dpa_signed",
    dpaSignedDate: "dpa_signed_date",
    dpaExpiryDate: "dpa_expiry_date",
    crossBorderTransfer: "cross_border_transfer",
    status: "status",
    notes: "notes",
  };

  for (const [key, col] of Object.entries(fieldMap)) {
    if ((params as any)[key] !== undefined) {
      setClauses.push(`${col} = $${idx}`);
      values.push((params as any)[key]);
      idx++;
    }
  }

  // JSON fields need JSON.stringify
  if (params.authorizedPurposes !== undefined) {
    setClauses.push(`authorized_purposes = $${idx}`);
    values.push(JSON.stringify(params.authorizedPurposes));
    idx++;
  }
  if (params.authorizedDataCategories !== undefined) {
    setClauses.push(`authorized_data_categories = $${idx}`);
    values.push(JSON.stringify(params.authorizedDataCategories));
    idx++;
  }
  if (params.transferCountries !== undefined) {
    setClauses.push(`transfer_countries = $${idx}`);
    values.push(JSON.stringify(params.transferCountries));
    idx++;
  }

  if (setClauses.length === 0) {
    return getProcessorById(processorId);
  }

  setClauses.push(`updated_at = NOW()`);

  const result = await pool.query(
    `UPDATE processors
     SET ${setClauses.join(", ")}
     WHERE processor_id = $1
     RETURNING ${SELECT_COLUMNS}`,
    [processorId, ...values]
  );

  return result.rows[0] || null;
}
