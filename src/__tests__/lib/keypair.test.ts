/**
 * Tests for RSA Keypair Generation and Encryption
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  generateKeyPair,
  generateKeyPairWithSize,
  encryptWithPublicKey,
  decryptWithPrivateKey,
  hybridEncrypt,
  hybridDecrypt,
  isValidPublicKey,
  isValidPrivateKey,
  getPublicKeyFingerprint,
  verifyKeyPair,
} from '@/lib/security/keypair';
// Encryption functions available if needed for future tests
// import { encryptString, decryptString } from '@/lib/security/encryption';

// Mock environment
const mockEnv = {
  NEXTAUTH_SECRET: 'a-very-secure-secret-that-is-at-least-32-characters-long',
  NODE_ENV: 'test',
};

describe('RSA Keypair Module', () => {
  beforeEach(() => {
    vi.stubEnv('NEXTAUTH_SECRET', mockEnv.NEXTAUTH_SECRET);
    vi.stubEnv('NODE_ENV', mockEnv.NODE_ENV);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('generateKeyPair', () => {
    it('should generate a valid keypair', () => {
      const result = generateKeyPair();
      
      expect(result.success).toBe(true);
      expect(result.publicKey).toBeDefined();
      expect(result.privateKeyEncrypted).toBeDefined();
      
      // Public key should be PEM format
      expect(result.publicKey).toContain('-----BEGIN PUBLIC KEY-----');
      expect(result.publicKey).toContain('-----END PUBLIC KEY-----');
      
      // Private key should be encrypted
      expect(result.privateKeyEncrypted).toContain('enc:v1:');
    });

    it('should generate different keypairs each time', () => {
      const result1 = generateKeyPair();
      const result2 = generateKeyPair();
      
      expect(result1.publicKey).not.toBe(result2.publicKey);
    });
  });

  describe('generateKeyPairWithSize', () => {
    it('should generate RSA-2048 by default', () => {
      const result = generateKeyPairWithSize();
      
      expect(result.success).toBe(true);
      expect(result.publicKey).toBeDefined();
    });

    it('should generate RSA-3072 when specified', () => {
      const result = generateKeyPairWithSize(3072);
      
      expect(result.success).toBe(true);
      expect(result.publicKey).toBeDefined();
      // 3072-bit keys produce longer keys
      expect(result.publicKey!.length).toBeGreaterThan(400);
    });
  });

  describe('encryptWithPublicKey / decryptWithPrivateKey', () => {
    it('should encrypt and decrypt short messages', () => {
      const keypair = generateKeyPair();
      const message = 'Hello, encryption!';
      
      const encrypted = encryptWithPublicKey(message, keypair.publicKey!);
      const result = decryptWithPrivateKey(encrypted, keypair.privateKeyEncrypted!);
      
      expect(result.success).toBe(true);
      expect(result.plaintext).toBe(message);
    });

    it('should produce different ciphertext for same message', () => {
      const keypair = generateKeyPair();
      const message = 'Same message';
      
      const encrypted1 = encryptWithPublicKey(message, keypair.publicKey!);
      const encrypted2 = encryptWithPublicKey(message, keypair.publicKey!);
      
      // OAEP padding includes randomness
      expect(encrypted1).not.toBe(encrypted2);
      
      // But both decrypt to the same value
      expect(decryptWithPrivateKey(encrypted1, keypair.privateKeyEncrypted!).plaintext).toBe(message);
      expect(decryptWithPrivateKey(encrypted2, keypair.privateKeyEncrypted!).plaintext).toBe(message);
    });

    it('should fail to decrypt with wrong key', () => {
      const keypair1 = generateKeyPair();
      const keypair2 = generateKeyPair();
      const message = 'Secret message';
      
      const encrypted = encryptWithPublicKey(message, keypair1.publicKey!);
      const result = decryptWithPrivateKey(encrypted, keypair2.privateKeyEncrypted!);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('hybridEncrypt / hybridDecrypt', () => {
    it('should encrypt and decrypt large payloads', () => {
      const keypair = generateKeyPair();
      const largePayload = JSON.stringify({
        name: 'Jane Developer',
        email: 'jane@example.com',
        bio: 'A'.repeat(10000), // Large bio
        company: 'Tech Corp',
      });
      
      const encrypted = hybridEncrypt(largePayload, keypair.publicKey!);
      
      expect(encrypted.encryptedKey).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.authTag).toBeDefined();
      expect(encrypted.ciphertext).toBeDefined();
      
      const result = hybridDecrypt(encrypted, keypair.privateKeyEncrypted!);
      
      expect(result.success).toBe(true);
      expect(result.plaintext).toBe(largePayload);
    });

    it('should encrypt JSON speaker profiles', () => {
      const keypair = generateKeyPair();
      const speakerProfile = {
        speakerId: 'speaker-123',
        profile: {
          fullName: 'Test Speaker',
          bio: 'A test speaker biography',
          company: 'Test Inc',
        },
        email: 'speaker@example.com',
        socialLinks: {
          twitter: 'testspeaker',
          linkedin: 'in/testspeaker',
        },
      };
      
      const payload = JSON.stringify(speakerProfile);
      const encrypted = hybridEncrypt(payload, keypair.publicKey!);
      const result = hybridDecrypt(encrypted, keypair.privateKeyEncrypted!);
      
      expect(result.success).toBe(true);
      const decryptedProfile = JSON.parse(result.plaintext!);
      expect(decryptedProfile.speakerId).toBe('speaker-123');
      expect(decryptedProfile.profile.fullName).toBe('Test Speaker');
    });

    it('should detect tampering with ciphertext', () => {
      const keypair = generateKeyPair();
      const payload = 'Sensitive data';
      
      const encrypted = hybridEncrypt(payload, keypair.publicKey!);
      
      // Tamper with the ciphertext
      const tamperedCiphertext = Buffer.from(encrypted.ciphertext, 'base64');
      tamperedCiphertext[0] ^= 0xff;
      encrypted.ciphertext = tamperedCiphertext.toString('base64');
      
      const result = hybridDecrypt(encrypted, keypair.privateKeyEncrypted!);
      
      expect(result.success).toBe(false);
    });

    it('should detect tampering with auth tag', () => {
      const keypair = generateKeyPair();
      const payload = 'Sensitive data';
      
      const encrypted = hybridEncrypt(payload, keypair.publicKey!);
      
      // Tamper with the auth tag
      const tamperedTag = Buffer.from(encrypted.authTag, 'base64');
      tamperedTag[0] ^= 0xff;
      encrypted.authTag = tamperedTag.toString('base64');
      
      const result = hybridDecrypt(encrypted, keypair.privateKeyEncrypted!);
      
      expect(result.success).toBe(false);
    });
  });

  describe('isValidPublicKey', () => {
    it('should return true for valid public keys', () => {
      const keypair = generateKeyPair();
      
      expect(isValidPublicKey(keypair.publicKey!)).toBe(true);
    });

    it('should return false for invalid strings', () => {
      expect(isValidPublicKey('not a key')).toBe(false);
      expect(isValidPublicKey('')).toBe(false);
      expect(isValidPublicKey('-----BEGIN PUBLIC KEY-----\ninvalid\n-----END PUBLIC KEY-----')).toBe(false);
    });
  });

  describe('isValidPrivateKey', () => {
    it('should return true for valid encrypted private keys', () => {
      const keypair = generateKeyPair();
      
      expect(isValidPrivateKey(keypair.privateKeyEncrypted!)).toBe(true);
    });

    it('should return false for invalid strings', () => {
      expect(isValidPrivateKey('not encrypted')).toBe(false);
      expect(isValidPrivateKey('')).toBe(false);
    });
  });

  describe('getPublicKeyFingerprint', () => {
    it('should return a consistent fingerprint', () => {
      const keypair = generateKeyPair();
      
      const fingerprint1 = getPublicKeyFingerprint(keypair.publicKey!);
      const fingerprint2 = getPublicKeyFingerprint(keypair.publicKey!);
      
      expect(fingerprint1).toBe(fingerprint2);
    });

    it('should return different fingerprints for different keys', () => {
      const keypair1 = generateKeyPair();
      const keypair2 = generateKeyPair();
      
      const fingerprint1 = getPublicKeyFingerprint(keypair1.publicKey!);
      const fingerprint2 = getPublicKeyFingerprint(keypair2.publicKey!);
      
      expect(fingerprint1).not.toBe(fingerprint2);
    });

    it('should be colon-separated hex', () => {
      const keypair = generateKeyPair();
      const fingerprint = getPublicKeyFingerprint(keypair.publicKey!);
      
      // Should look like: aa:bb:cc:dd:...
      expect(fingerprint).toMatch(/^[0-9a-f]{2}(:[0-9a-f]{2})+$/);
    });
  });

  describe('verifyKeyPair', () => {
    it('should return true for matching keypairs', () => {
      const keypair = generateKeyPair();
      
      const isValid = verifyKeyPair(keypair.publicKey!, keypair.privateKeyEncrypted!);
      
      expect(isValid).toBe(true);
    });

    it('should return false for mismatched keypairs', () => {
      const keypair1 = generateKeyPair();
      const keypair2 = generateKeyPair();
      
      const isValid = verifyKeyPair(keypair1.publicKey!, keypair2.privateKeyEncrypted!);
      
      expect(isValid).toBe(false);
    });

    it('should return false for invalid inputs', () => {
      expect(verifyKeyPair('invalid', 'invalid')).toBe(false);
    });
  });

  describe('Integration: Full encryption flow', () => {
    it('should simulate cfp.directory to self-hosted data transfer', () => {
      // Step 1: Self-hosted generates keypair
      const selfHostedKeypair = generateKeyPair();
      expect(selfHostedKeypair.success).toBe(true);
      
      // Step 2: Public key is registered with cfp.directory (simulated)
      const publicKeyForCfpDirectory = selfHostedKeypair.publicKey!;
      
      // Step 3: cfp.directory encrypts speaker data with public key
      const speakerData = {
        speakerId: 'cfp-speaker-456',
        profile: {
          fullName: 'Conference Speaker',
          bio: 'Expert in distributed systems',
          email: 'speaker@conference.com',
        },
        consentedScopes: ['profile', 'email'],
      };
      
      const encryptedPayload = hybridEncrypt(
        JSON.stringify(speakerData),
        publicKeyForCfpDirectory
      );
      
      // Step 4: Self-hosted receives and decrypts with private key
      const decryptResult = hybridDecrypt(
        encryptedPayload,
        selfHostedKeypair.privateKeyEncrypted!
      );
      
      expect(decryptResult.success).toBe(true);
      
      const receivedData = JSON.parse(decryptResult.plaintext!);
      expect(receivedData.speakerId).toBe('cfp-speaker-456');
      expect(receivedData.profile.fullName).toBe('Conference Speaker');
      expect(receivedData.profile.email).toBe('speaker@conference.com');
    });
  });
});
