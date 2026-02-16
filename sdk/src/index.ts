import { HttpClient } from './client';
import { ConsentOperations } from './consent';
import { ConsentWidget } from './widget';
import {
  ConsentManagerOptions,
  ConsentSDKError,
  ConsentNotice,
  BrandingConfig,
  WidgetOptions,
} from './types';

// Re-export all types
export * from './types';
export { HttpClient } from './client';
export { ConsentOperations } from './consent';
export { ConsentWidget } from './widget';

// ============================================================
// ConsentManager — Main SDK entry point
// ============================================================

/**
 * Main entry point for the Concurin Consent SDK.
 *
 * @example
 * ```typescript
 * import { ConsentManager } from '@concurin/consent-sdk';
 *
 * const cm = new ConsentManager({
 *   apiKey: 'cm_live_xxxxx',
 *   baseUrl: 'https://api.example.com',
 *   language: 'en',
 * });
 *
 * // Collect consent
 * const consent = await cm.collectConsent({
 *   userId: 'user_123',
 *   purpose: 'marketing',
 *   dataTypes: ['email', 'phone'],
 *   validUntil: '2027-01-01T00:00:00Z',
 *   noticeId: 'privacy-notice-v1',
 *   noticeVersion: '1',
 * });
 *
 * // Validate processing
 * const result = await cm.validateProcessing({
 *   userId: 'user_123',
 *   purpose: 'marketing',
 *   dataTypes: ['email'],
 * });
 *
 * if (result.allowed) {
 *   // Safe to process
 * }
 *
 * // Render consent widget (browser only)
 * cm.renderWidget({
 *   container: '#consent-container',
 *   noticeSlug: 'privacy-notice',
 *   userId: 'user_123',
 *   onConsent: (consent) => console.log('Consent granted:', consent),
 * });
 * ```
 */
export class ConsentManager {
  private client: HttpClient;
  private consent: ConsentOperations;
  private widget: ConsentWidget;
  private language: string;

  constructor(options: ConsentManagerOptions) {
    if (!options.apiKey) {
      throw new ConsentSDKError('apiKey is required', 0, 'MISSING_API_KEY');
    }

    if (!options.apiKey.startsWith('cm_live_')) {
      throw new ConsentSDKError(
        'apiKey must start with "cm_live_"',
        0,
        'INVALID_API_KEY_FORMAT'
      );
    }

    this.language = options.language || 'en';
    this.client = new HttpClient(options);
    this.consent = new ConsentOperations(this.client, this.language);
    this.widget = new ConsentWidget(this.client, this.language);

    // Bind consent lifecycle methods
    this.collectConsent = this.consent.collectConsent.bind(this.consent);
    this.approveConsent = this.consent.approveConsent.bind(this.consent);
    this.rejectConsent = this.consent.rejectConsent.bind(this.consent);
    this.revokeConsent = this.consent.revokeConsent.bind(this.consent);
    this.validateProcessing = this.consent.validateProcessing.bind(this.consent);
    this.getConsent = this.consent.getConsent.bind(this.consent);
    this.listConsents = this.consent.listConsents.bind(this.consent);
    this.getConsentReceipt = this.consent.getConsentReceipt.bind(this.consent);
    this.exportConsentData = this.consent.exportConsentData.bind(this.consent);
  }

  // ---- Consent Lifecycle ----

  /** Collect consent from a data principal */
  collectConsent: ConsentOperations['collectConsent'];

  /** Approve a consent request via token */
  approveConsent: ConsentOperations['approveConsent'];

  /** Reject a consent request via token */
  rejectConsent: ConsentOperations['rejectConsent'];

  /** Revoke an active consent */
  revokeConsent: ConsentOperations['revokeConsent'];

  /** Validate whether processing is allowed */
  validateProcessing: ConsentOperations['validateProcessing'];

  /** Get a specific consent by ID */
  getConsent: ConsentOperations['getConsent'];

  /** List consents with filters */
  listConsents: ConsentOperations['listConsents'];

  /** Get a consent receipt */
  getConsentReceipt: ConsentOperations['getConsentReceipt'];

  /** Export consent data (data portability) */
  exportConsentData: ConsentOperations['exportConsentData'];

  // ---- Notice & Branding ----

  /**
   * Get a published consent notice by slug.
   * Used to display notices in your own UI.
   */
  async getNotice(slug: string): Promise<ConsentNotice> {
    const response = await this.client.get<ConsentNotice>(`/api/v1/notices/published/${slug}`);
    return response.data;
  }

  /**
   * Get the organization's branding configuration.
   * Used to style your consent UI to match the DF's brand.
   */
  async getBranding(): Promise<BrandingConfig> {
    const response = await this.client.get<BrandingConfig>('/api/v1/branding');
    return response.data;
  }

  // ---- Widget ----

  /**
   * Render a consent collection widget in the browser.
   * Automatically fetches the notice, applies branding, and handles consent flow.
   * Browser-only — throws in Node.js environments.
   */
  async renderWidget(options: WidgetOptions): Promise<void> {
    return this.widget.render(options);
  }
}

// Default export
export default ConsentManager;
