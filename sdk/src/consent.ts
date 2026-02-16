import { HttpClient } from './client';
import {
  CollectConsentRequest,
  ConsentResponse,
  ValidateProcessingRequest,
  ProcessingValidationResponse,
  RevokeConsentRequest,
  ConsentReceipt,
  ListConsentsParams,
  ApiResponse,
} from './types';

// ============================================================
// Consent Operations — Core consent lifecycle methods
// ============================================================

export class ConsentOperations {
  constructor(private client: HttpClient, private defaultLanguage: string) {}

  /**
   * Collect consent from a data principal.
   * Creates a REQUESTED consent that needs approval.
   */
  async collectConsent(request: CollectConsentRequest): Promise<ConsentResponse> {
    const body = {
      userId: request.userId,
      purpose: request.purpose,
      dataTypes: request.dataTypes,
      validUntil: request.validUntil,
      noticeId: request.noticeId,
      noticeVersion: request.noticeVersion,
      language: request.language || this.defaultLanguage,
    };

    const response = await this.client.post<ConsentResponse>('/api/v1/consents', body);
    return response.data;
  }

  /**
   * Approve a consent request using the approval token.
   * Transitions consent from REQUESTED → ACTIVE.
   */
  async approveConsent(approvalToken: string): Promise<ConsentResponse> {
    const response = await this.client.post<ConsentResponse>(
      `/api/v1/consents/approve/${approvalToken}`
    );
    return response.data;
  }

  /**
   * Reject a consent request using the approval token.
   */
  async rejectConsent(approvalToken: string): Promise<ConsentResponse> {
    const response = await this.client.post<ConsentResponse>(
      `/api/v1/consents/reject/${approvalToken}`
    );
    return response.data;
  }

  /**
   * Revoke an existing active consent.
   * Can revoke by consent ID or by userId + purpose.
   */
  async revokeConsent(request: RevokeConsentRequest): Promise<ConsentResponse> {
    if (request.consentId) {
      const response = await this.client.post<ConsentResponse>(
        `/api/v1/consents/${request.consentId}/revoke`
      );
      return response.data;
    }

    if (request.userId && request.purpose) {
      const response = await this.client.post<ConsentResponse>(
        '/api/v1/consents/revoke',
        { userId: request.userId, purpose: request.purpose }
      );
      return response.data;
    }

    throw new Error('Either consentId or (userId + purpose) is required');
  }

  /**
   * Validate whether processing is allowed for a given purpose and data types.
   * This is the main check DF systems call before processing personal data.
   */
  async validateProcessing(request: ValidateProcessingRequest): Promise<ProcessingValidationResponse> {
    const response = await this.client.post<ProcessingValidationResponse>(
      '/api/v1/process',
      request
    );
    return response.data;
  }

  /**
   * Get a specific consent by ID.
   */
  async getConsent(consentId: string): Promise<ConsentResponse> {
    const response = await this.client.get<ConsentResponse>(`/api/v1/consents/${consentId}`);
    return response.data;
  }

  /**
   * List consents with optional filters.
   */
  async listConsents(params?: ListConsentsParams): Promise<ApiResponse<ConsentResponse[]>> {
    return this.client.get<ConsentResponse[]>('/api/v1/consents', {
      status: params?.status,
      purpose: params?.purpose,
      page: params?.page,
      limit: params?.limit,
    });
  }

  /**
   * Get a consent receipt (ISO 29184 format).
   */
  async getConsentReceipt(consentId: string): Promise<ConsentReceipt> {
    const response = await this.client.get<ConsentReceipt>(`/api/v1/consents/${consentId}/receipt`);
    return response.data;
  }

  /**
   * Export all consent data for a user (data portability).
   */
  async exportConsentData(format: 'json' | 'csv' = 'json'): Promise<unknown> {
    const response = await this.client.get<unknown>('/api/v1/consents/export', { format });
    return response.data;
  }
}
