import { pool } from "../db";
import { v4 as uuidv4 } from "uuid";

export interface CorrectionRequest {
  requestId: string;
  userId: string;
  fieldName: string;
  currentValue?: string;
  correctedValue: string;
  reason: string;
  additionalNotes?: string;
  status: "PENDING" | "IN_PROGRESS" | "APPROVED" | "REJECTED" | "COMPLETED";
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
  reviewerId?: string;
  reviewNotes?: string;
  completedAt?: string;
}

export interface CreateCorrectionRequestParams {
  userId: string;
  fieldName: string;
  currentValue?: string;
  correctedValue: string;
  reason: string;
  additionalNotes?: string;
}

export interface UpdateCorrectionRequestStatusParams {
  requestId: string;
  status: "IN_PROGRESS" | "APPROVED" | "REJECTED" | "COMPLETED";
  reviewerId?: string;
  reviewNotes?: string;
}

const SELECT_COLUMNS = `
  request_id as "requestId",
  user_id as "userId",
  field_name as "fieldName",
  current_value as "currentValue",
  corrected_value as "correctedValue",
  reason,
  additional_notes as "additionalNotes",
  status,
  created_at as "createdAt",
  updated_at as "updatedAt",
  reviewed_at as "reviewedAt",
  reviewer_id as "reviewerId",
  review_notes as "reviewNotes",
  completed_at as "completedAt"
`;

/**
 * Create a new correction request
 * DPDP §11 — Data Principal submits correction request
 */
export async function createCorrectionRequest(
  params: CreateCorrectionRequestParams
): Promise<CorrectionRequest> {
  const requestId = uuidv4();
  const query = `
    INSERT INTO correction_requests (
      request_id, user_id, field_name, current_value, corrected_value, reason, additional_notes, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING')
    RETURNING ${SELECT_COLUMNS}
  `;

  const result = await pool.query(query, [
    requestId,
    params.userId,
    params.fieldName,
    params.currentValue || null,
    params.correctedValue,
    params.reason,
    params.additionalNotes || null,
  ]);

  return result.rows[0];
}

/**
 * Get all correction requests for a user
 */
export async function getUserCorrectionRequests(
  userId: string
): Promise<CorrectionRequest[]> {
  const query = `
    SELECT ${SELECT_COLUMNS}
    FROM correction_requests
    WHERE user_id = $1
    ORDER BY created_at DESC
  `;

  const result = await pool.query(query, [userId]);
  return result.rows;
}

/**
 * Get a single correction request by ID
 */
export async function getCorrectionRequestById(
  requestId: string
): Promise<CorrectionRequest | null> {
  const query = `
    SELECT ${SELECT_COLUMNS}
    FROM correction_requests
    WHERE request_id = $1
  `;

  const result = await pool.query(query, [requestId]);
  return result.rows[0] || null;
}

/**
 * Update correction request status (admin function)
 */
export async function updateCorrectionRequestStatus(
  params: UpdateCorrectionRequestStatusParams
): Promise<CorrectionRequest | null> {
  const now = new Date().toISOString();
  const completedAt = params.status === "COMPLETED" ? now : null;

  const query = `
    UPDATE correction_requests
    SET 
      status = $2,
      reviewed_at = $3,
      reviewer_id = $4,
      review_notes = $5,
      completed_at = $6,
      updated_at = $7
    WHERE request_id = $1
    RETURNING ${SELECT_COLUMNS}
  `;

  const result = await pool.query(query, [
    params.requestId,
    params.status,
    now,
    params.reviewerId || null,
    params.reviewNotes || null,
    completedAt,
    now,
  ]);

  return result.rows[0] || null;
}

/**
 * Get all correction requests (admin function)
 */
export async function getAllCorrectionRequests(params?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<{ requests: CorrectionRequest[]; pagination: any }> {
  const page = params?.page || 1;
  const limit = params?.limit || 20;
  const offset = (page - 1) * limit;

  let whereClause = "";
  const queryParams: any[] = [];

  if (params?.status) {
    whereClause = "WHERE status = $1";
    queryParams.push(params.status);
  }

  const countQuery = `
    SELECT COUNT(*) as total
    FROM correction_requests
    ${whereClause}
  `;
  const countResult = await pool.query(countQuery, queryParams);
  const total = parseInt(countResult.rows[0].total, 10);

  const dataQuery = `
    SELECT ${SELECT_COLUMNS}
    FROM correction_requests
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
  `;

  const result = await pool.query(dataQuery, [...queryParams, limit, offset]);

  return {
    requests: result.rows,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}
