/**
 * Federation Consent Client
 * 
 * Client for validating consent tokens and fetching speaker profiles
 * from cfp.directory's federation API.
 */

import { config } from '@/lib/env';
import { FederationApiError } from './license-client';
import type {
  FederatedSpeakerProfile,
  ConsentScope,
} from './types';

// Package version (updated during build)
const APP_VERSION = process.env.npm_package_version || '0.1.0';

/**
 * Create the base headers for API requests
 */
function createHeaders(consentToken?: string): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'User-Agent': `CFP-Directory-Self-Hosted/${APP_VERSION}`,
    'X-License-Key': config.federation.licenseKey || '',
  };
  
  if (consentToken) {
    headers['Authorization'] = `Bearer ${consentToken}`;
  }
  
  return headers;
}

// =============================================================================
// Token Validation
// =============================================================================

export interface ValidateConsentResult {
  valid: boolean;
  speakerId?: string;
  eventId?: string;
  scopes?: ConsentScope[];
  error?: string;
  errorCode?: 'INVALID_TOKEN' | 'EXPIRED' | 'REVOKED' | 'NOT_FOUND' | 'API_ERROR';
}

/**
 * Validate a consent token with cfp.directory
 * 
 * Note: The token is validated by attempting to fetch the speaker profile.
 * If the token is invalid, the profile request will fail with an appropriate error.
 * 
 * @param token - The consent token from the speaker
 * @param speakerId - The speaker ID to validate against
 * @returns Validation result
 */
export async function validateConsentToken(
  token: string,
  speakerId: string
): Promise<ValidateConsentResult> {
  try {
    const url = `${config.federation.apiUrl}/speakers/${speakerId}/profile`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: createHeaders(token),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Map HTTP status to error codes
      if (response.status === 401) {
        const errorCode = errorData.error?.code || 'INVALID_TOKEN';
        return {
          valid: false,
          error: errorData.error?.message || 'Invalid or expired consent token',
          errorCode: errorCode === 'EXPIRED' ? 'EXPIRED' : 'INVALID_TOKEN',
        };
      }
      
      if (response.status === 403) {
        const errorCode = errorData.error?.code;
        return {
          valid: false,
          error: errorData.error?.message || 'Consent has been revoked',
          errorCode: errorCode === 'REVOKED' ? 'REVOKED' : 'NOT_FOUND',
        };
      }
      
      if (response.status === 404) {
        return {
          valid: false,
          error: 'Speaker not found',
          errorCode: 'NOT_FOUND',
        };
      }
      
      return {
        valid: false,
        error: errorData.error?.message || `API request failed with status ${response.status}`,
        errorCode: 'API_ERROR',
      };
    }
    
    const data = await response.json();
    
    return {
      valid: true,
      speakerId: data.speakerId,
      eventId: data.eventId,
      scopes: data.consentedScopes,
    };
  } catch (error) {
    console.error('Consent validation error:', error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Failed to validate consent',
      errorCode: 'API_ERROR',
    };
  }
}

// =============================================================================
// Speaker Profile Fetching
// =============================================================================

export interface FetchProfileResult {
  success: boolean;
  profile?: FederatedSpeakerProfile;
  error?: string;
  errorCode?: string;
}

/**
 * Fetch a speaker's profile from cfp.directory using a consent token.
 * The profile data returned depends on the scopes the speaker consented to.
 * 
 * @param token - The consent token from the speaker
 * @param speakerId - The speaker ID to fetch
 * @returns The speaker profile data
 */
export async function fetchSpeakerProfile(
  token: string,
  speakerId: string
): Promise<FetchProfileResult> {
  try {
    const url = `${config.federation.apiUrl}/speakers/${speakerId}/profile`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: createHeaders(token),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new FederationApiError(
        errorData.error?.message || `Failed to fetch profile: ${response.status}`,
        response.status,
        errorData
      );
    }
    
    const data = await response.json();
    
    // Map API response to our type
    const profile: FederatedSpeakerProfile = {
      speakerId: data.speakerId,
      eventId: data.eventId,
      consentedScopes: data.consentedScopes,
      profile: data.profile,
      email: data.email,
      socialLinks: data.socialLinks,
      materials: data.materials,
      coSpeakers: data.coSpeakers,
    };
    
    return {
      success: true,
      profile,
    };
  } catch (error) {
    console.error('Profile fetch error:', error);
    
    if (error instanceof FederationApiError) {
      return {
        success: false,
        error: error.message,
        errorCode: `HTTP_${error.statusCode}`,
      };
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch profile',
      errorCode: 'FETCH_ERROR',
    };
  }
}

// =============================================================================
// Material Downloading
// =============================================================================

export interface DownloadMaterialResult {
  success: boolean;
  localPath?: string;
  error?: string;
}

/**
 * Download a material file from a signed URL.
 * 
 * @param signedUrl - The signed URL to download from
 * @param targetPath - The local path to save the file to
 * @returns Download result
 */
export async function downloadMaterial(
  signedUrl: string,
  targetPath: string
): Promise<DownloadMaterialResult> {
  try {
    const response = await fetch(signedUrl, {
      method: 'GET',
    });
    
    if (!response.ok) {
      return {
        success: false,
        error: `Download failed with status ${response.status}`,
      };
    }
    
    // Import fs dynamically for server-side only
    const fs = await import('fs/promises');
    const path = await import('path');
    
    // Ensure directory exists
    const dir = path.dirname(targetPath);
    await fs.mkdir(dir, { recursive: true });
    
    // Get the file content as buffer
    const buffer = Buffer.from(await response.arrayBuffer());
    
    // Write to file
    await fs.writeFile(targetPath, buffer);
    
    return {
      success: true,
      localPath: targetPath,
    };
  } catch (error) {
    console.error('Material download error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Download failed',
    };
  }
}

/**
 * Check if a URL is a signed URL that we need to download from,
 * or if it's an external URL we can reference directly.
 */
export function isSignedUrl(url: string): boolean {
  // Signed URLs typically have query parameters for authentication
  try {
    const parsed = new URL(url);
    return parsed.searchParams.has('token') || 
           parsed.searchParams.has('signature') ||
           parsed.searchParams.has('X-Amz-Signature') ||
           parsed.hostname.includes('supabase');
  } catch {
    return false;
  }
}
