import { HttpClient } from './client';
import {
  ConsentNotice,
  BrandingConfig,
  ConsentResponse,
  WidgetOptions,
  ConsentSDKError,
} from './types';

// ============================================================
// Consent Widget — Embeddable UI for consent collection
// Renders a consent notice with accept/reject buttons.
// Works in browser environments only (DOM required).
// ============================================================

export class ConsentWidget {
  private client: HttpClient;
  private defaultLanguage: string;

  constructor(client: HttpClient, defaultLanguage: string) {
    this.client = client;
    this.defaultLanguage = defaultLanguage;
  }

  /**
   * Render a consent collection widget in the specified container.
   * Fetches the published notice, org branding, and renders inline HTML.
   */
  async render(options: WidgetOptions): Promise<void> {
    if (typeof document === 'undefined') {
      throw new ConsentSDKError(
        'ConsentWidget.render() requires a browser environment',
        0,
        'ENVIRONMENT_ERROR'
      );
    }

    const container =
      typeof options.container === 'string'
        ? document.querySelector<HTMLElement>(options.container)
        : options.container;

    if (!container) {
      throw new ConsentSDKError(
        `Container element not found: ${options.container}`,
        0,
        'CONTAINER_NOT_FOUND'
      );
    }

    try {
      // Fetch notice and branding in parallel
      const [noticeResp, brandingResp] = await Promise.all([
        this.client.get<ConsentNotice>(`/api/v1/notices/published/${options.noticeSlug}`),
        this.client.get<BrandingConfig>('/api/v1/branding'),
      ]);

      const notice = noticeResp.data;
      const branding = brandingResp.data;
      const lang = options.language || this.defaultLanguage;

      // Get content for the requested language, fallback to English
      const content = notice.content[lang] || notice.content['en'] || Object.values(notice.content)[0];

      if (!content) {
        throw new ConsentSDKError(
          `No content available for language: ${lang}`,
          404,
          'NO_CONTENT'
        );
      }

      // Render the widget
      container.innerHTML = this.buildWidgetHTML(notice, content, branding, options);

      // Attach event listeners
      this.attachEventListeners(container, notice, options);
    } catch (error) {
      if (options.onError && error instanceof ConsentSDKError) {
        options.onError(error);
      }
      container.innerHTML = this.buildErrorHTML(error);
    }
  }

  private buildWidgetHTML(
    notice: ConsentNotice,
    content: { title: string; body: string; summary?: string },
    branding: BrandingConfig,
    options: WidgetOptions
  ): string {
    const primaryColor = branding.primaryColor || '#4F46E5';
    const fontFamily = branding.fontFamily || 'Inter, system-ui, sans-serif';
    const showPoweredBy = options.showPoweredBy !== false;

    return `
      <div class="concurin-consent-widget ${options.className || ''}" style="
        font-family: ${fontFamily};
        max-width: 600px;
        margin: 0 auto;
        border: 1px solid #E5E7EB;
        border-radius: 12px;
        overflow: hidden;
        background: #FFFFFF;
        box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
      ">
        ${branding.logoUrl ? `
          <div style="padding: 16px 24px 0; text-align: center;">
            <img src="${branding.logoUrl}" alt="${branding.portalTitle || 'Logo'}" style="max-height: 40px; object-fit: contain;" />
          </div>
        ` : ''}
        
        <div style="padding: 24px;">
          <h3 style="margin: 0 0 8px; font-size: 18px; font-weight: 600; color: #111827;">
            ${this.escapeHtml(content.title)}
          </h3>
          
          ${content.summary ? `
            <p style="margin: 0 0 16px; font-size: 14px; color: #6B7280; line-height: 1.5;">
              ${this.escapeHtml(content.summary)}
            </p>
          ` : ''}
          
          <div style="
            margin: 0 0 16px;
            padding: 16px;
            background: #F9FAFB;
            border-radius: 8px;
            font-size: 14px;
            color: #374151;
            line-height: 1.6;
            max-height: 200px;
            overflow-y: auto;
          ">
            ${this.escapeHtml(content.body)}
          </div>
          
          ${notice.purposes.length > 0 ? `
            <div style="margin: 0 0 16px;">
              <p style="margin: 0 0 8px; font-size: 13px; font-weight: 500; color: #374151;">Purposes:</p>
              <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                ${notice.purposes.map(p => `
                  <span style="
                    display: inline-block;
                    padding: 2px 10px;
                    background: ${primaryColor}15;
                    color: ${primaryColor};
                    border-radius: 12px;
                    font-size: 12px;
                    font-weight: 500;
                  ">${this.escapeHtml(p)}</span>
                `).join('')}
              </div>
            </div>
          ` : ''}
          
          ${notice.dataCategories.length > 0 ? `
            <div style="margin: 0 0 16px;">
              <p style="margin: 0 0 8px; font-size: 13px; font-weight: 500; color: #374151;">Data collected:</p>
              <ul style="margin: 0; padding: 0 0 0 20px; font-size: 13px; color: #6B7280;">
                ${notice.dataCategories.map(d => `<li>${this.escapeHtml(d)}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
          
          <div style="display: flex; gap: 12px; margin-top: 20px;">
            <button data-action="accept" style="
              flex: 1;
              padding: 12px 24px;
              background: ${primaryColor};
              color: white;
              border: none;
              border-radius: 8px;
              font-size: 14px;
              font-weight: 600;
              cursor: pointer;
              transition: opacity 0.2s;
            ">I Agree</button>
            
            <button data-action="reject" style="
              flex: 1;
              padding: 12px 24px;
              background: white;
              color: #374151;
              border: 1px solid #D1D5DB;
              border-radius: 8px;
              font-size: 14px;
              font-weight: 500;
              cursor: pointer;
              transition: background 0.2s;
            ">Decline</button>
          </div>
        </div>
        
        ${showPoweredBy ? `
          <div style="
            padding: 8px 24px;
            background: #F9FAFB;
            text-align: center;
            font-size: 11px;
            color: #9CA3AF;
          ">
            Powered by Concurin Consent Manager
          </div>
        ` : ''}
      </div>
    `;
  }

  private buildErrorHTML(error: unknown): string {
    const message = error instanceof Error ? error.message : 'Failed to load consent notice';
    return `
      <div style="
        padding: 24px;
        text-align: center;
        color: #EF4444;
        font-size: 14px;
        border: 1px solid #FEE2E2;
        border-radius: 8px;
        background: #FEF2F2;
      ">
        <p style="margin: 0;">⚠️ ${this.escapeHtml(message)}</p>
      </div>
    `;
  }

  private attachEventListeners(
    container: HTMLElement,
    notice: ConsentNotice,
    options: WidgetOptions
  ): void {
    const acceptBtn = container.querySelector<HTMLButtonElement>('[data-action="accept"]');
    const rejectBtn = container.querySelector<HTMLButtonElement>('[data-action="reject"]');

    if (acceptBtn) {
      acceptBtn.addEventListener('click', async () => {
        acceptBtn.disabled = true;
        acceptBtn.textContent = 'Processing...';

        try {
          // Collect consent for all purposes in the notice
          const purpose = notice.purposes[0] || notice.slug;
          const consent = await this.client.post<ConsentResponse>('/api/v1/consents', {
            userId: options.userId,
            purpose,
            dataTypes: notice.dataCategories.length > 0 ? notice.dataCategories : ['general'],
            validUntil: new Date(Date.now() + (notice.retentionDays || 2555) * 86400000).toISOString(),
            noticeId: notice.noticeId,
            noticeVersion: String(notice.version),
            language: options.language || this.defaultLanguage,
          });

          // If auto-approve is supported, approve immediately
          if (consent.data.approvalToken) {
            const approved = await this.client.post<ConsentResponse>(
              `/api/v1/consents/approve/${consent.data.approvalToken}`
            );
            options.onConsent?.(approved.data);
          } else {
            options.onConsent?.(consent.data);
          }

          // Show success state
          acceptBtn.textContent = '✓ Consent Granted';
          acceptBtn.style.background = '#059669';
          if (rejectBtn) rejectBtn.style.display = 'none';
        } catch (error) {
          acceptBtn.disabled = false;
          acceptBtn.textContent = 'I Agree';
          if (error instanceof ConsentSDKError) {
            options.onError?.(error);
          }
        }
      });
    }

    if (rejectBtn) {
      rejectBtn.addEventListener('click', () => {
        container.innerHTML = `
          <div style="
            padding: 24px;
            text-align: center;
            color: #6B7280;
            font-size: 14px;
            border: 1px solid #E5E7EB;
            border-radius: 8px;
          ">
            <p style="margin: 0 0 8px; font-weight: 500;">Consent declined</p>
            <p style="margin: 0; font-size: 13px;">
              You can change your preferences at any time through the privacy portal.
            </p>
          </div>
        `;
      });
    }
  }

  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return text.replace(/[&<>"']/g, (c) => map[c] || c);
  }
}
