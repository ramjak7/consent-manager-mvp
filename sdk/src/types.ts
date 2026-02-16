// ============================================================
// @concurin/consent-sdk — Type Definitions
// ============================================================

/** SDK initialization options */
export interface ConsentManagerOptions {
  /** API key (starts with cm_live_) */
  apiKey: string;
  /** Organization ID */
  orgId?: string;
  /** API base URL (defaults to production) */
  baseUrl?: string;
  /** Default language for notices (ISO 639-1) */
  language?: string;
  /** Request timeout in ms (default: 10000) */
  timeout?: number;
  /** Enable debug logging */
  debug?: boolean;
}

/** Consent collection request */
export interface CollectConsentRequest {
  /** Data principal user ID in your system */
  userId: string;
  /** Purpose code or ID */
  purpose: string;
  /** Data types being collected */
  dataTypes: string[];
  /** Consent validity period (ISO 8601 date) */
  validUntil: string;
  /** Notice ID being shown */
  noticeId: string;
  /** Notice version */
  noticeVersion: string;
  /** Language of the notice shown */
  language?: string;
}

/** Consent response from API */
export interface ConsentResponse {
  consentId: string;
  consentGroupId: string;
  version: number;
  userId: string;
  purpose: string;
  dataTypes: string[];
  status: ConsentStatus;
  validUntil: string;
  approvalToken?: string;
  approvalExpiresAt?: string;
  noticeId: string;
  noticeVersion: string;
  language: string | null;
  createdAt: string;
}

export type ConsentStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'REQUESTED' | 'REJECTED';

/** Processing validation request */
export interface ValidateProcessingRequest {
  /** Data principal user ID */
  userId: string;
  /** Purpose code */
  purpose: string;
  /** Data types being processed */
  dataTypes: string[];
}

/** Processing validation response */
export interface ProcessingValidationResponse {
  allowed: boolean;
  consent?: ConsentResponse;
  reason?: string;
}

/** Consent revocation request */
export interface RevokeConsentRequest {
  /** Consent ID to revoke */
  consentId?: string;
  /** Or revoke by purpose for a user */
  userId?: string;
  purpose?: string;
}

/** Consent notice (as returned by API) */
export interface ConsentNotice {
  noticeId: string;
  orgId: string;
  title: string;
  slug: string;
  version: number;
  description: string | null;
  content: Record<string, { title: string; body: string; summary?: string }>;
  purposes: string[];
  dataCategories: string[];
  retentionDays: number | null;
  status: string;
  publishedAt: string | null;
}

/** Branding configuration */
export interface BrandingConfig {
  orgId: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  portalTitle: string | null;
  supportEmail: string | null;
  privacyPolicyUrl: string | null;
  termsUrl: string | null;
}

/** Error from the SDK */
export class ConsentSDKError extends Error {
  public statusCode: number;
  public code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = 'ConsentSDKError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

/** API response wrapper */
export interface ApiResponse<T> {
  data: T;
  message?: string;
  pagination?: {
    total: number;
    page: number;
    limit: number;
  };
}

/** Consent list query parameters */
export interface ListConsentsParams {
  userId?: string;
  status?: ConsentStatus;
  purpose?: string;
  page?: number;
  limit?: number;
}

/** Consent receipt */
export interface ConsentReceipt {
  receiptId: string;
  consentId: string;
  version: number;
  dataPrincipal: { userId: string };
  purpose: string;
  dataTypes: string[];
  validUntil: string;
  status: string;
  issuedAt: string;
}

/** Widget render options */
export interface WidgetOptions {
  /** Container element or CSS selector */
  container: string | HTMLElement;
  /** Notice slug to display */
  noticeSlug: string;
  /** User ID for the data principal */
  userId: string;
  /** Language (defaults to SDK language) */
  language?: string;
  /** Callback when consent is granted */
  onConsent?: (consent: ConsentResponse) => void;
  /** Callback on error */
  onError?: (error: ConsentSDKError) => void;
  /** Custom CSS class for the widget */
  className?: string;
  /** Show/hide the powered-by footer */
  showPoweredBy?: boolean;
}
