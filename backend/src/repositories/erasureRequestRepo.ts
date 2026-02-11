import { pool } from "../db";
import { v4 as uuidv4 } from "uuid";

export interface ErasureRequest {
  requestId: string;
  userId: string;
  reason: string;
  additionalNotes?: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "REJECTED";
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
  reviewerId?: string;
  reviewNotes?: string;
  completedAt?: string;
}

export interface CreateErasureRequestParams {
  userId: string;
  reason: string;
  additionalNotes?: string;
}

export interface UpdateErasureRequestStatusParams {
  requestId: string;
  status: "IN_PROGRESS" | "COMPLETED" | "REJECTED";
  reviewerId?: string;
  reviewNotes?: string;
}

/**
 * Create a new erasure request
 */
export async function createErasureRequest(
  params: CreateErasureRequestParams
): Promise<ErasureRequest> {
  const requestId = uuidv4();
  const query = `
    INSERT INTO erasure_requests (
      request_id, user_id, reason, additional_notes, status
    ) VALUES ($1, $2, $3, $4, 'PENDING')
    RETURNING 
      request_id as "requestId",
      user_id as "userId",
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

  const result = await pool.query(query, [
    requestId,
    params.userId,
    params.reason,
    params.additionalNotes || null,
  ]);

  return result.rows[0];
}

/**
 * Get all erasure requests for a user
 */
export async function getUserErasureRequests(
  userId: string
): Promise<ErasureRequest[]> {
  const query = `
    SELECT 
      request_id as "requestId",
      user_id as "userId",
      reason,
      additional_notes as "additionalNotes",
      status,
      created_at as "createdAt",
      updated_at as "updatedAt",
      reviewed_at as "reviewedAt",
      reviewer_id as "reviewerId",
      review_notes as "reviewNotes",
      completed_at as "completedAt"
    FROM erasure_requests
    WHERE user_id = $1
    ORDER BY created_at DESC
  `;

  const result = await pool.query(query, [userId]);
  return result.rows;
}

/**
 * Get a single erasure request by ID
 */
export async function getErasureRequestById(
  requestId: string
): Promise<ErasureRequest | null> {
  const query = `
    SELECT 
      request_id as "requestId",
      user_id as "userId",
      reason,
      additional_notes as "additionalNotes",
      status,
      created_at as "createdAt",
      updated_at as "updatedAt",
      reviewed_at as "reviewedAt",
      reviewer_id as "reviewerId",
      review_notes as "reviewNotes",
      completed_at as "completedAt"
    FROM erasure_requests
    WHERE request_id = $1
  `;

  const result = await pool.query(query, [requestId]);
  return result.rows[0] || null;
}

/**
 * Update erasure request status (admin function)
 */
export async function updateErasureRequestStatus(
  params: UpdateErasureRequestStatusParams
): Promise<ErasureRequest | null> {
  const now = new Date().toISOString();
  const completedAt = params.status === "COMPLETED" ? now : null;
  
  const query = `
    UPDATE erasure_requests
    SET 
      status = $2,
      reviewed_at = $3,
      reviewer_id = $4,
      review_notes = $5,
      completed_at = $6,
      updated_at = $7
    WHERE request_id = $1
    RETURNING 
      request_id as "requestId",
      user_id as "userId",
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
 * Get all erasure requests (admin function)
 */
export async function getAllErasureRequests(params?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<{ requests: ErasureRequest[]; pagination: any }> {
  const page = params?.page || 1;
  const limit = params?.limit || 20;
  const offset = (page - 1) * limit;

  let whereClause = "";
  const queryParams: any[] = [];

  if (params?.status) {
    whereClause = "WHERE status = $1";
    queryParams.push(params.status);
  }

  // Count query
  const countQuery = `
    SELECT COUNT(*) as total
    FROM erasure_requests
    ${whereClause}
  `;
  const countResult = await pool.query(countQuery, queryParams);
  const total = parseInt(countResult.rows[0].total, 10);

  // Data query
  const dataQuery = `
    SELECT 
      request_id as "requestId",
      user_id as "userId",
      reason,
      additional_notes as "additionalNotes",
      status,
      created_at as "createdAt",
      updated_at as "updatedAt",
      reviewed_at as "reviewedAt",
      reviewer_id as "reviewerId",
      review_notes as "reviewNotes",
      completed_at as "completedAt"
    FROM erasure_requests
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
