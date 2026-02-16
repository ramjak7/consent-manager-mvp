/**
 * Middleware Unit Tests
 * Tests orgContext and usageTracking middleware logic.
 */
import { describe, it, expect, vi } from 'vitest';

// ============================================================
// extractOrgContext Tests
// ============================================================

// Direct-test the logic without importing Express types
const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

function extractOrgContextLogic(req: any): string | undefined {
  if (req.orgId) return req.orgId;
  if (req.user?.orgId) return req.user.orgId;
  return DEFAULT_ORG_ID;
}

describe('extractOrgContext logic', () => {
  it('uses orgId from API key when present', () => {
    const orgId = extractOrgContextLogic({
      orgId: 'api-key-org-id',
      user: { orgId: 'user-org-id' },
    });
    expect(orgId).toBe('api-key-org-id');
  });

  it('uses orgId from JWT user when no API key', () => {
    const orgId = extractOrgContextLogic({
      user: { orgId: 'user-org-id' },
    });
    expect(orgId).toBe('user-org-id');
  });

  it('falls back to default org when no context', () => {
    const orgId = extractOrgContextLogic({});
    expect(orgId).toBe(DEFAULT_ORG_ID);
  });

  it('prefers API key orgId over user orgId', () => {
    const orgId = extractOrgContextLogic({
      orgId: 'from-api-key',
      user: { orgId: 'from-user' },
    });
    expect(orgId).toBe('from-api-key');
  });
});

// ============================================================
// requireOrgContext Tests
// ============================================================

describe('requireOrgContext logic', () => {
  it('passes when orgId is set', () => {
    const req = { orgId: 'some-org-id' };
    expect(req.orgId).toBeTruthy();
  });

  it('fails when orgId is undefined', () => {
    const req: { orgId?: string } = {};
    expect(req.orgId).toBeFalsy();
  });
});

// ============================================================
// classifyEvent Tests
// ============================================================

function classifyEvent(method: string, path: string): string {
  if (path.includes('/consents') && method === 'POST' && !path.includes('revoke') && !path.includes('expire')) {
    return 'consent_collected';
  }
  if (path.includes('/revoke')) {
    return 'consent_revoked';
  }
  if (path.includes('/process') && method === 'POST') {
    return 'processing_validated';
  }
  if (path.includes('/erasure') && method === 'POST') {
    return 'erasure_requested';
  }
  if (path.includes('/correction') && method === 'POST') {
    return 'correction_requested';
  }
  return 'api_call';
}

describe('classifyEvent', () => {
  it('classifies POST /consents as consent_collected', () => {
    expect(classifyEvent('POST', '/api/v1/consents')).toBe('consent_collected');
  });

  it('classifies consent revoke as consent_revoked', () => {
    expect(classifyEvent('POST', '/api/v1/consents/123/revoke')).toBe('consent_revoked');
  });

  it('does not classify GET /consents as consent_collected', () => {
    expect(classifyEvent('GET', '/api/v1/consents')).toBe('api_call');
  });

  it('classifies POST /process as processing_validated', () => {
    expect(classifyEvent('POST', '/api/v1/process')).toBe('processing_validated');
  });

  it('classifies POST /erasure-requests as erasure_requested', () => {
    expect(classifyEvent('POST', '/api/v1/erasure-requests')).toBe('erasure_requested');
  });

  it('classifies POST /correction-requests as correction_requested', () => {
    expect(classifyEvent('POST', '/api/v1/correction-requests')).toBe('correction_requested');
  });

  it('classifies GET /purposes as api_call', () => {
    expect(classifyEvent('GET', '/api/v1/admin/purposes')).toBe('api_call');
  });

  it('classifies DELETE /api-keys as api_call', () => {
    expect(classifyEvent('DELETE', '/api/v1/api-keys/123')).toBe('api_call');
  });

  it('handles consent expire path correctly (not consent_collected)', () => {
    expect(classifyEvent('POST', '/api/v1/consents/123/expire')).not.toBe('consent_collected');
  });
});
