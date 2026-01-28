/**
 * PII Decryption Helpers for Plugin Capabilities
 * @version 1.5.1
 *
 * Provides utilities for decrypting PII fields before returning data to plugins.
 * This ensures plugins with appropriate permissions receive readable data.
 * 
 * Security notes:
 * - Decryption only occurs for plugins with the relevant read permissions
 * - Permission checks happen at the capability level before these helpers are called
 * - All decryption is logged in development for debugging
 */

import type { User, SpeakerProfile } from '@prisma/client';
import {
  decryptPiiFields,
  USER_PII_FIELDS,
  SPEAKER_PROFILE_PII_FIELDS,
  CO_SPEAKER_PII_FIELDS,
} from '@/lib/security/encryption';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * User with PII fields decrypted and passwordHash removed
 */
export type DecryptedUser = Omit<User, 'passwordHash'>;

/**
 * Speaker profile with PII fields decrypted
 */
export type DecryptedSpeakerProfile = SpeakerProfile;

/**
 * Co-speaker with PII fields decrypted
 */
export interface DecryptedCoSpeaker {
  id: string;
  name: string;
  email: string | null;
  bio: string | null;
  submissionId: string;
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// DECRYPTION FUNCTIONS
// =============================================================================

/**
 * Decrypt PII fields in a user object.
 * 
 * @param user - User object from database (with encrypted fields)
 * @returns User object with decrypted PII fields and passwordHash removed
 */
export function decryptUserPii(user: User): DecryptedUser {
  // First remove passwordHash for safety
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...userWithoutPassword } = user;
  
  // Decrypt PII fields
  const decrypted = decryptPiiFields(
    userWithoutPassword as Record<string, unknown>,
    USER_PII_FIELDS
  );
  
  return decrypted as unknown as DecryptedUser;
}

/**
 * Decrypt PII fields in a speaker profile.
 * 
 * @param profile - SpeakerProfile from database
 * @returns Profile with decrypted PII fields
 */
export function decryptSpeakerProfilePii(profile: SpeakerProfile): DecryptedSpeakerProfile {
  const decrypted = decryptPiiFields(
    profile as unknown as Record<string, unknown>,
    SPEAKER_PROFILE_PII_FIELDS
  );
  
  return decrypted as unknown as DecryptedSpeakerProfile;
}

/**
 * Decrypt PII fields in a co-speaker object.
 * 
 * @param coSpeaker - CoSpeaker from database
 * @returns CoSpeaker with decrypted PII fields
 */
export function decryptCoSpeakerPii<T extends Record<string, unknown>>(coSpeaker: T): T {
  return decryptPiiFields(coSpeaker, CO_SPEAKER_PII_FIELDS);
}

/**
 * Batch decrypt user PII fields.
 * 
 * @param users - Array of users from database
 * @returns Array of users with decrypted PII
 */
export function decryptUsersPii(users: User[]): DecryptedUser[] {
  return users.map(decryptUserPii);
}

/**
 * Batch decrypt speaker profile PII fields.
 * 
 * @param profiles - Array of speaker profiles from database
 * @returns Array of profiles with decrypted PII
 */
export function decryptSpeakerProfilesPii(profiles: SpeakerProfile[]): DecryptedSpeakerProfile[] {
  return profiles.map(decryptSpeakerProfilePii);
}
