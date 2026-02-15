/**
 * Audit Hash Chain Unit Tests
 * Tests the integrity of audit log hash chain computation
 */

import { describe, it, expect } from 'vitest';
import { computeAuditHash } from '../../utils/auditHash';

describe('computeAuditHash', () => {
  const baseEntry = {
    prevHash: null as string | null,
    auditId: 'audit-1',
    eventType: 'CONSENT_REQUESTED',
    consentId: 'consent-1',
    userId: 'user-1',
    timestamp: '2024-01-01T00:00:00.000Z',
    details: { purpose: 'marketing' },
  };

  it('produces a deterministic hash', () => {
    const hash1 = computeAuditHash(baseEntry);
    const hash2 = computeAuditHash(baseEntry);
    expect(hash1).toBe(hash2);
  });

  it('produces different hashes for different entries', () => {
    const hash1 = computeAuditHash(baseEntry);
    const hash2 = computeAuditHash({ ...baseEntry, auditId: 'audit-2' });
    expect(hash1).not.toBe(hash2);
  });

  it('chains correctly with prevHash', () => {
    const hash1 = computeAuditHash(baseEntry);
    const hash2 = computeAuditHash({ ...baseEntry, prevHash: hash1, auditId: 'audit-2' });
    expect(hash2).not.toBe(hash1);
    // Changing prevHash should change the output
    const hash3 = computeAuditHash({ ...baseEntry, prevHash: 'different', auditId: 'audit-2' });
    expect(hash3).not.toBe(hash2);
  });

  it('returns a hex string', () => {
    const hash = computeAuditHash(baseEntry);
    expect(hash).toMatch(/^[a-f0-9]+$/);
  });

  it('produces consistent length hashes', () => {
    const hash1 = computeAuditHash(baseEntry);
    const hash2 = computeAuditHash({ ...baseEntry, details: { very: 'long', nested: { data: 'value' } } });
    expect(hash1.length).toBe(hash2.length);
  });
});
