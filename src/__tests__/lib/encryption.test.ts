/**
 * Tests for the encryption module
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  encrypt,
  decrypt,
  encryptString,
  decryptString,
  isEncrypted,
  encryptPiiFields,
  decryptPiiFields,
  secureCompare,
  generateSecureToken,
  FEDERATED_SPEAKER_PII_FIELDS,
  USER_PII_FIELDS,
  SPEAKER_PROFILE_PII_FIELDS,
  REVIEWER_PROFILE_PII_FIELDS,
} from '@/lib/security/encryption';

// Mock environment variables
const mockEnv = {
  NEXTAUTH_SECRET: 'a-very-secure-secret-that-is-at-least-32-characters-long',
  FEDERATION_LICENSE_KEY: 'optional-license-key-for-extra-entropy',
  NODE_ENV: 'test',
};

describe('Encryption Module', () => {
  beforeEach(() => {
    // Set up environment variables
    vi.stubEnv('NEXTAUTH_SECRET', mockEnv.NEXTAUTH_SECRET);
    vi.stubEnv('FEDERATION_LICENSE_KEY', mockEnv.FEDERATION_LICENSE_KEY);
    vi.stubEnv('NODE_ENV', mockEnv.NODE_ENV);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('encrypt / decrypt', () => {
    it('should encrypt and decrypt a simple string', () => {
      const plaintext = 'Hello, World!';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertext for same plaintext (random IV)', () => {
      const plaintext = 'Same text twice';
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);
      
      // Different IVs mean different ciphertexts
      expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
      
      // But both decrypt to the same value
      expect(decrypt(encrypted1)).toBe(plaintext);
      expect(decrypt(encrypted2)).toBe(plaintext);
    });

    it('should handle unicode characters', () => {
      const plaintext = '你好世界 🔐 émojis & spëcial chârs';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should handle empty string', () => {
      const plaintext = '';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should handle very long strings', () => {
      const plaintext = 'A'.repeat(10000);
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should throw on tampered ciphertext', () => {
      const encrypted = encrypt('test');
      
      // Tamper with the ciphertext
      const tamperedCiphertext = Buffer.from(encrypted.ciphertext, 'base64');
      tamperedCiphertext[0] ^= 0xff;
      encrypted.ciphertext = tamperedCiphertext.toString('base64');
      
      expect(() => decrypt(encrypted)).toThrow();
    });

    it('should throw on tampered auth tag', () => {
      const encrypted = encrypt('test');
      
      // Tamper with the auth tag
      const tamperedTag = Buffer.from(encrypted.authTag, 'base64');
      tamperedTag[0] ^= 0xff;
      encrypted.authTag = tamperedTag.toString('base64');
      
      expect(() => decrypt(encrypted)).toThrow();
    });
  });

  describe('encryptString / decryptString', () => {
    it('should encrypt and decrypt with encoded format', () => {
      const plaintext = 'secret data';
      const encoded = encryptString(plaintext);
      const decrypted = decryptString(encoded);
      
      expect(decrypted).toBe(plaintext);
      expect(encoded.startsWith('enc:v1:')).toBe(true);
    });

    it('should return empty string as-is', () => {
      expect(encryptString('')).toBe('');
      expect(decryptString('')).toBe('');
    });

    it('should return null/undefined as-is', () => {
      // @ts-expect-error - testing null handling
      expect(encryptString(null)).toBe(null);
      // @ts-expect-error - testing undefined handling
      expect(decryptString(undefined)).toBe(undefined);
    });

    it('should not double-encrypt already encrypted values', () => {
      const plaintext = 'original';
      const encrypted = encryptString(plaintext);
      
      // decryptString should handle already-encrypted values
      const decrypted = decryptString(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should return non-encrypted strings as-is when decrypting', () => {
      const plaintext = 'not encrypted';
      const result = decryptString(plaintext);
      
      expect(result).toBe(plaintext);
    });
  });

  describe('isEncrypted', () => {
    it('should detect encrypted strings', () => {
      const encrypted = encryptString('test');
      
      expect(isEncrypted(encrypted)).toBe(true);
    });

    it('should detect non-encrypted strings', () => {
      expect(isEncrypted('plain text')).toBe(false);
      expect(isEncrypted('')).toBe(false);
      expect(isEncrypted('enc:')).toBe(false);
      expect(isEncrypted('enc:v2:')).toBe(false);
    });

    it('should handle null/undefined', () => {
      // @ts-expect-error - testing null handling
      expect(isEncrypted(null)).toBe(false);
      // @ts-expect-error - testing undefined handling
      expect(isEncrypted(undefined)).toBe(false);
    });
  });

  describe('encryptPiiFields / decryptPiiFields', () => {
    it('should encrypt specified PII fields', () => {
      const data = {
        name: 'John Doe',
        email: 'john@example.com',
        bio: 'A speaker bio',
        id: '123', // Not a PII field, should remain unchanged
        createdAt: new Date(),
      };

      const encrypted = encryptPiiFields(data, ['name', 'email', 'bio']);

      expect(isEncrypted(encrypted.name as string)).toBe(true);
      expect(isEncrypted(encrypted.email as string)).toBe(true);
      expect(isEncrypted(encrypted.bio as string)).toBe(true);
      expect(encrypted.id).toBe('123');
    });

    it('should decrypt specified PII fields', () => {
      const original = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        company: 'Acme Inc',
      };

      const encrypted = encryptPiiFields(original, ['name', 'email', 'company']);
      const decrypted = decryptPiiFields(encrypted, ['name', 'email', 'company']);

      expect(decrypted.name).toBe(original.name);
      expect(decrypted.email).toBe(original.email);
      expect(decrypted.company).toBe(original.company);
    });

    it('should not encrypt null or undefined values', () => {
      const data = {
        name: 'Test',
        email: null,
        bio: undefined,
      };

      const encrypted = encryptPiiFields(data, ['name', 'email', 'bio']);

      expect(isEncrypted(encrypted.name as string)).toBe(true);
      expect(encrypted.email).toBe(null);
      expect(encrypted.bio).toBe(undefined);
    });

    it('should not re-encrypt already encrypted values', () => {
      const original = { name: 'Test User' };
      const encrypted1 = encryptPiiFields(original, ['name']);
      const encrypted2 = encryptPiiFields(encrypted1, ['name']);

      // Should not double-encrypt
      const decrypted = decryptPiiFields(encrypted2, ['name']);
      expect(decrypted.name).toBe(original.name);
    });

    it('should use default PII fields when not specified', () => {
      const data = {
        name: 'Speaker Name',
        email: 'speaker@example.com',
        bio: 'Speaker bio',
        company: 'Company',
        position: 'Developer',
        id: 'unchanged',
      };

      const encrypted = encryptPiiFields(data);

      // Check that known PII fields are encrypted
      expect(isEncrypted(encrypted.name as string)).toBe(true);
      expect(isEncrypted(encrypted.email as string)).toBe(true);
      expect(encrypted.id).toBe('unchanged');
    });

    it('should handle decryption failures gracefully', () => {
      const data = {
        name: 'enc:v1:invalid:data:here:bad',
        email: 'plain@email.com',
      };

      // Should not throw, should keep original value on failure
      const decrypted = decryptPiiFields(data, ['name', 'email']);
      
      expect(decrypted.email).toBe(data.email);
    });
  });

  describe('PII Field Constants', () => {
    describe('FEDERATED_SPEAKER_PII_FIELDS', () => {
      it('should contain expected fields', () => {
        expect(FEDERATED_SPEAKER_PII_FIELDS).toContain('email');
        expect(FEDERATED_SPEAKER_PII_FIELDS).toContain('name');
        expect(FEDERATED_SPEAKER_PII_FIELDS).toContain('bio');
        expect(FEDERATED_SPEAKER_PII_FIELDS).toContain('company');
        expect(FEDERATED_SPEAKER_PII_FIELDS).toContain('position');
        expect(FEDERATED_SPEAKER_PII_FIELDS).toContain('linkedinUrl');
        expect(FEDERATED_SPEAKER_PII_FIELDS).toContain('twitterHandle');
        expect(FEDERATED_SPEAKER_PII_FIELDS).toContain('githubUsername');
      });
    });

    describe('USER_PII_FIELDS', () => {
      it('should contain name but not email (email needed for auth lookups)', () => {
        expect(USER_PII_FIELDS).toContain('name');
        // Email is NOT encrypted for users because it's needed for authentication
        expect(USER_PII_FIELDS).not.toContain('email');
      });
    });

    describe('SPEAKER_PROFILE_PII_FIELDS', () => {
      it('should contain all speaker profile PII fields', () => {
        expect(SPEAKER_PROFILE_PII_FIELDS).toContain('fullName');
        expect(SPEAKER_PROFILE_PII_FIELDS).toContain('bio');
        expect(SPEAKER_PROFILE_PII_FIELDS).toContain('location');
        expect(SPEAKER_PROFILE_PII_FIELDS).toContain('company');
        expect(SPEAKER_PROFILE_PII_FIELDS).toContain('position');
        expect(SPEAKER_PROFILE_PII_FIELDS).toContain('linkedinUrl');
        expect(SPEAKER_PROFILE_PII_FIELDS).toContain('twitterHandle');
        expect(SPEAKER_PROFILE_PII_FIELDS).toContain('githubUsername');
        expect(SPEAKER_PROFILE_PII_FIELDS).toContain('websiteUrl');
        expect(SPEAKER_PROFILE_PII_FIELDS).toContain('speakingExperience');
        expect(SPEAKER_PROFILE_PII_FIELDS).toContain('photoUrl');
      });
    });

    describe('REVIEWER_PROFILE_PII_FIELDS', () => {
      it('should contain all reviewer profile PII fields', () => {
        expect(REVIEWER_PROFILE_PII_FIELDS).toContain('fullName');
        expect(REVIEWER_PROFILE_PII_FIELDS).toContain('designation');
        expect(REVIEWER_PROFILE_PII_FIELDS).toContain('company');
        expect(REVIEWER_PROFILE_PII_FIELDS).toContain('bio');
        expect(REVIEWER_PROFILE_PII_FIELDS).toContain('linkedinUrl');
        expect(REVIEWER_PROFILE_PII_FIELDS).toContain('twitterHandle');
        expect(REVIEWER_PROFILE_PII_FIELDS).toContain('githubUsername');
        expect(REVIEWER_PROFILE_PII_FIELDS).toContain('websiteUrl');
        expect(REVIEWER_PROFILE_PII_FIELDS).toContain('photoUrl');
        expect(REVIEWER_PROFILE_PII_FIELDS).toContain('conferencesReviewed');
      });
    });
  });

  describe('secureCompare', () => {
    it('should return true for equal strings', () => {
      expect(secureCompare('test', 'test')).toBe(true);
      expect(secureCompare('', '')).toBe(true);
    });

    it('should return false for different strings', () => {
      expect(secureCompare('test', 'Test')).toBe(false);
      expect(secureCompare('test', 'test!')).toBe(false);
    });

    it('should return false for different length strings', () => {
      expect(secureCompare('short', 'longer string')).toBe(false);
    });
  });

  describe('generateSecureToken', () => {
    it('should generate token of correct length', () => {
      const token = generateSecureToken(32);
      expect(token.length).toBe(64); // 32 bytes = 64 hex chars
    });

    it('should generate unique tokens', () => {
      const token1 = generateSecureToken();
      const token2 = generateSecureToken();
      
      expect(token1).not.toBe(token2);
    });

    it('should only contain hex characters', () => {
      const token = generateSecureToken();
      expect(/^[0-9a-f]+$/.test(token)).toBe(true);
    });
  });

  describe('Key derivation', () => {
    it('should fail without NEXTAUTH_SECRET or ENCRYPTION_KEY', () => {
      vi.stubEnv('NEXTAUTH_SECRET', '');
      vi.stubEnv('ENCRYPTION_KEY', '');
      
      expect(() => encrypt('test')).toThrow();
    });

    it('should fail with short NEXTAUTH_SECRET and no ENCRYPTION_KEY', () => {
      vi.stubEnv('NEXTAUTH_SECRET', 'too-short');
      vi.stubEnv('ENCRYPTION_KEY', '');
      
      expect(() => encrypt('test')).toThrow();
    });

    it('should prefer ENCRYPTION_KEY over NEXTAUTH_SECRET', () => {
      const encryptionKey = 'dedicated-encryption-key-at-least-32-characters-long';
      vi.stubEnv('ENCRYPTION_KEY', encryptionKey);
      vi.stubEnv('NEXTAUTH_SECRET', mockEnv.NEXTAUTH_SECRET);
      
      const plaintext = 'test with encryption key';
      const encrypted = encryptString(plaintext);
      
      // Should be able to decrypt with same key
      const decrypted = decryptString(encrypted);
      expect(decrypted).toBe(plaintext);
      
      // If we remove ENCRYPTION_KEY, decryption should fail (different key)
      vi.stubEnv('ENCRYPTION_KEY', '');
      expect(() => decryptString(encrypted)).toThrow();
    });

    it('should fallback to NEXTAUTH_SECRET when ENCRYPTION_KEY is not set', () => {
      vi.stubEnv('ENCRYPTION_KEY', '');
      vi.stubEnv('NEXTAUTH_SECRET', mockEnv.NEXTAUTH_SECRET);
      
      const plaintext = 'test with nextauth secret';
      const encrypted = encryptString(plaintext);
      const decrypted = decryptString(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should work without FEDERATION_LICENSE_KEY', () => {
      vi.stubEnv('FEDERATION_LICENSE_KEY', '');
      
      const plaintext = 'test without license key';
      const encrypted = encryptString(plaintext);
      const decrypted = decryptString(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertext with different license keys', () => {
      // First encryption with license key
      vi.stubEnv('FEDERATION_LICENSE_KEY', 'key1');
      const encrypted1 = encrypt('test');
      
      // Second encryption with different license key
      vi.stubEnv('FEDERATION_LICENSE_KEY', 'key2');
      const encrypted2 = encrypt('test');
      
      // Different keys produce different ciphertext
      expect(encrypted1).not.toBe(encrypted2);
      
      // Verify first encryption can still be decrypted with original key
      vi.stubEnv('FEDERATION_LICENSE_KEY', 'key1');
      expect(decrypt(encrypted1)).toBe('test');
    });
  });

  describe('Real-world federated speaker data', () => {
    it('should encrypt and decrypt a full speaker profile', () => {
      const speakerData = {
        id: 'speaker-123',
        cfpDirectorySpeakerId: 'cfp-456',
        name: 'Jane Developer',
        email: 'jane@example.com',
        bio: 'Senior software engineer with 10 years of experience in distributed systems.',
        location: 'San Francisco, CA',
        company: 'Tech Corp',
        position: 'Principal Engineer',
        websiteUrl: 'https://janedeveloper.com',
        linkedinUrl: 'https://linkedin.com/in/janedeveloper',
        twitterHandle: 'janedeveloper',
        githubUsername: 'janedev',
        speakingExperience: 'Keynote at 5 major conferences, 50+ talks at meetups.',
        expertiseTags: ['distributed-systems', 'golang', 'kubernetes'],
        languages: ['English', 'Spanish'],
        consentGrantedAt: new Date(),
        consentScopes: ['profile', 'email'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Encrypt
      const encrypted = encryptPiiFields(speakerData, FEDERATED_SPEAKER_PII_FIELDS);

      // Verify PII is encrypted
      expect(isEncrypted(encrypted.name as string)).toBe(true);
      expect(isEncrypted(encrypted.email as string)).toBe(true);
      expect(isEncrypted(encrypted.bio as string)).toBe(true);
      expect(isEncrypted(encrypted.linkedinUrl as string)).toBe(true);
      
      // Verify non-PII is unchanged
      expect(encrypted.id).toBe(speakerData.id);
      expect(encrypted.cfpDirectorySpeakerId).toBe(speakerData.cfpDirectorySpeakerId);
      expect(encrypted.expertiseTags).toEqual(speakerData.expertiseTags);
      
      // Decrypt
      const decrypted = decryptPiiFields(encrypted, FEDERATED_SPEAKER_PII_FIELDS);

      // Verify all data is restored
      expect(decrypted.name).toBe(speakerData.name);
      expect(decrypted.email).toBe(speakerData.email);
      expect(decrypted.bio).toBe(speakerData.bio);
      expect(decrypted.company).toBe(speakerData.company);
      expect(decrypted.linkedinUrl).toBe(speakerData.linkedinUrl);
      expect(decrypted.twitterHandle).toBe(speakerData.twitterHandle);
    });
  });
});
