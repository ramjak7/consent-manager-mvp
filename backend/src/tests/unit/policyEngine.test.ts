/**
 * Policy Engine Unit Tests
 * Tests consent policy evaluation logic
 */

import { describe, it, expect } from 'vitest';
import { evaluateConsentPolicy } from '../../policy/policyEngine';

const makeConsent = (overrides: Partial<any> = {}) => ({
  consentId: 'test-consent-1',
  consentGroupId: 'group-1',
  userId: 'user-1',
  purpose: 'marketing',
  dataTypes: ['email', 'name', 'phone'],
  status: 'ACTIVE' as const,
  version: 1,
  validUntil: new Date(Date.now() + 86400000),
  noticeId: 'notice-1',
  noticeVersion: '1.0',
  language: 'en',
  createdAt: new Date().toISOString(),
  approvalToken: null,
  approvalExpiresAt: null,
  noticeShownAt: null,
  ...overrides,
});

describe('evaluateConsentPolicy', () => {
  it('allows valid request with matching purpose and subset of dataTypes', () => {
    const consent = makeConsent();
    const result = evaluateConsentPolicy(consent, {
      purpose: 'marketing',
      dataTypes: ['email', 'name'],
      version: 1,
    });
    expect(result.allow).toBe(true);
  });

  it('allows request with exact dataTypes match', () => {
    const consent = makeConsent();
    const result = evaluateConsentPolicy(consent, {
      purpose: 'marketing',
      dataTypes: ['email', 'name', 'phone'],
      version: 1,
    });
    expect(result.allow).toBe(true);
  });

  it('denies when consent is not ACTIVE', () => {
    const consent = makeConsent({ status: 'REVOKED' });
    const result = evaluateConsentPolicy(consent, {
      purpose: 'marketing',
      dataTypes: ['email'],
      version: 1,
    });
    expect(result.allow).toBe(false);
    expect(result).toHaveProperty('reason', 'Consent not active');
  });

  it('denies on purpose mismatch', () => {
    const consent = makeConsent();
    const result = evaluateConsentPolicy(consent, {
      purpose: 'analytics',
      dataTypes: ['email'],
      version: 1,
    });
    expect(result.allow).toBe(false);
    expect(result).toHaveProperty('reason', 'Purpose mismatch');
  });

  it('denies on stale consent version', () => {
    const consent = makeConsent({ version: 2 });
    const result = evaluateConsentPolicy(consent, {
      purpose: 'marketing',
      dataTypes: ['email'],
      version: 1,
    });
    expect(result.allow).toBe(false);
    expect(result).toHaveProperty('reason', 'Stale consent version');
  });

  it('denies when requested dataType not in consented set', () => {
    const consent = makeConsent();
    const result = evaluateConsentPolicy(consent, {
      purpose: 'marketing',
      dataTypes: ['email', 'location'],
      version: 1,
    });
    expect(result.allow).toBe(false);
    expect(result).toHaveProperty('reason', "DataType 'location' not consented");
  });

  it('denies when no dataTypes requested', () => {
    const consent = makeConsent();
    const result = evaluateConsentPolicy(consent, {
      purpose: 'marketing',
      dataTypes: [],
      version: 1,
    });
    expect(result.allow).toBe(false);
    expect(result).toHaveProperty('reason', 'No dataTypes requested');
  });

  it('denies for EXPIRED consent status', () => {
    const consent = makeConsent({ status: 'EXPIRED' });
    const result = evaluateConsentPolicy(consent, {
      purpose: 'marketing',
      dataTypes: ['email'],
      version: 1,
    });
    expect(result.allow).toBe(false);
  });

  it('denies for REQUESTED consent status', () => {
    const consent = makeConsent({ status: 'REQUESTED' });
    const result = evaluateConsentPolicy(consent, {
      purpose: 'marketing',
      dataTypes: ['email'],
      version: 1,
    });
    expect(result.allow).toBe(false);
  });
});
