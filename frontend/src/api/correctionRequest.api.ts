import { apiClient } from './client';
import type {
  CorrectionRequest,
  CreateCorrectionRequestPayload,
} from '../types/correctionRequest.types';

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export const correctionRequestApi = {
  /** Create a new correction request (Data Principal) */
  create: async (
    payload: CreateCorrectionRequestPayload
  ): Promise<CorrectionRequest> => {
    const response = await apiClient.post<ApiResponse<CorrectionRequest>>(
      '/api/v1/correction-requests',
      payload
    );
    return response.data.data;
  },

  /** Get all correction requests for the current user */
  getAll: async (): Promise<CorrectionRequest[]> => {
    const response = await apiClient.get<ApiResponse<CorrectionRequest[]>>(
      '/api/v1/correction-requests'
    );
    return response.data.data;
  },

  /** Get a specific correction request by ID */
  getById: async (id: string): Promise<CorrectionRequest> => {
    const response = await apiClient.get<ApiResponse<CorrectionRequest>>(
      `/api/v1/correction-requests/${id}`
    );
    return response.data.data;
  },
};
