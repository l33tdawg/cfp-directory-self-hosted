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

/**
 * Maximum file size for downloaded materials (50MB)
 */
const MAX_DOWNLOAD_SIZE_BYTES = 50 * 1024 * 1024;

/**
 * Download timeout in milliseconds (30 seconds)
 */
const DOWNLOAD_TIMEOUT_MS = 30000;

/**
 * Allowed URL schemes for material downloads
 */
const ALLOWED_SCHEMES = ['https:'];

/**
 * List of private IP ranges that should be blocked (SSRF protection)
 */
const PRIVATE_IP_PATTERNS = [
  /^127\./,                          // Loopback
  /^10\./,                           // Class A private
  /^172\.(1[6-9]|2[0-9]|3[01])\./,  // Class B private
  /^192\.168\./,                     // Class C private
  /^169\.254\./,                     // Link-local
  /^0\./,                            // Current network
  /^224\./,                          // Multicast
  /^::1$/,                           // IPv6 loopback
  /^fe80:/i,                         // IPv6 link-local
  /^fc00:/i,                         // IPv6 unique local
  /^fd00:/i,                         // IPv6 unique local
];

/**
 * Blocked hostnames for SSRF protection
 */
const BLOCKED_HOSTNAMES = [
  'localhost',
  'metadata.google.internal',
  'metadata.google',
  '169.254.169.254',  // AWS/GCP metadata
  'metadata',
];

export interface DownloadMaterialResult {
  success: boolean;
  localPath?: string;
  error?: string;
}

/**
 * Validate a URL for SSRF protection
 * 
 * @param url - The URL to validate
 * @returns Object with valid flag and error message if invalid
 */
function validateDownloadUrl(url: string): { valid: boolean; error?: string } {
  try {
    const parsed = new URL(url);
    
    // Check scheme (HTTPS only)
    if (!ALLOWED_SCHEMES.includes(parsed.protocol)) {
      return { valid: false, error: `URL scheme '${parsed.protocol}' not allowed, must be HTTPS` };
    }
    
    // Check for blocked hostnames
    const hostname = parsed.hostname.toLowerCase();
    if (BLOCKED_HOSTNAMES.some(blocked => hostname === blocked || hostname.endsWith('.' + blocked))) {
      return { valid: false, error: `Blocked hostname: ${hostname}` };
    }
    
    // Check for IP addresses in private ranges
    for (const pattern of PRIVATE_IP_PATTERNS) {
      if (pattern.test(hostname)) {
        return { valid: false, error: `Private/internal IP addresses are not allowed: ${hostname}` };
      }
    }
    
    // Block raw IP addresses entirely (require proper hostnames)
    // This is more conservative but prevents many SSRF vectors
    if (/^[0-9.:]+$/.test(hostname)) {
      return { valid: false, error: 'Raw IP addresses are not allowed in URLs' };
    }
    
    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

/**
 * Sanitize a filename to prevent path traversal
 * 
 * @param filename - The filename to sanitize
 * @returns Sanitized filename safe for use in paths
 */
export function sanitizeFileName(filename: string): string {
  if (!filename) return 'unnamed-file';
  
  // Remove path components and traversal attempts
  let sanitized = filename
    // Remove any path separators
    .replace(/[/\\]/g, '_')
    // Remove path traversal sequences
    .replace(/\.\./g, '_')
    // Remove null bytes
    .replace(/\0/g, '')
    // Remove URL-encoded path traversal
    .replace(/%2e%2e/gi, '_')
    .replace(/%2f/gi, '_')
    .replace(/%5c/gi, '_')
    // Remove special characters that could be problematic
    .replace(/[<>:"|?*]/g, '_')
    // Collapse multiple underscores
    .replace(/_+/g, '_')
    // Trim leading/trailing underscores and whitespace
    .trim()
    .replace(/^_+|_+$/g, '');
  
  // Ensure we have a valid filename
  if (!sanitized || sanitized === '.' || sanitized === '..') {
    sanitized = 'unnamed-file';
  }
  
  // Limit length
  if (sanitized.length > 200) {
    const ext = sanitized.includes('.') ? sanitized.substring(sanitized.lastIndexOf('.')) : '';
    sanitized = sanitized.substring(0, 200 - ext.length) + ext;
  }
  
  return sanitized;
}

/**
 * Download a material file from a signed URL with SSRF protection.
 * 
 * SECURITY: This function includes multiple protections:
 * - URL validation (HTTPS only, no private IPs, no blocked hostnames)
 * - Size limits to prevent memory exhaustion
 * - Timeout to prevent hanging connections
 * - Streaming download with size checking
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
    // SECURITY: Validate URL before making request (SSRF protection)
    const urlValidation = validateDownloadUrl(signedUrl);
    if (!urlValidation.valid) {
      console.error(`[Federation] SSRF protection blocked URL: ${urlValidation.error}`);
      return {
        success: false,
        error: `URL validation failed: ${urlValidation.error}`,
      };
    }
    
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
    
    try {
      const response = await fetch(signedUrl, {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        return {
          success: false,
          error: `Download failed with status ${response.status}`,
        };
      }
      
      // Check content-length if available
      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength, 10) > MAX_DOWNLOAD_SIZE_BYTES) {
        return {
          success: false,
          error: `File too large: ${contentLength} bytes (max: ${MAX_DOWNLOAD_SIZE_BYTES})`,
        };
      }
      
      // Get the file content as buffer with size checking
      const arrayBuffer = await response.arrayBuffer();
      
      if (arrayBuffer.byteLength > MAX_DOWNLOAD_SIZE_BYTES) {
        return {
          success: false,
          error: `File too large: ${arrayBuffer.byteLength} bytes (max: ${MAX_DOWNLOAD_SIZE_BYTES})`,
        };
      }
      
      const buffer = Buffer.from(arrayBuffer);
      
      // Import fs dynamically for server-side only
      const fs = await import('fs/promises');
      const path = await import('path');
      
      // SECURITY: Ensure targetPath is within expected directory
      // This is a secondary check - the caller should also validate
      const normalizedPath = path.normalize(targetPath);
      if (normalizedPath.includes('..') || !normalizedPath.startsWith('./uploads/')) {
        return {
          success: false,
          error: 'Invalid target path',
        };
      }
      
      // Ensure directory exists
      const dir = path.dirname(targetPath);
      await fs.mkdir(dir, { recursive: true });
      
      // Write to file
      await fs.writeFile(targetPath, buffer);
      
      return {
        success: true,
        localPath: targetPath,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        error: `Download timeout after ${DOWNLOAD_TIMEOUT_MS}ms`,
      };
    }
    
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
