/**
 * API Key Generation & Hashing Tests
 */
import { describe, it, expect } from 'vitest';
import { generateApiKey, hashApiKey } from '../../repositories/apiKeyRepo';

describe('generateApiKey', () => {
  it('generates key with cm_live_ prefix', () => {
    const { rawKey } = generateApiKey();
    expect(rawKey).toMatch(/^cm_live_[0-9a-f]{64}$/);
  });

  it('generates unique keys on each call', () => {
    const key1 = generateApiKey();
    const key2 = generateApiKey();
    expect(key1.rawKey).not.toBe(key2.rawKey);
    expect(key1.keyHash).not.toBe(key2.keyHash);
  });

  it('returns correct prefix (first 16 chars)', () => {
    const { rawKey, keyPrefix } = generateApiKey();
    expect(keyPrefix).toBe(rawKey.substring(0, 16));
    expect(keyPrefix).toMatch(/^cm_live_[0-9a-f]{8}$/);
  });

  it('returns deterministic hash for the raw key', () => {
    const { rawKey, keyHash } = generateApiKey();
    const rehash = hashApiKey(rawKey);
    expect(keyHash).toBe(rehash);
  });

  it('hash is 64 hex chars (SHA-256)', () => {
    const { keyHash } = generateApiKey();
    expect(keyHash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('hashApiKey', () => {
  it('produces consistent hash for same input', () => {
    const key = 'cm_live_abcdef1234567890abcdef1234567890abcdef1234567890abcdef12345678';
    const hash1 = hashApiKey(key);
    const hash2 = hashApiKey(key);
    expect(hash1).toBe(hash2);
  });

  it('produces different hashes for different inputs', () => {
    const hash1 = hashApiKey('cm_live_aaaa');
    const hash2 = hashApiKey('cm_live_bbbb');
    expect(hash1).not.toBe(hash2);
  });

  it('returns 64-char hex string', () => {
    const hash = hashApiKey('test_key');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});
