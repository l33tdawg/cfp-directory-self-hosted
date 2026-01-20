/**
 * Data Encryption Module
 * 
 * Provides AES-256-GCM encryption for sensitive PII data at rest.
 * 
 * Key derivation:
 * - Uses PBKDF2 to derive encryption key from NEXTAUTH_SECRET
 * - Optional additional entropy from federation license key
 * 
 * Security features:
 * - AES-256-GCM (authenticated encryption)
 * - Random 96-bit IV per encryption
 * - 128-bit authentication tag
 * - Key derivation with 100,000 iterations
 */

import crypto from 'crypto';

// =============================================================================
// Configuration
// =============================================================================

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits for AES-256
const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 16;

// Prefix for encrypted values to identify them
const ENCRYPTED_PREFIX = 'enc:v1:';

// =============================================================================
// Key Derivation
// =============================================================================

/**
 * Get the master secret for key derivation.
 * Combines NEXTAUTH_SECRET with optional license key for additional entropy.
 */
function getMasterSecret(): string {
  const baseSecret = process.env.NEXTAUTH_SECRET;
  
  if (!baseSecret || baseSecret.length < 32) {
    throw new Error('NEXTAUTH_SECRET must be at least 32 characters for encryption');
  }
  
  // Optionally include license key for additional entropy
  const licenseKey = process.env.FEDERATION_LICENSE_KEY;
  if (licenseKey) {
    return `${baseSecret}:${licenseKey}`;
  }
  
  return baseSecret;
}

/**
 * Derive an encryption key using PBKDF2.
 * 
 * @param salt - The salt for key derivation
 * @returns The derived 256-bit key
 */
function deriveKey(salt: Buffer): Buffer {
  const masterSecret = getMasterSecret();
  
  return crypto.pbkdf2Sync(
    masterSecret,
    salt,
    PBKDF2_ITERATIONS,
    KEY_LENGTH,
    'sha256'
  );
}

// =============================================================================
// Encryption / Decryption
// =============================================================================

export interface EncryptedData {
  ciphertext: string; // Base64 encoded
  iv: string; // Base64 encoded
  authTag: string; // Base64 encoded
  salt: string; // Base64 encoded (for key derivation)
}

/**
 * Encrypt a string value using AES-256-GCM.
 * 
 * @param plaintext - The value to encrypt
 * @returns Encrypted data object
 */
export function encrypt(plaintext: string): EncryptedData {
  // Generate random IV and salt
  const iv = crypto.randomBytes(IV_LENGTH);
  const salt = crypto.randomBytes(SALT_LENGTH);
  
  // Derive key from master secret
  const key = deriveKey(salt);
  
  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  
  // Encrypt
  let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
  ciphertext += cipher.final('base64');
  
  // Get auth tag
  const authTag = cipher.getAuthTag();
  
  return {
    ciphertext,
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    salt: salt.toString('base64'),
  };
}

/**
 * Decrypt an encrypted value using AES-256-GCM.
 * 
 * @param encryptedData - The encrypted data object
 * @returns The decrypted plaintext
 * @throws Error if decryption fails (invalid data or tampering detected)
 */
export function decrypt(encryptedData: EncryptedData): string {
  // Decode Base64 values
  const iv = Buffer.from(encryptedData.iv, 'base64');
  const salt = Buffer.from(encryptedData.salt, 'base64');
  const authTag = Buffer.from(encryptedData.authTag, 'base64');
  const ciphertext = Buffer.from(encryptedData.ciphertext, 'base64');
  
  // Derive key using same salt
  const key = deriveKey(salt);
  
  // Create decipher
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  
  // Set auth tag for verification
  decipher.setAuthTag(authTag);
  
  // Decrypt
  let plaintext = decipher.update(ciphertext);
  plaintext = Buffer.concat([plaintext, decipher.final()]);
  
  return plaintext.toString('utf8');
}

// =============================================================================
// String Encoding Helpers
// =============================================================================

/**
 * Encrypt a string and return as a single encoded string.
 * Format: enc:v1:<salt>:<iv>:<authTag>:<ciphertext>
 * 
 * @param plaintext - The value to encrypt
 * @returns Encoded encrypted string
 */
export function encryptString(plaintext: string): string {
  if (!plaintext) return plaintext;
  
  const encrypted = encrypt(plaintext);
  return `${ENCRYPTED_PREFIX}${encrypted.salt}:${encrypted.iv}:${encrypted.authTag}:${encrypted.ciphertext}`;
}

/**
 * Decrypt an encoded encrypted string.
 * 
 * @param encodedValue - The encoded encrypted string
 * @returns The decrypted plaintext
 */
export function decryptString(encodedValue: string): string {
  if (!encodedValue) return encodedValue;
  
  // Check if the value is encrypted
  if (!isEncrypted(encodedValue)) {
    return encodedValue;
  }
  
  // Parse encoded string
  const withoutPrefix = encodedValue.slice(ENCRYPTED_PREFIX.length);
  const [salt, iv, authTag, ciphertext] = withoutPrefix.split(':');
  
  if (!salt || !iv || !authTag || !ciphertext) {
    throw new Error('Invalid encrypted string format');
  }
  
  return decrypt({ salt, iv, authTag, ciphertext });
}

/**
 * Check if a value is encrypted (has the encryption prefix).
 */
export function isEncrypted(value: string): boolean {
  return value?.startsWith(ENCRYPTED_PREFIX) ?? false;
}

// =============================================================================
// PII Encryption Helpers
// =============================================================================

/**
 * PII fields that should be encrypted in FederatedSpeaker.
 */
export const FEDERATED_SPEAKER_PII_FIELDS = [
  'email',
  'name',
  'bio',
  'location',
  'company',
  'position',
  'linkedinUrl',
  'twitterHandle',
  'githubUsername',
  'websiteUrl',
  'speakingExperience',
] as const;

export type FederatedSpeakerPiiField = typeof FEDERATED_SPEAKER_PII_FIELDS[number];

/**
 * Encrypt PII fields in a federated speaker object.
 * 
 * @param data - Object containing PII fields
 * @param fieldsToEncrypt - Array of field names to encrypt (defaults to all PII fields)
 * @returns Object with encrypted fields
 */
export function encryptPiiFields<T extends Record<string, unknown>>(
  data: T,
  fieldsToEncrypt: readonly string[] = FEDERATED_SPEAKER_PII_FIELDS
): T {
  const result = { ...data };
  
  for (const field of fieldsToEncrypt) {
    const value = result[field];
    if (typeof value === 'string' && value && !isEncrypted(value)) {
      (result as Record<string, unknown>)[field] = encryptString(value);
    }
  }
  
  return result;
}

/**
 * Decrypt PII fields in a federated speaker object.
 * 
 * @param data - Object containing encrypted PII fields
 * @param fieldsToDecrypt - Array of field names to decrypt (defaults to all PII fields)
 * @returns Object with decrypted fields
 */
export function decryptPiiFields<T extends Record<string, unknown>>(
  data: T,
  fieldsToDecrypt: readonly string[] = FEDERATED_SPEAKER_PII_FIELDS
): T {
  const result = { ...data };
  
  for (const field of fieldsToDecrypt) {
    const value = result[field];
    if (typeof value === 'string' && isEncrypted(value)) {
      try {
        (result as Record<string, unknown>)[field] = decryptString(value);
      } catch (error) {
        console.error(`Failed to decrypt field ${field}:`, error);
        // Keep original value if decryption fails
      }
    }
  }
  
  return result;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Re-encrypt data with a new key.
 * Useful when rotating encryption keys.
 * 
 * @param encryptedValue - The currently encrypted value
 * @param oldSecret - The old master secret (to decrypt)
 * @param newSecret - The new master secret (to encrypt)
 * @returns Newly encrypted value
 */
export function reEncrypt(
  _encryptedValue: string,
  _oldSecret: string,
  _newSecret: string
): string {
  // This would require temporarily setting env vars or accepting secrets as params
  // For now, this is a placeholder for key rotation functionality
  throw new Error('Key rotation not yet implemented. Contact support for assistance.');
}

/**
 * Securely compare two strings in constant time.
 * Prevents timing attacks when comparing sensitive values.
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Generate a cryptographically secure random string.
 * 
 * @param length - Number of bytes (output will be 2x in hex)
 * @returns Random hex string
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}
