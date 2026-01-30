/**
 * Plugin Gallery
 * @version 1.0.0
 *
 * Fetches and caches an external plugin registry (gallery),
 * cross-references installed plugins to determine install status.
 */

import { prisma } from '@/lib/db/prisma';

// =============================================================================
// HARDCODED REGISTRY URL — not user-configurable to prevent bypassing
// the official plugin repository
// =============================================================================

const PLUGIN_REGISTRY_URL =
  'https://raw.githubusercontent.com/l33tdawg/cfp-directory-official-plugins/main/registry.json';

// =============================================================================
// TYPES
// =============================================================================

export interface GalleryPlugin {
  name: string;
  displayName: string;
  version: string;
  apiVersion: string;
  description: string;
  author: string;
  homepage?: string;
  permissions: string[];
  hooks: string[];
  downloadUrl: string;
  category?: string;
  tags?: string[];
}

export interface PluginGalleryRegistry {
  version: number;
  lastUpdated: string;
  plugins: GalleryPlugin[];
}

export type GalleryInstallStatus = 'not_installed' | 'installed' | 'update_available';

export interface GalleryPluginWithStatus extends GalleryPlugin {
  installStatus: GalleryInstallStatus;
  installedVersion?: string;
}

export interface GalleryResponse {
  plugins: GalleryPluginWithStatus[];
  lastUpdated: string;
  registryVersion: number;
}

// =============================================================================
// SEMVER COMPARISON
// =============================================================================

/**
 * Compare two semver strings (major.minor.patch).
 * Returns  1 if a > b, -1 if a < b, 0 if equal.
 */
export function compareSemver(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

// =============================================================================
// IN-MEMORY CACHE
// =============================================================================

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

let cachedRegistry: PluginGalleryRegistry | null = null;
let cacheTimestamp = 0;

export function clearGalleryCache(): void {
  cachedRegistry = null;
  cacheTimestamp = 0;
}

// =============================================================================
// FETCH REGISTRY
// =============================================================================

/**
 * Fetch the plugin gallery registry from the hardcoded official URL.
 * Uses an in-memory cache with 5-minute TTL.
 */
export async function fetchGalleryRegistry(
  forceRefresh = false
): Promise<PluginGalleryRegistry> {
  // Return cached if still valid
  if (!forceRefresh && cachedRegistry && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
    return cachedRegistry;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    // Add timestamp to bypass GitHub's CDN cache (max-age: 300)
    const cacheBuster = `?_t=${Date.now()}`;
    const response = await fetch(`${PLUGIN_REGISTRY_URL}${cacheBuster}`, {
      signal: controller.signal,
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
      },
    });

    if (!response.ok) {
      throw new Error(`Registry returned status ${response.status}`);
    }

    const data = (await response.json()) as PluginGalleryRegistry;

    // Basic validation
    if (!data.plugins || !Array.isArray(data.plugins)) {
      throw new Error('Invalid registry format: missing plugins array');
    }

    cachedRegistry = data;
    cacheTimestamp = Date.now();

    return data;
  } finally {
    clearTimeout(timeout);
  }
}

// =============================================================================
// GALLERY WITH STATUS
// =============================================================================

/**
 * Fetch the gallery registry and cross-reference with installed plugins
 * to determine the install status of each gallery plugin.
 */
export async function getGalleryWithStatus(
  forceRefresh = false
): Promise<GalleryResponse> {
  const registry = await fetchGalleryRegistry(forceRefresh);

  // Get all installed plugins from DB
  const installedPlugins = await prisma.plugin.findMany({
    select: { name: true, version: true },
  });

  const installedMap = new Map(
    installedPlugins.map((p) => [p.name, p.version])
  );

  const plugins: GalleryPluginWithStatus[] = registry.plugins.map((gp) => {
    const installedVersion = installedMap.get(gp.name);

    let installStatus: GalleryInstallStatus = 'not_installed';
    if (installedVersion) {
      installStatus =
        compareSemver(gp.version, installedVersion) > 0
          ? 'update_available'
          : 'installed';
    }

    return {
      ...gp,
      installStatus,
      ...(installedVersion ? { installedVersion } : {}),
    };
  });

  return {
    plugins,
    lastUpdated: registry.lastUpdated,
    registryVersion: registry.version,
  };
}
