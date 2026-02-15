export interface Consent {
  consentId: string;
  consentGroupId: string;
  version: number;
  userId: string;
  purpose: string;
  dataTypes: string[];
  organization?: string; // Optional - extracted from metadata if available
  status: ConsentStatus;
  validUntil: string;
  approvalToken?: string | null;
  approvalExpiresAt?: string | null;
  noticeId: string | null;
  noticeVersion: string | null;
  language: Language | null;
  noticeShownAt?: string | null;
  createdAt: string; // Maps to grantedAt in UI
}

export type ConsentStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'REQUESTED';
export type Language = 'en' | 'hi' | 'ta';

export interface ConsentListResponse {
  success: boolean;
  data: Consent[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ConsentGrantRequest {
  // P1-2: userId removed — server derives from JWT token
  purpose: string;
  dataTypes: string[];
  validUntil: string;
  noticeId: string;
  noticeVersion: string;
  language: Language;
}

export interface ConsentRevokeRequest {
  reason:
    | 'NO_LONGER_USING'
    | 'PRIVACY_CONCERNS'
    | 'SWITCHING_SERVICE'
    | 'QUALITY_ISSUES'
    | 'OTHER';
  comments?: string;
}
