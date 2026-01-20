/**
 * Federation License Client
 * 
 * Client for communicating with cfp.directory's federation API
 * to validate licenses, send heartbeats, and register events.
 */

import { config } from '@/lib/env';
import type {
  ValidateLicenseRequest,
  ValidateLicenseResponse,
  HeartbeatRequest,
  HeartbeatResponse,
  RegisterEventRequest,
  RegisterEventResponse,
  UnregisterEventRequest,
  UnregisterEventResponse,
  InstanceStats,
} from './types';

// Package version (updated during build)
const APP_VERSION = process.env.npm_package_version || '0.1.0';

/**
 * Create the base headers for API requests
 */
function createHeaders(licenseKey?: string): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'User-Agent': `CFP-Directory-Self-Hosted/${APP_VERSION}`,
  };
  
  if (licenseKey) {
    headers['X-License-Key'] = licenseKey;
  }
  
  return headers;
}

/**
 * Make a request to the federation API
 */
async function federationRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${config.federation.apiUrl}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...createHeaders(config.federation.licenseKey),
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new FederationApiError(
        errorData.error || `API request failed with status ${response.status}`,
        response.status,
        errorData
      );
    }
    
    return response.json();
  } catch (error) {
    if (error instanceof FederationApiError) {
      throw error;
    }
    
    // Network error or other issue
    throw new FederationApiError(
      `Failed to connect to federation API: ${error instanceof Error ? error.message : 'Unknown error'}`,
      0
    );
  }
}

/**
 * Custom error class for federation API errors
 */
export class FederationApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly data?: unknown
  ) {
    super(message);
    this.name = 'FederationApiError';
  }
}

// =============================================================================
// License Validation
// =============================================================================

/**
 * Validate a license key with cfp.directory
 */
export async function validateLicense(): Promise<ValidateLicenseResponse> {
  if (!config.federation.licenseKey) {
    return {
      valid: false,
      error: 'No license key configured',
    };
  }
  
  const request: ValidateLicenseRequest = {
    licenseKey: config.federation.licenseKey,
    instanceUrl: config.app.url,
    version: APP_VERSION,
  };
  
  try {
    return await federationRequest<ValidateLicenseResponse>('/validate-license', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  } catch (error) {
    if (error instanceof FederationApiError) {
      return {
        valid: false,
        error: error.message,
      };
    }
    throw error;
  }
}

// =============================================================================
// Heartbeat
// =============================================================================

/**
 * Send a heartbeat to cfp.directory with instance stats
 */
export async function sendHeartbeat(stats: InstanceStats): Promise<HeartbeatResponse> {
  if (!config.federation.licenseKey) {
    return {
      success: false,
      warnings: [{
        code: 'NO_LICENSE',
        message: 'No license key configured',
        severity: 'error',
      }],
    };
  }
  
  const request: HeartbeatRequest = {
    licenseKey: config.federation.licenseKey,
    instanceUrl: config.app.url,
    version: APP_VERSION,
    stats,
  };
  
  try {
    return await federationRequest<HeartbeatResponse>('/heartbeat', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  } catch (error) {
    return {
      success: false,
      warnings: [{
        code: 'HEARTBEAT_FAILED',
        message: error instanceof Error ? error.message : 'Heartbeat failed',
        severity: 'warning',
      }],
    };
  }
}

// =============================================================================
// Event Registration
// =============================================================================

/**
 * Register an event with cfp.directory for federation
 */
export async function registerEvent(
  event: RegisterEventRequest['event'],
  callbackUrl: string
): Promise<RegisterEventResponse> {
  if (!config.federation.licenseKey) {
    return {
      success: false,
      error: 'No license key configured',
    };
  }
  
  const request: RegisterEventRequest = {
    licenseKey: config.federation.licenseKey,
    event,
    callbackUrl,
  };
  
  return federationRequest<RegisterEventResponse>('/events/register', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * Unregister an event from cfp.directory
 */
export async function unregisterEvent(
  federatedEventId: string
): Promise<UnregisterEventResponse> {
  if (!config.federation.licenseKey) {
    return {
      success: false,
      error: 'No license key configured',
    };
  }
  
  const request: UnregisterEventRequest = {
    licenseKey: config.federation.licenseKey,
    federatedEventId,
  };
  
  return federationRequest<UnregisterEventResponse>('/events/unregister', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check if the federation API is reachable
 */
export async function checkApiHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${config.federation.apiUrl}/health`, {
      method: 'GET',
      headers: createHeaders(),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get the current app version
 */
export function getAppVersion(): string {
  return APP_VERSION;
}
