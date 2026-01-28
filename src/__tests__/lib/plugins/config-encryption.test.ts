/**
 * Config Encryption Utility Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock encryption module
vi.mock('@/lib/security/encryption', () => ({
  encryptString: vi.fn((v: string) => `enc:v1:${Buffer.from(v).toString('base64')}`),
  decryptString: vi.fn((v: string) => {
    const base64 = v.replace('enc:v1:', '');
    return Buffer.from(base64, 'base64').toString('utf8');
  }),
  isEncrypted: vi.fn((v: string) => v.startsWith('enc:v1:')),
}));

import {
  getPasswordFields,
  encryptConfigFields,
  decryptConfigFields,
  maskConfigFields,
  PASSWORD_PLACEHOLDER,
} from '@/lib/plugins/config-encryption';
import type { JSONSchema } from '@/lib/plugins/types';

describe('Config Encryption Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getPasswordFields', () => {
    it('should extract fields with format: "password"', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          apiKey: { type: 'string', format: 'password' },
          name: { type: 'string' },
          secretToken: { type: 'string', format: 'password' },
          count: { type: 'number' },
        },
      };

      const fields = getPasswordFields(schema);
      expect(fields).toEqual(['apiKey', 'secretToken']);
    });

    it('should return empty array for null schema', () => {
      expect(getPasswordFields(null)).toEqual([]);
      expect(getPasswordFields(undefined)).toEqual([]);
    });

    it('should return empty array for schema without properties', () => {
      const schema: JSONSchema = { type: 'object' };
      expect(getPasswordFields(schema)).toEqual([]);
    });

    it('should return empty array when no password fields exist', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          enabled: { type: 'boolean' },
        },
      };
      expect(getPasswordFields(schema)).toEqual([]);
    });
  });

  describe('encryptConfigFields', () => {
    it('should encrypt plaintext values', () => {
      const config = { apiKey: 'my-secret-key', name: 'test' };
      const existingConfig = {};
      const passwordFields = ['apiKey'];

      const result = encryptConfigFields(config, existingConfig, passwordFields);

      expect(result.apiKey).toMatch(/^enc:v1:/);
      expect(result.name).toBe('test');
    });

    it('should preserve existing encrypted value when placeholder is used', () => {
      const existingEncrypted = 'enc:v1:' + Buffer.from('real-key').toString('base64');
      const config = { apiKey: PASSWORD_PLACEHOLDER };
      const existingConfig = { apiKey: existingEncrypted };
      const passwordFields = ['apiKey'];

      const result = encryptConfigFields(config, existingConfig, passwordFields);

      expect(result.apiKey).toBe(existingEncrypted);
    });

    it('should skip already-encrypted values', () => {
      const encrypted = 'enc:v1:' + Buffer.from('key').toString('base64');
      const config = { apiKey: encrypted };
      const existingConfig = {};
      const passwordFields = ['apiKey'];

      const result = encryptConfigFields(config, existingConfig, passwordFields);

      expect(result.apiKey).toBe(encrypted);
    });

    it('should skip null, undefined, and empty values', () => {
      const config = { apiKey: null, secret: undefined, token: '' };
      const result = encryptConfigFields(
        config as Record<string, unknown>,
        {},
        ['apiKey', 'secret', 'token']
      );

      expect(result.apiKey).toBeNull();
      expect(result.secret).toBeUndefined();
      expect(result.token).toBe('');
    });

    it('should return config unchanged when no password fields', () => {
      const config = { name: 'test', apiKey: 'key' };
      const result = encryptConfigFields(config, {}, []);
      expect(result).toEqual(config);
    });
  });

  describe('decryptConfigFields', () => {
    it('should decrypt encrypted values', () => {
      const encrypted = 'enc:v1:' + Buffer.from('my-secret').toString('base64');
      const config = { apiKey: encrypted, name: 'test' };
      const passwordFields = ['apiKey'];

      const result = decryptConfigFields(config, passwordFields);

      expect(result.apiKey).toBe('my-secret');
      expect(result.name).toBe('test');
    });

    it('should pass through non-encrypted string values', () => {
      const config = { apiKey: 'plain-text' };
      const passwordFields = ['apiKey'];

      const result = decryptConfigFields(config, passwordFields);

      expect(result.apiKey).toBe('plain-text');
    });

    it('should handle non-string values gracefully', () => {
      const config = { apiKey: 12345 };
      const passwordFields = ['apiKey'];

      const result = decryptConfigFields(config as Record<string, unknown>, passwordFields);

      expect(result.apiKey).toBe(12345);
    });

    it('should return config unchanged when no password fields', () => {
      const config = { name: 'test' };
      const result = decryptConfigFields(config, []);
      expect(result).toEqual(config);
    });
  });

  describe('maskConfigFields', () => {
    it('should replace non-empty values with placeholder', () => {
      const config = { apiKey: 'secret-value', name: 'test' };
      const passwordFields = ['apiKey'];

      const result = maskConfigFields(config, passwordFields);

      expect(result.apiKey).toBe(PASSWORD_PLACEHOLDER);
      expect(result.name).toBe('test');
    });

    it('should preserve null, undefined, and empty values', () => {
      const config = { apiKey: null, secret: undefined, token: '' };
      const result = maskConfigFields(
        config as Record<string, unknown>,
        ['apiKey', 'secret', 'token']
      );

      expect(result.apiKey).toBeNull();
      expect(result.secret).toBeUndefined();
      expect(result.token).toBe('');
    });

    it('should return config unchanged when no password fields', () => {
      const config = { name: 'test' };
      const result = maskConfigFields(config, []);
      expect(result).toEqual(config);
    });
  });

  describe('round-trip: encrypt then decrypt', () => {
    it('should return original values after encrypt then decrypt', () => {
      const original = { apiKey: 'super-secret-key-123', name: 'test' };
      const passwordFields = ['apiKey'];

      const encrypted = encryptConfigFields(original, {}, passwordFields);
      const decrypted = decryptConfigFields(encrypted, passwordFields);

      expect(decrypted.apiKey).toBe('super-secret-key-123');
      expect(decrypted.name).toBe('test');
    });
  });
});
