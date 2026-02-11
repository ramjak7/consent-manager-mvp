import { type ErasureRequest, type CreateErasureRequestInput, type ErasureRequestListResponse, type ErasureRequestResponse } from '../types/erasureRequest.types';
import { apiClient } from './client';

/**
 * Create a new erasure request
 */
export async function createErasureRequest(
  data: CreateErasureRequestInput
): Promise<ErasureRequest> {
  const response = await apiClient.post<ErasureRequestResponse>(
    '/api/erasure-requests',
    data
  );
  return response.data.data;
}

/**
 * Get all erasure requests for the current user
 */
export async function getErasureRequests(): Promise<ErasureRequest[]> {
  const response = await apiClient.get<ErasureRequestListResponse>(
    '/api/erasure-requests'
  );
  return response.data.data;
}

/**
 * Get a specific erasure request by ID
 */
export async function getErasureRequestById(
  requestId: string
): Promise<ErasureRequest> {
  const response = await apiClient.get<ErasureRequestResponse>(
    `/api/erasure-requests/${requestId}`
  );
  return response.data.data;
}
