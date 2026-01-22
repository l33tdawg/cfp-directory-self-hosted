/**
 * Federation Speaker Sync Service
 * 
 * Handles syncing federated speaker profiles from cfp.directory:
 * - Fetches speaker profile data
 * - Downloads materials to local storage
 * - Creates/updates FederatedSpeaker records (with PII encryption)
 * - Processes co-speaker data
 */

import { prisma } from '@/lib/db/prisma';
import { getStorageProvider } from '@/lib/storage';
import { 
  fetchSpeakerProfile, 
  downloadMaterial,
  isSignedUrl,
  sanitizeFileName,
} from './consent-client';
import {
  upsertFederatedSpeaker,
  createFederatedSpeaker,
  findByCfpDirectoryId,
} from './federated-speaker-service';
import type {
  FederatedMaterial,
  FederatedCoSpeaker,
  SyncSpeakerResult,
  ConsentScope,
} from './types';

// =============================================================================
// Main Sync Function
// =============================================================================

export interface SyncSpeakerOptions {
  /** The consent token from cfp.directory */
  consentToken: string;
  /** The cfp.directory speaker ID */
  speakerId: string;
  /** The federated event ID this consent is for */
  federatedEventId: string;
  /** Whether to download materials (if consented) */
  downloadMaterials?: boolean;
}

/**
 * Sync a federated speaker from cfp.directory.
 * 
 * This function:
 * 1. Fetches the speaker's profile using the consent token
 * 2. Creates or updates a FederatedSpeaker record
 * 3. Optionally downloads materials to local storage
 * 4. Processes co-speaker information
 * 
 * @param options - Sync options
 * @returns Sync result
 */
export async function syncFederatedSpeaker(
  options: SyncSpeakerOptions
): Promise<SyncSpeakerResult> {
  const { consentToken, speakerId, federatedEventId, downloadMaterials = true } = options;

  try {
    // Fetch the speaker profile from cfp.directory
    const profileResult = await fetchSpeakerProfile(consentToken, speakerId);
    
    if (!profileResult.success || !profileResult.profile) {
      return {
        success: false,
        error: profileResult.error || 'Failed to fetch speaker profile',
        errorCode: profileResult.errorCode || 'FETCH_FAILED',
      };
    }

    const profile = profileResult.profile;
    
    // Check if we already have this speaker
    const existingSpeaker = await findByCfpDirectoryId(speakerId);

    // Create or update the federated speaker record (PII is encrypted automatically)
    const federatedSpeaker = await upsertFederatedSpeaker(
      { cfpDirectorySpeakerId: speakerId },
      // Create data
      {
        cfpDirectorySpeakerId: speakerId,
        name: profile.profile?.fullName || 'Unknown Speaker',
        email: profile.email || null,
        bio: profile.profile?.bio || null,
        avatarUrl: profile.profile?.avatarUrl || null,
        location: profile.profile?.slug || null, // Map slug to location if available
        company: profile.profile?.company || null,
        position: profile.profile?.position || null,
        linkedinUrl: profile.socialLinks?.linkedin || null,
        twitterHandle: profile.socialLinks?.twitter || null,
        githubUsername: profile.socialLinks?.github || null,
        expertiseTags: profile.profile?.topics || [],
        experienceLevel: profile.profile?.experienceLevel || null,
        languages: profile.profile?.languages || [],
        consentGrantedAt: new Date(),
        consentScopes: profile.consentedScopes,
      },
      // Update data
      {
        name: profile.profile?.fullName || existingSpeaker?.name || 'Unknown Speaker',
        email: profile.email || existingSpeaker?.email || null,
        bio: profile.profile?.bio || existingSpeaker?.bio || null,
        avatarUrl: profile.profile?.avatarUrl || existingSpeaker?.avatarUrl || null,
        company: profile.profile?.company || existingSpeaker?.company || null,
        position: profile.profile?.position || existingSpeaker?.position || null,
        linkedinUrl: profile.socialLinks?.linkedin || existingSpeaker?.linkedinUrl || null,
        twitterHandle: profile.socialLinks?.twitter || existingSpeaker?.twitterHandle || null,
        githubUsername: profile.socialLinks?.github || existingSpeaker?.githubUsername || null,
        expertiseTags: profile.profile?.topics || existingSpeaker?.expertiseTags || [],
        experienceLevel: profile.profile?.experienceLevel || existingSpeaker?.experienceLevel || null,
        languages: profile.profile?.languages || existingSpeaker?.languages || [],
        consentGrantedAt: new Date(),
        consentScopes: profile.consentedScopes,
        updatedAt: new Date(),
      }
    );

    let materialsDownloaded = 0;
    let coSpeakersProcessed = 0;

    // Download materials if consented and enabled
    if (downloadMaterials && profile.consentedScopes.includes('materials') && profile.materials) {
      materialsDownloaded = await syncMaterials(
        profile.materials,
        federatedSpeaker.id,
        federatedEventId
      );
    }

    // Process co-speakers
    if (profile.coSpeakers && profile.coSpeakers.length > 0) {
      coSpeakersProcessed = await processCoSpeakers(
        profile.coSpeakers,
        federatedSpeaker.id,
        federatedEventId
      );
    }

    return {
      success: true,
      federatedSpeakerId: federatedSpeaker.id,
      localUserId: federatedSpeaker.localUserId || undefined,
      materialsDownloaded,
      coSpeakersProcessed,
    };

  } catch (error) {
    console.error('Speaker sync error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown sync error',
      errorCode: 'SYNC_ERROR',
    };
  }
}

// =============================================================================
// Material Syncing
// =============================================================================

/**
 * Sync materials for a federated speaker.
 * Downloads files from signed URLs and stores them locally.
 * 
 * @param materials - Materials from the profile response
 * @param federatedSpeakerId - Local federated speaker ID
 * @param federatedEventId - The federated event ID
 * @returns Number of materials successfully downloaded
 */
async function syncMaterials(
  materials: FederatedMaterial[],
  federatedSpeakerId: string,
  federatedEventId: string
): Promise<number> {
  // Storage provider initialized for future use
  void getStorageProvider();
  let downloadedCount = 0;

  for (const material of materials) {
    try {
      let localFileUrl: string | null = null;

      // If it's an external URL, we just reference it directly
      if (material.isExternal && material.externalUrl) {
        localFileUrl = material.externalUrl;
      } 
      // If it's a signed URL, download and store locally
      else if (material.fileUrl && isSignedUrl(material.fileUrl)) {
        // SECURITY: Sanitize filename to prevent path traversal attacks
        // Federation inputs are from an external service and must be treated as hostile
        const rawFileName = material.fileName || `material-${material.id}`;
        const fileName = sanitizeFileName(rawFileName);
        
        // Build a safe storage path using sanitized components
        // Each component is sanitized to prevent traversal
        const safeFederatedEventId = sanitizeFileName(federatedEventId);
        const safeFederatedSpeakerId = sanitizeFileName(federatedSpeakerId);
        const storagePath = `federation/${safeFederatedEventId}/${safeFederatedSpeakerId}/${fileName}`;
        
        // Download the file (downloadMaterial also validates the URL for SSRF)
        const downloadResult = await downloadMaterial(
          material.fileUrl,
          `./uploads/${storagePath}`
        );

        if (downloadResult.success && downloadResult.localPath) {
          localFileUrl = `/api/files/${storagePath}`;
          downloadedCount++;
        }
      }
      
      // localFileUrl would be stored in a FederatedMaterial model in full implementation
      void localFileUrl;

      // Store material metadata (we'd need a FederatedMaterial model for this)
      // For now, we log it - in a full implementation, you'd save this
      console.log(`Synced material: ${material.title} for speaker ${federatedSpeakerId}`);

    } catch (error) {
      console.error(`Failed to sync material ${material.id}:`, error);
    }
  }

  return downloadedCount;
}

// =============================================================================
// Co-Speaker Processing
// =============================================================================

/**
 * Process co-speaker data from a federated speaker's profile.
 * 
 * This stores co-speaker information that can be used when the
 * speaker submits a talk. Co-speakers may or may not have their
 * own cfp.directory accounts.
 * 
 * @param coSpeakers - Co-speaker data from the profile
 * @param primarySpeakerId - The primary federated speaker's local ID
 * @param federatedEventId - The federated event ID
 * @returns Number of co-speakers processed
 */
async function processCoSpeakers(
  coSpeakers: FederatedCoSpeaker[],
  primarySpeakerId: string,
  federatedEventId: string
): Promise<number> {
  // These IDs available for linking co-speakers to primary speaker/event
  void primarySpeakerId;
  void federatedEventId;
  let processedCount = 0;

  for (const coSpeaker of coSpeakers) {
    try {
      // If the co-speaker has their own cfp.directory account, 
      // they might already be synced or will need to grant consent separately
      if (coSpeaker.type === 'linked' && coSpeaker.speakerProfileId) {
        // Check if we already have this speaker
        const existing = await findByCfpDirectoryId(coSpeaker.speakerProfileId);

        if (!existing) {
          // Create a placeholder record - they'll need to grant consent to get full data
          // PII is encrypted automatically by the service layer
          await createFederatedSpeaker({
            cfpDirectorySpeakerId: coSpeaker.speakerProfileId,
            name: coSpeaker.fullName,
            bio: coSpeaker.bio,
            avatarUrl: coSpeaker.photoUrl,
            company: coSpeaker.company,
            consentGrantedAt: new Date(),
            consentScopes: [], // Empty until they grant consent
          });
        }
      }

      // For guest co-speakers (no cfp.directory account), we just log the info
      // This data will be used when creating submissions
      console.log(`Processed co-speaker: ${coSpeaker.fullName} (${coSpeaker.type})`);
      processedCount++;

    } catch (error) {
      console.error(`Failed to process co-speaker ${coSpeaker.id}:`, error);
    }
  }

  return processedCount;
}

// =============================================================================
// Utility Functions
// =============================================================================

import {
  findManyFederatedSpeakers,
  updateConsentScopes as updateSpeakerConsentScopes,
  revokeConsent as revokeSpeakerConsent,
} from './federated-speaker-service';

/**
 * Get a federated speaker by their cfp.directory ID.
 * Returns decrypted PII data.
 */
export async function getFederatedSpeaker(cfpDirectorySpeakerId: string) {
  return findByCfpDirectoryId(cfpDirectorySpeakerId);
}

/**
 * Get all federated speakers for an event.
 * Returns decrypted PII data.
 */
export async function getFederatedSpeakersForEvent(eventId: string) {
  // Get all federated submissions for this event
  const submissions = await prisma.submission.findMany({
    where: {
      eventId,
      isFederated: true,
      federatedSpeakerId: { not: null },
    },
    select: {
      federatedSpeakerId: true,
    },
    distinct: ['federatedSpeakerId'],
  });

  const speakerIds = submissions
    .map(s => s.federatedSpeakerId)
    .filter((id): id is string => id !== null);

  if (speakerIds.length === 0) {
    return [];
  }

  // Returns decrypted data via service layer
  return findManyFederatedSpeakers({
    where: {
      cfpDirectorySpeakerId: { in: speakerIds },
    },
  });
}

/**
 * Update consent scopes for a federated speaker.
 */
export async function updateConsentScopes(
  cfpDirectorySpeakerId: string,
  scopes: ConsentScope[]
) {
  return updateSpeakerConsentScopes(cfpDirectorySpeakerId, scopes as string[]);
}

/**
 * Mark a federated speaker's consent as revoked.
 * Called when we receive a consent.revoked webhook.
 */
export async function revokeConsent(cfpDirectorySpeakerId: string) {
  return revokeSpeakerConsent(cfpDirectorySpeakerId);
}
