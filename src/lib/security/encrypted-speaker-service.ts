/**
 * Encrypted Speaker Profile Service
 * 
 * Service layer for SpeakerProfile operations with automatic PII encryption.
 * All PII fields are encrypted at rest using AES-256-GCM.
 * 
 * Encrypted fields:
 * - fullName, bio, location, company, position
 * - linkedinUrl, twitterHandle, githubUsername, websiteUrl
 * - photoUrl, speakingExperience
 */

import { prisma } from '@/lib/db/prisma';
import {
  encryptPiiFields,
  decryptPiiFields,
  SPEAKER_PROFILE_PII_FIELDS,
} from './encryption';
import type { SpeakerProfile, Prisma } from '@prisma/client';

// =============================================================================
// Configuration
// =============================================================================

/**
 * Check if PII encryption is enabled.
 */
function isEncryptionEnabled(): boolean {
  if (process.env.ENCRYPT_PII_AT_REST === 'false') {
    return false;
  }
  return process.env.NODE_ENV === 'production' || process.env.ENCRYPT_PII_AT_REST === 'true';
}

// =============================================================================
// Type Definitions
// =============================================================================

type SpeakerProfileCreateInput = Prisma.SpeakerProfileCreateInput;
type SpeakerProfileUpdateInput = Prisma.SpeakerProfileUpdateInput;
type SpeakerProfileWhereUniqueInput = Prisma.SpeakerProfileWhereUniqueInput;

// =============================================================================
// Service Functions
// =============================================================================

/**
 * Create a new speaker profile with encrypted PII.
 */
export async function createSpeakerProfile(
  data: SpeakerProfileCreateInput
): Promise<SpeakerProfile> {
  const dataToStore = isEncryptionEnabled()
    ? encryptPiiFields(data as Record<string, unknown>, SPEAKER_PROFILE_PII_FIELDS)
    : data;

  const profile = await prisma.speakerProfile.create({
    data: dataToStore as SpeakerProfileCreateInput,
  });

  return decryptSpeakerProfile(profile);
}

/**
 * Update a speaker profile with encrypted PII.
 */
export async function updateSpeakerProfile(
  where: SpeakerProfileWhereUniqueInput,
  data: SpeakerProfileUpdateInput
): Promise<SpeakerProfile> {
  const dataToStore = isEncryptionEnabled()
    ? encryptPiiFields(data as Record<string, unknown>, SPEAKER_PROFILE_PII_FIELDS)
    : data;

  const profile = await prisma.speakerProfile.update({
    where,
    data: dataToStore as SpeakerProfileUpdateInput,
  });

  return decryptSpeakerProfile(profile);
}

/**
 * Upsert a speaker profile with encrypted PII.
 */
export async function upsertSpeakerProfile(
  where: SpeakerProfileWhereUniqueInput,
  create: SpeakerProfileCreateInput,
  update: SpeakerProfileUpdateInput
): Promise<SpeakerProfile> {
  const createData = isEncryptionEnabled()
    ? encryptPiiFields(create as Record<string, unknown>, SPEAKER_PROFILE_PII_FIELDS)
    : create;

  const updateData = isEncryptionEnabled()
    ? encryptPiiFields(update as Record<string, unknown>, SPEAKER_PROFILE_PII_FIELDS)
    : update;

  const profile = await prisma.speakerProfile.upsert({
    where,
    create: createData as SpeakerProfileCreateInput,
    update: updateData as SpeakerProfileUpdateInput,
  });

  return decryptSpeakerProfile(profile);
}

/**
 * Find a speaker profile by unique field and return decrypted data.
 */
export async function findSpeakerProfile(
  where: SpeakerProfileWhereUniqueInput,
  include?: Prisma.SpeakerProfileInclude
): Promise<SpeakerProfile | null> {
  const profile = await prisma.speakerProfile.findUnique({
    where,
    include,
  });

  if (!profile) return null;
  return decryptSpeakerProfile(profile);
}

/**
 * Find a speaker profile by user ID.
 */
export async function findSpeakerProfileByUserId(
  userId: string,
  include?: Prisma.SpeakerProfileInclude
): Promise<SpeakerProfile | null> {
  const profile = await prisma.speakerProfile.findUnique({
    where: { userId },
    include,
  });

  if (!profile) return null;
  return decryptSpeakerProfile(profile);
}

/**
 * Find multiple speaker profiles with decrypted data.
 */
export async function findSpeakerProfiles(
  where?: Prisma.SpeakerProfileWhereInput,
  include?: Prisma.SpeakerProfileInclude
): Promise<SpeakerProfile[]> {
  const profiles = await prisma.speakerProfile.findMany({
    where,
    include,
  });

  return profiles.map(decryptSpeakerProfile);
}

/**
 * Delete a speaker profile.
 */
export async function deleteSpeakerProfile(
  where: SpeakerProfileWhereUniqueInput
): Promise<SpeakerProfile> {
  const profile = await prisma.speakerProfile.delete({ where });
  return decryptSpeakerProfile(profile);
}

// =============================================================================
// Internal Helpers
// =============================================================================

/**
 * Decrypt a single speaker profile's PII fields.
 */
function decryptSpeakerProfile(profile: SpeakerProfile): SpeakerProfile {
  if (!isEncryptionEnabled()) {
    return profile;
  }

  return decryptPiiFields(
    profile as unknown as Record<string, unknown>,
    SPEAKER_PROFILE_PII_FIELDS
  ) as unknown as SpeakerProfile;
}

/**
 * Bulk decrypt an array of speaker profiles.
 */
export function decryptSpeakerProfiles(profiles: SpeakerProfile[]): SpeakerProfile[] {
  if (!isEncryptionEnabled()) {
    return profiles;
  }

  return profiles.map(decryptSpeakerProfile);
}

