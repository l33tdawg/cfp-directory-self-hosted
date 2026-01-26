/**
 * Plugin API Version Management
 * @version 1.1.0
 *
 * Handles API version negotiation and compatibility layers.
 */

import type { PluginContext } from './types';

/**
 * Current API version
 */
export const CURRENT_API_VERSION = '1.0';

/**
 * All supported API versions
 */
export const SUPPORTED_VERSIONS = ['1.0'] as const;

/**
 * Type for supported versions
 */
export type SupportedVersion = typeof SUPPORTED_VERSIONS[number];

/**
 * Check if a plugin API version is supported
 */
export function isVersionSupported(pluginApiVersion: string): boolean {
  return SUPPORTED_VERSIONS.includes(pluginApiVersion as SupportedVersion);
}

/**
 * Get the major version from a version string
 */
export function getMajorVersion(version: string): number {
  const [major] = version.split('.');
  return parseInt(major, 10);
}

/**
 * Get the minor version from a version string
 */
export function getMinorVersion(version: string): number {
  const [, minor] = version.split('.');
  return parseInt(minor || '0', 10);
}

/**
 * Check if two versions are compatible
 * Compatible means same major version and plugin minor <= current minor
 */
export function areVersionsCompatible(
  pluginVersion: string,
  currentVersion: string = CURRENT_API_VERSION
): boolean {
  const pluginMajor = getMajorVersion(pluginVersion);
  const currentMajor = getMajorVersion(currentVersion);
  
  if (pluginMajor !== currentMajor) {
    return false;
  }
  
  const pluginMinor = getMinorVersion(pluginVersion);
  const currentMinor = getMinorVersion(currentVersion);
  
  // Plugin can target older or same minor version
  return pluginMinor <= currentMinor;
}

/**
 * Version info for display
 */
export interface VersionInfo {
  current: string;
  supported: readonly string[];
  isSupported: boolean;
  isCompatible: boolean;
}

/**
 * Get version compatibility info for a plugin
 */
export function getVersionInfo(pluginApiVersion: string): VersionInfo {
  return {
    current: CURRENT_API_VERSION,
    supported: SUPPORTED_VERSIONS,
    isSupported: isVersionSupported(pluginApiVersion),
    isCompatible: areVersionsCompatible(pluginApiVersion),
  };
}

/**
 * Context factory type for version-specific context creation
 */
export type PluginContextFactory = (
  pluginId: string,
  config: Record<string, unknown>,
  permissions: Set<string>
) => PluginContext;

/**
 * Get the appropriate context factory for an API version
 * This enables version-specific behavior/compatibility layers
 */
export function getContextFactoryForVersion(version: string): PluginContextFactory | null {
  // Currently only v1.0 exists
  if (version === '1.0') {
    // Import dynamically to avoid circular deps - will be implemented in context.ts
    // For now return null, will be wired up when context.ts is created
    return null;
  }
  
  return null;
}

/**
 * Version changelog for documentation
 */
export const VERSION_CHANGELOG: Record<string, string[]> = {
  '1.0': [
    'Initial plugin API release',
    'Core hooks: submission, user, review, event, email',
    'Capability-based context with permissions',
    'Plugin registry and loader',
    'Plugin logging system',
  ],
};

/**
 * Upcoming version features (for planning)
 */
export const UPCOMING_FEATURES: Record<string, string[]> = {
  '1.1': [
    'Background job queue',
    'Job locking and concurrency',
    'Job status tracking',
  ],
  '1.2': [
    'UI extension slots',
    'Plugin error boundaries',
    'Dynamic component loading',
  ],
};
