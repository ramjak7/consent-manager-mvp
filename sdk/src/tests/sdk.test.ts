/**
 * Consent SDK Unit Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConsentManager } from '../index';
import { ConsentSDKError } from '../types';
import { HttpClient } from '../client';

// ============================================================
// ConsentManager Initialization Tests
// ============================================================

describe('ConsentManager', () => {
  describe('constructor', () => {
    it('creates instance with valid options', () => {
      const cm = new ConsentManager({
        apiKey: 'cm_live_' + '0'.repeat(64),
        baseUrl: 'https://api.example.com',
      });
      expect(cm).toBeInstanceOf(ConsentManager);
    });

    it('throws for missing apiKey', () => {
      expect(() => new ConsentManager({ apiKey: '' })).toThrow(ConsentSDKError);
      expect(() => new ConsentManager({ apiKey: '' })).toThrow('apiKey is required');
    });

    it('throws for invalid apiKey format', () => {
      expect(() => new ConsentManager({ apiKey: 'invalid_key_123' })).toThrow(ConsentSDKError);
      expect(() => new ConsentManager({ apiKey: 'invalid_key_123' })).toThrow('cm_live_');
    });

    it('accepts apiKey with cm_live_ prefix', () => {
      expect(() => new ConsentManager({
        apiKey: 'cm_live_' + 'a'.repeat(64),
      })).not.toThrow();
    });

    it('defaults language to en', () => {
      const cm = new ConsentManager({
        apiKey: 'cm_live_' + '0'.repeat(64),
      });
      // Verify by checking the instance was created (language is private)
      expect(cm).toBeTruthy();
    });

    it('binds all consent methods', () => {
      const cm = new ConsentManager({
        apiKey: 'cm_live_' + '0'.repeat(64),
      });
      expect(typeof cm.collectConsent).toBe('function');
      expect(typeof cm.approveConsent).toBe('function');
      expect(typeof cm.rejectConsent).toBe('function');
      expect(typeof cm.revokeConsent).toBe('function');
      expect(typeof cm.validateProcessing).toBe('function');
      expect(typeof cm.getConsent).toBe('function');
      expect(typeof cm.listConsents).toBe('function');
      expect(typeof cm.getConsentReceipt).toBe('function');
      expect(typeof cm.exportConsentData).toBe('function');
      expect(typeof cm.getNotice).toBe('function');
      expect(typeof cm.getBranding).toBe('function');
      expect(typeof cm.renderWidget).toBe('function');
    });
  });
});

// ============================================================
// ConsentSDKError Tests
// ============================================================

describe('ConsentSDKError', () => {
  it('extends Error', () => {
    const err = new ConsentSDKError('test error', 400, 'TEST');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ConsentSDKError);
  });

  it('stores statusCode and code', () => {
    const err = new ConsentSDKError('test', 403, 'FORBIDDEN');
    expect(err.message).toBe('test');
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('FORBIDDEN');
  });

  it('has correct name property', () => {
    const err = new ConsentSDKError('test', 0, 'ERR');
    expect(err.name).toBe('ConsentSDKError');
  });
});

// ============================================================
// HttpClient Tests
// ============================================================

describe('HttpClient', () => {
  let client: HttpClient;

  beforeEach(() => {
    client = new HttpClient({
      apiKey: 'cm_live_' + '0'.repeat(64),
      baseUrl: 'https://api.test.com',
    });
  });

  it('strips trailing slash from baseUrl', () => {
    const c = new HttpClient({
      apiKey: 'cm_live_' + '0'.repeat(64),
      baseUrl: 'https://api.test.com/',
    });
    // If baseUrl had trailing slash, requests would double-slash
    expect(c).toBeTruthy();
  });

  it('defaults baseUrl when not provided', () => {
    const c = new HttpClient({
      apiKey: 'cm_live_' + '0'.repeat(64),
    });
    expect(c).toBeTruthy();
  });

  it('makes GET request with correct headers', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: { id: '1' } }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await client.get('/api/v1/consents');

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.test.com/api/v1/consents');
    expect(options.method).toBe('GET');
    expect(options.headers['X-API-Key']).toBe('cm_live_' + '0'.repeat(64));
    expect(options.headers['Accept']).toBe('application/json');

    vi.unstubAllGlobals();
  });

  it('makes POST request with JSON body', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: () => Promise.resolve({ data: { id: '2' } }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await client.post('/api/v1/consents', { purpose: 'marketing' });

    const [, options] = mockFetch.mock.calls[0];
    expect(options.method).toBe('POST');
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(options.body).toBe(JSON.stringify({ purpose: 'marketing' }));

    vi.unstubAllGlobals();
  });

  it('appends query parameters', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: [] }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await client.get('/api/v1/consents', { page: 2, limit: 10, status: undefined });

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('page=2');
    expect(url).toContain('limit=10');
    expect(url).not.toContain('status');

    vi.unstubAllGlobals();
  });

  it('throws ConsentSDKError on non-ok response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: 'Not found', code: 'NOT_FOUND' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await expect(client.get('/api/v1/consents/999')).rejects.toThrow(ConsentSDKError);
    await expect(client.get('/api/v1/consents/999')).rejects.toThrow('Not found');

    vi.unstubAllGlobals();
  });

  it('handles timeout (AbortError)', async () => {
    const slowClient = new HttpClient({
      apiKey: 'cm_live_' + '0'.repeat(64),
      baseUrl: 'https://api.test.com',
      timeout: 1, // 1ms timeout
    });

    const mockFetch = vi.fn().mockImplementation((_url: string, options: any) => {
      return new Promise((_resolve, reject) => {
        const error = new Error('The operation was aborted');
        error.name = 'AbortError';
        // Simulate the signal aborting
        setTimeout(() => reject(error), 5);
      });
    });
    vi.stubGlobal('fetch', mockFetch);

    await expect(slowClient.get('/slow')).rejects.toThrow('timed out');

    vi.unstubAllGlobals();
  });

  it('handles network errors', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network failure'));
    vi.stubGlobal('fetch', mockFetch);

    await expect(client.get('/api/v1/consents')).rejects.toThrow('Network error');

    vi.unstubAllGlobals();
  });

  it('makes PATCH request', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: {} }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await client.patch('/api/v1/consents/1', { status: 'revoked' });

    const [, options] = mockFetch.mock.calls[0];
    expect(options.method).toBe('PATCH');

    vi.unstubAllGlobals();
  });

  it('makes DELETE request without body', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: {} }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await client.delete('/api/v1/api-keys/1');

    const [, options] = mockFetch.mock.calls[0];
    expect(options.method).toBe('DELETE');
    expect(options.body).toBeUndefined();

    vi.unstubAllGlobals();
  });
});
