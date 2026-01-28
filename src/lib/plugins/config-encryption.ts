/**
 * Plugin Config Encryption Utilities
 * @version 1.7.0
 *
 * Encrypt/decrypt/mask password fields in plugin configuration.
 * Uses the existing AES-256-GCM encryption from src/lib/security/encryption.ts.
 */

import { encryptString, decryptString, isEncrypted } from '@/lib/security/encryption';
import type { JSONSchema, JSONSchemaProperty } from './types';

/** Placeholder value shown in admin UI for password fields */
export const PASSWORD_PLACEHOLDER = '********';

/**
 * Find all fields with format: "password" in a JSON Schema.
 * Returns an array of field names.
 */
export function getPasswordFields(configSchema: JSONSchema | null | undefined): string[] {
  if (!configSchema?.properties) return [];

  const fields: string[] = [];
  for (const [name, prop] of Object.entries(configSchema.properties)) {
    if ((prop as JSONSchemaProperty).format === 'password') {
      fields.push(name);
    }
  }
  return fields;
}

/**
 * Encrypt password fields in a config object before saving to DB.
 *
 * - If value is the placeholder ("********"), keep the existing encrypted value.
 * - If value is already encrypted (has enc:v1: prefix), keep it as-is.
 * - Otherwise, encrypt the plaintext value.
 */
export function encryptConfigFields(
  config: Record<string, unknown>,
  existingConfig: Record<string, unknown>,
  passwordFields: string[]
): Record<string, unknown> {
  if (passwordFields.length === 0) return config;

  const result = { ...config };
  for (const field of passwordFields) {
    const value = result[field];
    if (value === undefined || value === null || value === '') continue;

    if (typeof value === 'string') {
      if (value === PASSWORD_PLACEHOLDER) {
        // Preserve existing encrypted value
        result[field] = existingConfig[field];
      } else if (!isEncrypted(value)) {
        // Encrypt plaintext value
        result[field] = encryptString(value);
      }
      // else: already encrypted, keep as-is
    }
  }
  return result;
}

/**
 * Decrypt password fields in a config object for plugin runtime use.
 * Non-encrypted values pass through unchanged.
 */
export function decryptConfigFields(
  config: Record<string, unknown>,
  passwordFields: string[]
): Record<string, unknown> {
  if (passwordFields.length === 0) return config;

  const result = { ...config };
  for (const field of passwordFields) {
    const value = result[field];
    if (typeof value === 'string' && isEncrypted(value)) {
      try {
        result[field] = decryptString(value);
      } catch {
        // Keep encrypted value if decryption fails
        console.error(`[ConfigEncryption] Failed to decrypt field "${field}"`);
      }
    }
  }
  return result;
}

/**
 * Mask password fields with placeholder for admin UI display.
 */
export function maskConfigFields(
  config: Record<string, unknown>,
  passwordFields: string[]
): Record<string, unknown> {
  if (passwordFields.length === 0) return config;

  const result = { ...config };
  for (const field of passwordFields) {
    const value = result[field];
    if (value !== undefined && value !== null && value !== '') {
      result[field] = PASSWORD_PLACEHOLDER;
    }
  }
  return result;
}
