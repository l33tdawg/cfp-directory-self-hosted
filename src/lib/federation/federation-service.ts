/**
 * Federation Service
 * 
 * Main service for managing federation state, license validation,
 * and feature gating. Caches license validation to avoid excessive API calls.
 */

import { prisma } from '@/lib/db/prisma';
import { config } from '@/lib/env';
import { validateLicense, sendHeartbeat } from './license-client';
import type {
  FederationState,
  LicenseInfo,
  LicenseWarning,
  LicenseFeatures,
  InstanceStats,
} from './types';

// Cache validation for 5 minutes in development, 1 hour in production
const CACHE_DURATION_MS = config.isDev ? 5 * 60 * 1000 : 60 * 60 * 1000;

// In-memory cache for license state
let cachedState: FederationState | null = null;
let cacheTimestamp: number = 0;

// =============================================================================
// Federation State Management
// =============================================================================

/**
 * Get the current federation state
 * Uses cached state if available and not expired
 */
export async function getFederationState(forceRefresh = false): Promise<FederationState> {
  // Check if we have a valid cache
  if (!forceRefresh && cachedState && Date.now() - cacheTimestamp < CACHE_DURATION_MS) {
    return cachedState;
  }
  
  // Check if federation is configured
  if (!config.federation.licenseKey) {
    const state: FederationState = {
      isEnabled: false,
      isConfigured: false,
      isValid: false,
      license: null,
      warnings: [],
      lastValidated: null,
      lastHeartbeat: null,
    };
    cachedState = state;
    cacheTimestamp = Date.now();
    return state;
  }
  
  // Try to get stored state from database first
  const storedSettings = await prisma.siteSettings.findUnique({
    where: { id: 'default' },
  });
  
  // Validate the license
  try {
    const result = await validateLicense();
    
    const state: FederationState = {
      isEnabled: storedSettings?.federationEnabled ?? false,
      isConfigured: true,
      isValid: result.valid,
      license: result.license ?? null,
      warnings: result.warnings ?? [],
      lastValidated: new Date(),
      lastHeartbeat: storedSettings?.federationLastHeartbeat ?? null,
    };
    
    // Update database with validation result
    if (result.valid && result.license) {
      await prisma.siteSettings.upsert({
        where: { id: 'default' },
        create: {
          id: 'default',
          federationEnabled: state.isEnabled,
          federationLicenseKey: config.federation.licenseKey,
          federationActivatedAt: new Date(),
          federationPublicKey: result.publicKey,
          federationWarnings: result.warnings ? JSON.parse(JSON.stringify(result.warnings)) : null,
          federationFeatures: result.license.features ? JSON.parse(JSON.stringify(result.license.features)) : null,
        },
        update: {
          federationPublicKey: result.publicKey,
          federationWarnings: result.warnings ? JSON.parse(JSON.stringify(result.warnings)) : null,
          federationFeatures: result.license.features ? JSON.parse(JSON.stringify(result.license.features)) : null,
        },
      });
    }
    
    cachedState = state;
    cacheTimestamp = Date.now();
    return state;
  } catch (error) {
    // Return cached or stored state on error
    const fallbackState: FederationState = {
      isEnabled: storedSettings?.federationEnabled ?? false,
      isConfigured: true,
      isValid: false,
      license: null,
      warnings: [{
        code: 'VALIDATION_ERROR',
        message: error instanceof Error ? error.message : 'Failed to validate license',
        severity: 'error',
      }],
      lastValidated: cachedState?.lastValidated ?? null,
      lastHeartbeat: storedSettings?.federationLastHeartbeat ?? null,
    };
    
    // Don't cache error state for long
    cachedState = fallbackState;
    cacheTimestamp = Date.now() - CACHE_DURATION_MS + 60000; // Re-check in 1 minute
    
    return fallbackState;
  }
}

/**
 * Enable or disable federation
 */
export async function setFederationEnabled(enabled: boolean): Promise<FederationState> {
  await prisma.siteSettings.upsert({
    where: { id: 'default' },
    create: {
      id: 'default',
      federationEnabled: enabled,
      federationLicenseKey: config.federation.licenseKey,
      federationActivatedAt: enabled ? new Date() : null,
    },
    update: {
      federationEnabled: enabled,
      federationActivatedAt: enabled ? new Date() : null,
    },
  });
  
  // Clear cache and refresh
  cachedState = null;
  return getFederationState(true);
}

// =============================================================================
// Feature Gating
// =============================================================================

/**
 * Check if a specific federation feature is available
 */
export async function hasFeature(feature: keyof LicenseFeatures): Promise<boolean> {
  const state = await getFederationState();
  
  if (!state.isEnabled || !state.isValid || !state.license) {
    return false;
  }
  
  return state.license.features[feature] === true;
}

/**
 * Check if federation is fully enabled and valid
 */
export async function isFederationActive(): Promise<boolean> {
  const state = await getFederationState();
  return state.isEnabled && state.isValid;
}

/**
 * Get enabled features
 */
export async function getEnabledFeatures(): Promise<Partial<LicenseFeatures>> {
  const state = await getFederationState();
  
  if (!state.isEnabled || !state.isValid || !state.license) {
    return {};
  }
  
  return state.license.features;
}

// =============================================================================
// Heartbeat
// =============================================================================

/**
 * Result of a heartbeat operation
 */
export interface HeartbeatResult {
  success: boolean;
  warnings?: LicenseWarning[];
  updateAvailable?: boolean;
  error?: string;
}

/**
 * Send a heartbeat to cfp.directory
 * Should be called periodically (e.g., every hour)
 */
export async function performHeartbeat(): Promise<HeartbeatResult> {
  const state = await getFederationState();
  
  if (!state.isEnabled || !state.isConfigured) {
    return { success: false, error: 'Federation not enabled or not configured' };
  }
  
  try {
    // Gather instance stats
    const stats = await getInstanceStats();
    
    // Send heartbeat
    const result = await sendHeartbeat(stats);
    
    // Update last heartbeat time and warnings
    await prisma.siteSettings.update({
      where: { id: 'default' },
      data: {
        federationLastHeartbeat: new Date(),
        federationWarnings: result.warnings ? JSON.parse(JSON.stringify(result.warnings)) : null,
      },
    });
    
    // Update cached state with new warnings
    if (cachedState) {
      cachedState.lastHeartbeat = new Date();
      cachedState.warnings = result.warnings ?? [];
    }
    
    return {
      success: true,
      warnings: result.warnings,
      updateAvailable: result.updateAvailable,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get instance statistics for heartbeat
 */
async function getInstanceStats(): Promise<InstanceStats> {
  const [
    totalEvents,
    federatedEvents,
    totalSubmissions,
    federatedSubmissions,
    activeUsers,
  ] = await Promise.all([
    prisma.event.count(),
    prisma.event.count({ where: { isFederated: true } }),
    prisma.submission.count(),
    prisma.submission.count({ where: { isFederated: true } }),
    prisma.user.count({
      where: {
        sessions: {
          some: {
            expires: { gt: new Date() },
          },
        },
      },
    }),
  ]);
  
  return {
    totalEvents,
    federatedEvents,
    totalSubmissions,
    federatedSubmissions,
    activeUsers,
  };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Clear the cached federation state
 */
export function clearCache(): void {
  cachedState = null;
  cacheTimestamp = 0;
}

/**
 * Get license info from cache (synchronous, may be stale)
 */
export function getCachedLicense(): LicenseInfo | null {
  return cachedState?.license ?? null;
}

/**
 * Get warnings from the last validation
 */
export function getCachedWarnings(): LicenseWarning[] {
  return cachedState?.warnings ?? [];
}
