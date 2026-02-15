/**
 * Consent Receipt Unit Tests
 * Tests ISO/IEC 29184 consent receipt generation
 */

import { describe, it, expect } from 'vitest';
import { generateConsentReceipt } from '../../utils/consentReceipt';

const mockConsent = {
  consentId: 'consent-123',
  consentGroupId: 'group-123',
  userId: 'user-1',
  purpose: 'marketing',
  dataTypes: ['email', 'name'],
  status: 'ACTIVE' as const,
  version: 1,
  validUntil: new Date('2025-12-31T23:59:59.000Z'),
  noticeId: 'notice-1',
  noticeVersion: '1.0',
  language: 'en',
  createdAt: '2024-01-01T00:00:00.000Z',
  approvalToken: null,
  approvalExpiresAt: null,
  noticeShownAt: null,
};

describe('generateConsentReceipt', () => {
  it('generates a valid receipt with required fields', () => {
    const receipt = generateConsentReceipt(mockConsent, 'receipt-1');

    expect(receipt).toHaveProperty('receiptId', 'receipt-1');
    expect(receipt).toHaveProperty('consentId', 'consent-123');
    expect(receipt).toHaveProperty('version');
    expect(receipt).toHaveProperty('jurisdiction');
    expect(receipt).toHaveProperty('consentTimestamp');
  });

  it('includes data subject and data controller info', () => {
    const receipt = generateConsentReceipt(mockConsent, 'receipt-1');

    expect(receipt).toHaveProperty('dataSubject');
    expect(receipt).toHaveProperty('dataController');
    expect(receipt.dataSubject.userId).toBe('user-1');
  });

  it('includes purpose and data types', () => {
    const receipt = generateConsentReceipt(mockConsent, 'receipt-1');

    expect(receipt).toHaveProperty('purposes');
    expect(Array.isArray(receipt.purposes)).toBe(true);
    expect(receipt.purposes.length).toBeGreaterThan(0);
    expect(receipt.purposes[0]).toHaveProperty('purpose', 'marketing');
    expect(receipt).toHaveProperty('dataCategories');
    expect(receipt.dataCategories).toEqual(['email', 'name']);
  });

  it('includes compliance framework', () => {
    const receipt = generateConsentReceipt(mockConsent, 'receipt-1');

    expect(receipt).toHaveProperty('complianceFramework');
    expect(receipt.complianceFramework).toContain('DPDP Act 2023 (India)');
  });

  it('generates unique receipts for different IDs', () => {
    const receipt1 = generateConsentReceipt(mockConsent, 'receipt-1');
    const receipt2 = generateConsentReceipt(mockConsent, 'receipt-2');

    expect(receipt1.receiptId).not.toBe(receipt2.receiptId);
  });
});
