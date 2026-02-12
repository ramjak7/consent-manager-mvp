import { apiRequest, apiClient } from './client';
import type { Consent, ConsentListResponse, ConsentGrantRequest } from '../types/consent.types';

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
   * Grant (create) a new consent
   */
  async grantConsent(data: ConsentGrantRequest): Promise<{ consentId: string; status: string; approvalToken: string; approvalExpiresAt: string; message: string }> {
    return apiRequest({
      method: 'POST',
      url: '/consents',
      data,
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

  /**
   * Download consent receipt as JSON
   */
  async getReceipt(consentId: string): Promise<Record<string, unknown>> {
    return apiRequest<Record<string, unknown>>({
      method: 'GET',
      url: `/consents/${consentId}/receipt`,
    });
  },

  /**
   * Download consent receipt as PDF (returns blob URL)
   */
  async downloadReceiptPdf(consentId: string): Promise<void> {
    const response = await apiClient.get(`/consents/${consentId}/receipt.pdf`, {
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `consent-receipt-${consentId}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
};
