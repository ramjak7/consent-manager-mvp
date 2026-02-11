import { apiRequest } from './client';
import type { Consent, ConsentListResponse } from '../types/consent.types';

export interface GetConsentsParams {
  status?: 'REQUESTED' | 'ACTIVE' | 'REJECTED' | 'REVOKED' | 'EXPIRED';
  purpose?: string;
  organizationName?: string;
  page?: number;
  limit?: number;
  sortBy?: 'created_at' | 'valid_until' | 'purpose';
  sortOrder?: 'asc' | 'desc';
}

export const consentApi = {
  /**
   * Get consents for current user with filters and pagination
   */
  async getConsents(params?: GetConsentsParams): Promise<ConsentListResponse> {
    const queryParams = new URLSearchParams();
    
    if (params?.status) queryParams.append('status', params.status);
    if (params?.purpose) queryParams.append('purpose', params.purpose);
    if (params?.organizationName) queryParams.append('organizationName', params.organizationName);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);

    const query = queryParams.toString();
    const url = `/api/consents${query ? `?${query}` : ''}`;

    return apiRequest<ConsentListResponse>({
      method: 'GET',
      url,
    });
  },

  /**
   * Get single consent by ID
   */
  async getConsentById(consentId: string): Promise<Consent> {
    return apiRequest<Consent>({
      method: 'GET',
      url: `/consents/${consentId}`,
    });
  },

  /**
   * Revoke a consent
   */
  async revokeConsent(consentId: string): Promise<{ status: string; message: string }> {
    return apiRequest<{ status: string; message: string }>({
      method: 'POST',
      url: `/consents/${consentId}/revoke`,
    });
  },
};
