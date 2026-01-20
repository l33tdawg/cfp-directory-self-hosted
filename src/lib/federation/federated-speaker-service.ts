/**
 * Federated Speaker Service
 * 
 * Service layer for FederatedSpeaker operations with automatic PII encryption.
 * 
 * All PII fields are encrypted at rest using AES-256-GCM when:
 * - ENCRYPT_PII_AT_REST=true (environment variable)
 * - Or in production mode by default
 * 
 * Fields encrypted:
 * - email, name, bio, location, company, position
 * - linkedinUrl, twitterHandle, githubUsername, websiteUrl
 * - speakingExperience
 */

import { prisma } from '@/lib/db/prisma';
import { 
  encryptPiiFields, 
  decryptPiiFields, 
  FEDERATED_SPEAKER_PII_FIELDS,
} from '@/lib/security/encryption';
import type { FederatedSpeaker, Prisma } from '@prisma/client';

// =============================================================================
// Configuration
// =============================================================================

/**
 * Check if PII encryption is enabled.
 * Enabled by default in production, can be forced on/off via env var.
 */
export function isEncryptionEnabled(): boolean {
  const envSetting = process.env.ENCRYPT_PII_AT_REST;
  
  if (envSetting === 'true') return true;
  if (envSetting === 'false') return false;
  
  // Default: enabled in production
  return process.env.NODE_ENV === 'production';
}

// =============================================================================
// Create / Update Operations (Encrypt)
// =============================================================================

export type FederatedSpeakerCreateInput = Prisma.FederatedSpeakerCreateInput;
export type FederatedSpeakerUpdateInput = Prisma.FederatedSpeakerUpdateInput;

/**
 * Create a new federated speaker with encrypted PII.
 */
export async function createFederatedSpeaker(
  data: FederatedSpeakerCreateInput
): Promise<FederatedSpeaker> {
  const dataToStore = isEncryptionEnabled()
    ? encryptPiiFields(data as Record<string, unknown>, FEDERATED_SPEAKER_PII_FIELDS)
    : data;
  
  const speaker = await prisma.federatedSpeaker.create({
    data: dataToStore as FederatedSpeakerCreateInput,
  });
  
  // Return decrypted data
  return decryptSpeaker(speaker);
}

/**
 * Update a federated speaker with encrypted PII.
 */
export async function updateFederatedSpeaker(
  where: Prisma.FederatedSpeakerWhereUniqueInput,
  data: FederatedSpeakerUpdateInput
): Promise<FederatedSpeaker> {
  const dataToStore = isEncryptionEnabled()
    ? encryptPiiFields(data as Record<string, unknown>, FEDERATED_SPEAKER_PII_FIELDS)
    : data;
  
  const speaker = await prisma.federatedSpeaker.update({
    where,
    data: dataToStore as FederatedSpeakerUpdateInput,
  });
  
  return decryptSpeaker(speaker);
}

/**
 * Upsert a federated speaker with encrypted PII.
 */
export async function upsertFederatedSpeaker(
  where: Prisma.FederatedSpeakerWhereUniqueInput,
  create: FederatedSpeakerCreateInput,
  update: FederatedSpeakerUpdateInput
): Promise<FederatedSpeaker> {
  const createData = isEncryptionEnabled()
    ? encryptPiiFields(create as Record<string, unknown>, FEDERATED_SPEAKER_PII_FIELDS)
    : create;
  
  const updateData = isEncryptionEnabled()
    ? encryptPiiFields(update as Record<string, unknown>, FEDERATED_SPEAKER_PII_FIELDS)
    : update;
  
  const speaker = await prisma.federatedSpeaker.upsert({
    where,
    create: createData as FederatedSpeakerCreateInput,
    update: updateData as FederatedSpeakerUpdateInput,
  });
  
  return decryptSpeaker(speaker);
}

// =============================================================================
// Read Operations (Decrypt)
// =============================================================================

/**
 * Find a federated speaker by unique field and return decrypted data.
 */
export async function findFederatedSpeaker(
  where: Prisma.FederatedSpeakerWhereUniqueInput
): Promise<FederatedSpeaker | null> {
  const speaker = await prisma.federatedSpeaker.findUnique({ where });
  
  if (!speaker) return null;
  
  return decryptSpeaker(speaker);
}

/**
 * Find a federated speaker by cfp.directory ID.
 */
export async function findByCfpDirectoryId(
  cfpDirectorySpeakerId: string
): Promise<FederatedSpeaker | null> {
  return findFederatedSpeaker({ cfpDirectorySpeakerId });
}

/**
 * Find multiple federated speakers with decrypted data.
 */
export async function findManyFederatedSpeakers(
  args?: Prisma.FederatedSpeakerFindManyArgs
): Promise<FederatedSpeaker[]> {
  const speakers = await prisma.federatedSpeaker.findMany(args);
  
  return speakers.map(decryptSpeaker);
}

/**
 * Find the first matching federated speaker with decrypted data.
 */
export async function findFirstFederatedSpeaker(
  args?: Prisma.FederatedSpeakerFindFirstArgs
): Promise<FederatedSpeaker | null> {
  const speaker = await prisma.federatedSpeaker.findFirst(args);
  
  if (!speaker) return null;
  
  return decryptSpeaker(speaker);
}

// =============================================================================
// Delete Operations
// =============================================================================

/**
 * Delete a federated speaker.
 */
export async function deleteFederatedSpeaker(
  where: Prisma.FederatedSpeakerWhereUniqueInput
): Promise<FederatedSpeaker> {
  const speaker = await prisma.federatedSpeaker.delete({ where });
  return decryptSpeaker(speaker);
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Decrypt PII fields in a federated speaker record.
 */
function decryptSpeaker(speaker: FederatedSpeaker): FederatedSpeaker {
  if (!isEncryptionEnabled()) {
    return speaker;
  }
  
  return decryptPiiFields(
    speaker as unknown as Record<string, unknown>,
    FEDERATED_SPEAKER_PII_FIELDS
  ) as unknown as FederatedSpeaker;
}

/**
 * Bulk decrypt an array of speakers.
 */
export function decryptSpeakers(speakers: FederatedSpeaker[]): FederatedSpeaker[] {
  if (!isEncryptionEnabled()) {
    return speakers;
  }
  
  return speakers.map(decryptSpeaker);
}

// =============================================================================
// Consent Management
// =============================================================================

/**
 * Update consent scopes for a federated speaker.
 */
export async function updateConsentScopes(
  cfpDirectorySpeakerId: string,
  scopes: string[]
): Promise<FederatedSpeaker> {
  return updateFederatedSpeaker(
    { cfpDirectorySpeakerId },
    {
      consentScopes: scopes,
      consentGrantedAt: new Date(),
      updatedAt: new Date(),
    }
  );
}

/**
 * Revoke consent for a federated speaker.
 */
export async function revokeConsent(
  cfpDirectorySpeakerId: string
): Promise<FederatedSpeaker> {
  return updateFederatedSpeaker(
    { cfpDirectorySpeakerId },
    {
      consentScopes: [],
      updatedAt: new Date(),
    }
  );
}

// =============================================================================
// Migration Helpers
// =============================================================================

/**
 * Encrypt all existing unencrypted federated speaker records.
 * Run this as a one-time migration when enabling encryption.
 */
export async function encryptExistingSpeakers(): Promise<{
  processed: number;
  encrypted: number;
  errors: number;
}> {
  if (!isEncryptionEnabled()) {
    console.log('Encryption is not enabled. Skipping migration.');
    return { processed: 0, encrypted: 0, errors: 0 };
  }
  
  const speakers = await prisma.federatedSpeaker.findMany();
  let encrypted = 0;
  let errors = 0;
  
  for (const speaker of speakers) {
    try {
      // Check if already encrypted (name field starts with enc:v1:)
      if (speaker.name?.startsWith('enc:v1:')) {
        continue;
      }
      
      const encryptedData = encryptPiiFields(
        speaker as unknown as Record<string, unknown>,
        FEDERATED_SPEAKER_PII_FIELDS
      );
      
      await prisma.federatedSpeaker.update({
        where: { id: speaker.id },
        data: encryptedData as FederatedSpeakerUpdateInput,
      });
      
      encrypted++;
    } catch (error) {
      console.error(`Failed to encrypt speaker ${speaker.id}:`, error);
      errors++;
    }
  }
  
  return {
    processed: speakers.length,
    encrypted,
    errors,
  };
}

/**
 * Decrypt all federated speaker records.
 * Use with caution - removes encryption from all records.
 */
export async function decryptAllSpeakers(): Promise<{
  processed: number;
  decrypted: number;
  errors: number;
}> {
  const speakers = await prisma.federatedSpeaker.findMany();
  let decrypted = 0;
  let errors = 0;
  
  for (const speaker of speakers) {
    try {
      // Check if encrypted
      if (!speaker.name?.startsWith('enc:v1:')) {
        continue;
      }
      
      const decryptedData = decryptPiiFields(
        speaker as unknown as Record<string, unknown>,
        FEDERATED_SPEAKER_PII_FIELDS
      );
      
      await prisma.federatedSpeaker.update({
        where: { id: speaker.id },
        data: decryptedData as FederatedSpeakerUpdateInput,
      });
      
      decrypted++;
    } catch (error) {
      console.error(`Failed to decrypt speaker ${speaker.id}:`, error);
      errors++;
    }
  }
  
  return {
    processed: speakers.length,
    decrypted,
    errors,
  };
}
