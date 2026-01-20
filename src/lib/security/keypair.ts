/**
 * RSA Keypair Generation and Management
 * 
 * Generates RSA-2048 keypairs for federation encryption.
 * The private key is stored encrypted in the database.
 * The public key is shared with cfp.directory during license registration.
 * 
 * Flow:
 * 1. Self-hosted generates keypair
 * 2. Admin copies public key to cfp.directory when getting license
 * 3. cfp.directory encrypts sensitive speaker data with the public key
 * 4. Self-hosted decrypts with the private key
 */

import crypto from 'crypto';
import { encryptString, decryptString } from './encryption';

// =============================================================================
// Types
// =============================================================================

export interface KeyPair {
  publicKey: string;  // PEM format
  privateKey: string; // PEM format (encrypted for storage)
}

export interface GenerateKeyPairResult {
  success: boolean;
  publicKey?: string;
  privateKeyEncrypted?: string;
  error?: string;
}

export interface DecryptResult {
  success: boolean;
  plaintext?: string;
  error?: string;
}

// =============================================================================
// Key Generation
// =============================================================================

/**
 * Generate a new RSA-2048 keypair for federation encryption.
 * 
 * The private key is encrypted before being returned for storage.
 * This ensures it's protected at rest in the database.
 * 
 * @returns Generated keypair with encrypted private key
 */
export function generateKeyPair(): GenerateKeyPairResult {
  try {
    // Generate RSA-2048 keypair
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });

    // Encrypt the private key for secure storage
    const privateKeyEncrypted = encryptString(privateKey);

    return {
      success: true,
      publicKey,
      privateKeyEncrypted,
    };
  } catch (error) {
    console.error('Failed to generate keypair:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate keypair',
    };
  }
}

/**
 * Generate a keypair with a specific key size.
 * 
 * @param modulusLength - Key size in bits (2048, 3072, or 4096)
 */
export function generateKeyPairWithSize(
  modulusLength: 2048 | 3072 | 4096 = 2048
): GenerateKeyPairResult {
  try {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });

    const privateKeyEncrypted = encryptString(privateKey);

    return {
      success: true,
      publicKey,
      privateKeyEncrypted,
    };
  } catch (error) {
    console.error('Failed to generate keypair:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate keypair',
    };
  }
}

// =============================================================================
// Encryption / Decryption
// =============================================================================

/**
 * Encrypt data using a public key (RSA-OAEP with SHA-256).
 * 
 * Used by cfp.directory to encrypt speaker data before sending.
 * 
 * @param plaintext - Data to encrypt
 * @param publicKeyPem - Public key in PEM format
 * @returns Base64 encoded ciphertext
 */
export function encryptWithPublicKey(plaintext: string, publicKeyPem: string): string {
  const buffer = Buffer.from(plaintext, 'utf8');
  
  const encrypted = crypto.publicEncrypt(
    {
      key: publicKeyPem,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    buffer
  );

  return encrypted.toString('base64');
}

/**
 * Decrypt data using the instance's private key.
 * 
 * Used to decrypt speaker data received from cfp.directory.
 * 
 * @param ciphertext - Base64 encoded ciphertext
 * @param encryptedPrivateKey - Encrypted private key from database
 * @returns Decrypted plaintext
 */
export function decryptWithPrivateKey(
  ciphertext: string,
  encryptedPrivateKey: string
): DecryptResult {
  try {
    // Decrypt the private key first
    const privateKeyPem = decryptString(encryptedPrivateKey);
    
    // Decrypt the ciphertext
    const buffer = Buffer.from(ciphertext, 'base64');
    
    const decrypted = crypto.privateDecrypt(
      {
        key: privateKeyPem,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      buffer
    );

    return {
      success: true,
      plaintext: decrypted.toString('utf8'),
    };
  } catch (error) {
    console.error('Failed to decrypt with private key:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Decryption failed',
    };
  }
}

// =============================================================================
// Hybrid Encryption (for larger payloads)
// =============================================================================

/**
 * RSA can only encrypt small amounts of data (< key size - padding).
 * For larger payloads, we use hybrid encryption:
 * 1. Generate a random AES key
 * 2. Encrypt the payload with AES
 * 3. Encrypt the AES key with RSA
 * 
 * This format is used by cfp.directory when sending speaker profiles.
 */

export interface HybridEncryptedPayload {
  encryptedKey: string;  // RSA-encrypted AES key (base64)
  iv: string;            // AES IV (base64)
  authTag: string;       // AES-GCM auth tag (base64)
  ciphertext: string;    // AES-encrypted data (base64)
}

/**
 * Encrypt a payload using hybrid encryption (AES + RSA).
 * 
 * @param plaintext - Data to encrypt
 * @param publicKeyPem - Recipient's public key
 * @returns Hybrid encrypted payload
 */
export function hybridEncrypt(
  plaintext: string,
  publicKeyPem: string
): HybridEncryptedPayload {
  // Generate random AES-256 key and IV
  const aesKey = crypto.randomBytes(32);
  const iv = crypto.randomBytes(12);

  // Encrypt the payload with AES-256-GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', aesKey, iv);
  let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
  ciphertext += cipher.final('base64');
  const authTag = cipher.getAuthTag();

  // Encrypt the AES key with RSA
  const encryptedKey = crypto.publicEncrypt(
    {
      key: publicKeyPem,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    aesKey
  );

  return {
    encryptedKey: encryptedKey.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    ciphertext,
  };
}

/**
 * Decrypt a hybrid-encrypted payload.
 * 
 * @param payload - The encrypted payload
 * @param encryptedPrivateKey - Encrypted private key from database
 * @returns Decrypted plaintext
 */
export function hybridDecrypt(
  payload: HybridEncryptedPayload,
  encryptedPrivateKey: string
): DecryptResult {
  try {
    // Decrypt the private key
    const privateKeyPem = decryptString(encryptedPrivateKey);

    // Decrypt the AES key with RSA
    const encryptedKeyBuffer = Buffer.from(payload.encryptedKey, 'base64');
    const aesKey = crypto.privateDecrypt(
      {
        key: privateKeyPem,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      encryptedKeyBuffer
    );

    // Decrypt the payload with AES
    const iv = Buffer.from(payload.iv, 'base64');
    const authTag = Buffer.from(payload.authTag, 'base64');
    const ciphertext = Buffer.from(payload.ciphertext, 'base64');

    const decipher = crypto.createDecipheriv('aes-256-gcm', aesKey, iv);
    decipher.setAuthTag(authTag);

    let plaintext = decipher.update(ciphertext);
    plaintext = Buffer.concat([plaintext, decipher.final()]);

    return {
      success: true,
      plaintext: plaintext.toString('utf8'),
    };
  } catch (error) {
    console.error('Hybrid decryption failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Decryption failed',
    };
  }
}

// =============================================================================
// Key Validation
// =============================================================================

/**
 * Validate a public key is in correct PEM format.
 */
export function isValidPublicKey(publicKeyPem: string): boolean {
  try {
    crypto.createPublicKey(publicKeyPem);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate an encrypted private key can be decrypted and used.
 */
export function isValidPrivateKey(encryptedPrivateKey: string): boolean {
  try {
    const privateKeyPem = decryptString(encryptedPrivateKey);
    crypto.createPrivateKey(privateKeyPem);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the fingerprint of a public key (for verification).
 */
export function getPublicKeyFingerprint(publicKeyPem: string): string {
  const hash = crypto.createHash('sha256');
  hash.update(publicKeyPem);
  const fingerprint = hash.digest('hex');
  
  // Format as colon-separated pairs (like SSH fingerprints)
  return fingerprint.match(/.{2}/g)?.join(':') || fingerprint;
}

/**
 * Verify a keypair matches (public key corresponds to private key).
 */
export function verifyKeyPair(
  publicKeyPem: string,
  encryptedPrivateKey: string
): boolean {
  try {
    // Decrypt private key
    const privateKeyPem = decryptString(encryptedPrivateKey);
    
    // Create a test message
    const testMessage = 'keypair-verification-test';
    
    // Sign with private key
    const sign = crypto.createSign('SHA256');
    sign.update(testMessage);
    const signature = sign.sign(privateKeyPem);
    
    // Verify with public key
    const verify = crypto.createVerify('SHA256');
    verify.update(testMessage);
    
    return verify.verify(publicKeyPem, signature);
  } catch {
    return false;
  }
}
