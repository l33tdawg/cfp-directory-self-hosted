/**
 * Encrypted Reviewer Profile Service
 * 
 * Service layer for ReviewerProfile operations with automatic PII encryption.
 * All PII fields are encrypted at rest using AES-256-GCM.
 * 
 * Encrypted fields:
 * - fullName, designation, company, bio
 * - linkedinUrl, twitterHandle, githubUsername, websiteUrl
 * - photoUrl, conferencesReviewed
 */

import { prisma } from '@/lib/db/prisma';
import {
  encryptPiiFields,
  decryptPiiFields,
  REVIEWER_PROFILE_PII_FIELDS,
} from './encryption';
import type { ReviewerProfile, Prisma } from '@prisma/client';

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

type ReviewerProfileCreateInput = Prisma.ReviewerProfileCreateInput;
type ReviewerProfileUpdateInput = Prisma.ReviewerProfileUpdateInput;
type ReviewerProfileWhereUniqueInput = Prisma.ReviewerProfileWhereUniqueInput;

// =============================================================================
// Service Functions
// =============================================================================

/**
 * Create a new reviewer profile with encrypted PII.
 */
export async function createReviewerProfile(
  data: ReviewerProfileCreateInput
): Promise<ReviewerProfile> {
  const dataToStore = isEncryptionEnabled()
    ? encryptPiiFields(data as Record<string, unknown>, REVIEWER_PROFILE_PII_FIELDS)
    : data;

  const profile = await prisma.reviewerProfile.create({
    data: dataToStore as ReviewerProfileCreateInput,
  });

  return decryptReviewerProfile(profile);
}

/**
 * Update a reviewer profile with encrypted PII.
 */
export async function updateReviewerProfile(
  where: ReviewerProfileWhereUniqueInput,
  data: ReviewerProfileUpdateInput
): Promise<ReviewerProfile> {
  const dataToStore = isEncryptionEnabled()
    ? encryptPiiFields(data as Record<string, unknown>, REVIEWER_PROFILE_PII_FIELDS)
    : data;

  const profile = await prisma.reviewerProfile.update({
    where,
    data: dataToStore as ReviewerProfileUpdateInput,
  });

  return decryptReviewerProfile(profile);
}

/**
 * Upsert a reviewer profile with encrypted PII.
 */
export async function upsertReviewerProfile(
  where: ReviewerProfileWhereUniqueInput,
  create: ReviewerProfileCreateInput,
  update: ReviewerProfileUpdateInput
): Promise<ReviewerProfile> {
  const createData = isEncryptionEnabled()
    ? encryptPiiFields(create as Record<string, unknown>, REVIEWER_PROFILE_PII_FIELDS)
    : create;

  const updateData = isEncryptionEnabled()
    ? encryptPiiFields(update as Record<string, unknown>, REVIEWER_PROFILE_PII_FIELDS)
    : update;

  const profile = await prisma.reviewerProfile.upsert({
    where,
    create: createData as ReviewerProfileCreateInput,
    update: updateData as ReviewerProfileUpdateInput,
  });

  return decryptReviewerProfile(profile);
}

/**
 * Find a reviewer profile by unique field and return decrypted data.
 */
export async function findReviewerProfile(
  where: ReviewerProfileWhereUniqueInput,
  include?: Prisma.ReviewerProfileInclude
): Promise<ReviewerProfile | null> {
  const profile = await prisma.reviewerProfile.findUnique({
    where,
    include,
  });

  if (!profile) return null;
  return decryptReviewerProfile(profile);
}

/**
 * Find a reviewer profile by user ID.
 */
export async function findReviewerProfileByUserId(
  userId: string,
  include?: Prisma.ReviewerProfileInclude
): Promise<ReviewerProfile | null> {
  const profile = await prisma.reviewerProfile.findUnique({
    where: { userId },
    include,
  });

  if (!profile) return null;
  return decryptReviewerProfile(profile);
}

/**
 * Find multiple reviewer profiles with decrypted data.
 */
export async function findReviewerProfiles(
  where?: Prisma.ReviewerProfileWhereInput,
  include?: Prisma.ReviewerProfileInclude
): Promise<ReviewerProfile[]> {
  const profiles = await prisma.reviewerProfile.findMany({
    where,
    include,
  });

  return profiles.map(decryptReviewerProfile);
}

/**
 * Find public reviewer profiles (for display on landing page).
 */
export async function findPublicReviewerProfiles(
  include?: Prisma.ReviewerProfileInclude
): Promise<ReviewerProfile[]> {
  const profiles = await prisma.reviewerProfile.findMany({
    where: {
      showOnTeamPage: true,
    },
    include,
  });

  return profiles.map(decryptReviewerProfile);
}

/**
 * Delete a reviewer profile.
 */
export async function deleteReviewerProfile(
  where: ReviewerProfileWhereUniqueInput
): Promise<ReviewerProfile> {
  const profile = await prisma.reviewerProfile.delete({ where });
  return decryptReviewerProfile(profile);
}

// =============================================================================
// Internal Helpers
// =============================================================================

/**
 * Decrypt a single reviewer profile's PII fields.
 */
function decryptReviewerProfile(profile: ReviewerProfile): ReviewerProfile {
  if (!isEncryptionEnabled()) {
    return profile;
  }

  return decryptPiiFields(
    profile as unknown as Record<string, unknown>,
    REVIEWER_PROFILE_PII_FIELDS
  ) as unknown as ReviewerProfile;
}

/**
 * Bulk decrypt an array of reviewer profiles.
 */
export function decryptReviewerProfiles(profiles: ReviewerProfile[]): ReviewerProfile[] {
  if (!isEncryptionEnabled()) {
    return profiles;
  }

  return profiles.map(decryptReviewerProfile);
}

