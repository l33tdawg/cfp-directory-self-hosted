/**
 * Plugin Loader
 * @version 1.2.0
 *
 * Scans, loads, and initializes plugins from the filesystem and database.
 * Uses jiti for runtime TypeScript compilation to support TypeScript plugins.
 */

import path from 'path';
import fs from 'fs/promises';
import { createJiti } from 'jiti';
import type { Plugin, PluginManifest, PluginLoadResult, PluginPermission, PluginRecord } from './types';
import { isVersionSupported, SUPPORTED_VERSIONS } from './version';
import { getPluginRegistry } from './registry';
import { prisma } from '@/lib/db/prisma';

// Create jiti instance for loading TypeScript plugins at runtime
// This is necessary because Next.js production builds can't dynamically import TypeScript
const jiti = createJiti(import.meta.url, {
  interopDefault: true,
  // Use the project's tsconfig for path aliases
  alias: {
    '@': path.join(process.cwd(), 'src'),
  },
  // Enable JSX/TSX support
  jsx: true,
  // Use native require for framework modules - this ensures they're loaded from app's node_modules
  nativeModules: [
    'next',
    'next/link',
    'next/image',
    'next/navigation',
    'next/dynamic',
    'react',
    'react-dom',
    'lucide-react',
  ],
});

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Default plugins directory relative to project root
 */
export const PLUGINS_DIR = path.join(process.cwd(), 'plugins');

/**
 * Expected plugin entry file name
 */
const PLUGIN_ENTRY_FILE = 'index';

/**
 * Expected manifest file name
 */
const MANIFEST_FILE = 'manifest.json';

// =============================================================================
// MANIFEST LOADING
// =============================================================================

/**
 * Load and validate a plugin manifest
 */
async function loadManifest(pluginDir: string): Promise<PluginManifest | null> {
  const manifestPath = path.join(pluginDir, MANIFEST_FILE);
  
  try {
    const content = await fs.readFile(manifestPath, 'utf-8');
    const manifest = JSON.parse(content) as PluginManifest;
    
    // Validate required fields
    if (!manifest.name || typeof manifest.name !== 'string') {
      console.error(`[PluginLoader] Invalid manifest: missing 'name' in ${manifestPath}`);
      return null;
    }
    
    if (!manifest.displayName || typeof manifest.displayName !== 'string') {
      console.error(`[PluginLoader] Invalid manifest: missing 'displayName' in ${manifestPath}`);
      return null;
    }
    
    if (!manifest.version || typeof manifest.version !== 'string') {
      console.error(`[PluginLoader] Invalid manifest: missing 'version' in ${manifestPath}`);
      return null;
    }
    
    if (!manifest.apiVersion || typeof manifest.apiVersion !== 'string') {
      console.error(`[PluginLoader] Invalid manifest: missing 'apiVersion' in ${manifestPath}`);
      return null;
    }
    
    // Check API version compatibility
    if (!isVersionSupported(manifest.apiVersion)) {
      console.error(
        `[PluginLoader] Plugin ${manifest.name} requires API version ${manifest.apiVersion}, ` +
        `but only versions ${SUPPORTED_VERSIONS.join(', ')} are supported`
      );
      return null;
    }
    
    return manifest;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.error(`[PluginLoader] No manifest.json found in ${pluginDir}`);
    } else {
      console.error(`[PluginLoader] Failed to load manifest from ${pluginDir}:`, error);
    }
    return null;
  }
}

// =============================================================================
// PLUGIN LOADING
// =============================================================================

/**
 * Load a plugin from a directory
 */
async function loadPluginFromDir(pluginDir: string): Promise<PluginLoadResult> {
  const dirName = path.basename(pluginDir);
  
  // Load manifest first
  const manifest = await loadManifest(pluginDir);
  if (!manifest) {
    return { success: false, error: 'Failed to load manifest' };
  }
  
  // Verify directory name matches plugin name
  if (dirName !== manifest.name) {
    return {
      success: false,
      error: `Directory name '${dirName}' doesn't match plugin name '${manifest.name}'`,
    };
  }
  
  // Try to load the plugin entry - check for both .ts and .js files
  const tsEntryPath = path.join(pluginDir, `${PLUGIN_ENTRY_FILE}.ts`);
  const jsEntryPath = path.join(pluginDir, `${PLUGIN_ENTRY_FILE}.js`);

  // Determine which entry file exists
  let entryPath: string;
  try {
    await fs.access(tsEntryPath);
    entryPath = tsEntryPath;
  } catch {
    try {
      await fs.access(jsEntryPath);
      entryPath = jsEntryPath;
    } catch {
      return {
        success: false,
        error: `No plugin entry file found (tried ${PLUGIN_ENTRY_FILE}.ts and ${PLUGIN_ENTRY_FILE}.js)`,
      };
    }
  }

  try {
    // Use jiti for runtime TypeScript/JavaScript loading
    // This handles TypeScript compilation and path alias resolution
    const pluginModule = jiti(entryPath);
    const plugin: Plugin = pluginModule.default || pluginModule;

    // Verify the plugin has required interface
    if (!plugin.manifest) {
      // Use the manifest from file if not embedded
      plugin.manifest = manifest;
    }

    return { success: true, plugin };
  } catch (error) {
    return {
      success: false,
      error: `Failed to load plugin entry: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// =============================================================================
// FILESYSTEM SCANNING
// =============================================================================

/**
 * Scan plugins directory for available plugins
 */
export async function scanPluginsDirectory(): Promise<string[]> {
  try {
    // Ensure plugins directory exists
    await fs.mkdir(PLUGINS_DIR, { recursive: true });
    
    const entries = await fs.readdir(PLUGINS_DIR, { withFileTypes: true });
    
    return entries
      .filter(entry => entry.isDirectory())
      .filter(entry => !entry.name.startsWith('.')) // Ignore hidden directories
      .map(entry => path.join(PLUGINS_DIR, entry.name));
  } catch (error) {
    console.error('[PluginLoader] Failed to scan plugins directory:', error);
    return [];
  }
}

// =============================================================================
// DATABASE SYNC
// =============================================================================

/**
 * Sync a plugin with the database
 * Creates new record if not exists, updates if version changed
 */
export async function syncPluginWithDatabase(
  manifest: PluginManifest,
  sourcePath: string
): Promise<PluginRecord> {
  const existing = await prisma.plugin.findUnique({
    where: { name: manifest.name },
  });
  
  const pluginData = {
    name: manifest.name,
    displayName: manifest.displayName,
    description: manifest.description || null,
    version: manifest.version,
    apiVersion: manifest.apiVersion,
    author: manifest.author || null,
    homepage: manifest.homepage || null,
    source: 'local' as const,
    sourcePath,
    configSchema: manifest.configSchema ? JSON.parse(JSON.stringify(manifest.configSchema)) : undefined,
    permissions: manifest.permissions ? JSON.parse(JSON.stringify(manifest.permissions)) : [],
    hooks: manifest.hooks || [],
  };
  
  if (existing) {
    // Always sync metadata fields; detect version change for logging
    const versionChanged = existing.version !== manifest.version;
    const metadataChanged =
      existing.displayName !== pluginData.displayName ||
      existing.description !== pluginData.description ||
      existing.author !== pluginData.author ||
      existing.homepage !== pluginData.homepage ||
      existing.apiVersion !== pluginData.apiVersion ||
      JSON.stringify(existing.hooks) !== JSON.stringify(pluginData.hooks);

    if (versionChanged || metadataChanged) {
      const updated = await prisma.plugin.update({
        where: { id: existing.id },
        data: pluginData,
      });
      if (versionChanged) {
        console.log(`[PluginLoader] Updated plugin ${manifest.name} from v${existing.version} to v${manifest.version}`);
      } else {
        console.log(`[PluginLoader] Synced metadata for plugin ${manifest.name} v${manifest.version}`);
      }
      return updated as unknown as PluginRecord;
    }
    return existing as unknown as PluginRecord;
  }
  
  // Create new plugin record
  const created = await prisma.plugin.create({
    data: {
      ...pluginData,
      enabled: false, // New plugins start disabled
      installed: true,
    },
  });
  console.log(`[PluginLoader] Registered new plugin: ${manifest.name} v${manifest.version}`);
  return created as unknown as PluginRecord;
}

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize all plugins
 * - Scans filesystem for plugins
 * - Syncs with database
 * - Loads enabled plugins into registry
 * - Calls onEnable for enabled plugins
 */
export async function initializePlugins(): Promise<void> {
  const registry = getPluginRegistry();
  
  if (registry.isInitialized()) {
    console.log('[PluginLoader] Plugins already initialized');
    return;
  }
  
  console.log('[PluginLoader] Initializing plugin system...');
  
  // Scan filesystem for plugins
  const pluginDirs = await scanPluginsDirectory();
  console.log(`[PluginLoader] Found ${pluginDirs.length} plugin directories`);
  
  // Load each plugin
  for (const pluginDir of pluginDirs) {
    const result = await loadPluginFromDir(pluginDir);
    
    if (!result.success || !result.plugin) {
      console.error(`[PluginLoader] Failed to load plugin from ${pluginDir}: ${result.error}`);
      continue;
    }
    
    const plugin = result.plugin;
    const manifest = plugin.manifest;
    
    try {
      // Sync with database
      const dbRecord = await syncPluginWithDatabase(manifest, pluginDir);
      
      // Register with the registry
      registry.register(
        plugin,
        dbRecord.id,
        dbRecord.config as Record<string, unknown>,
        dbRecord.permissions,
        dbRecord.enabled,
        dbRecord.configSchema as import('./types').JSONSchema | null
      );
      
      // Enable if marked as enabled in database
      if (dbRecord.enabled) {
        await registry.enable(manifest.name);
      }
      
      console.log(
        `[PluginLoader] Loaded plugin: ${manifest.name} v${manifest.version}` +
        ` (${dbRecord.enabled ? 'enabled' : 'disabled'})`
      );
    } catch (error) {
      console.error(`[PluginLoader] Failed to register plugin ${manifest.name}:`, error);
    }
  }
  
  registry.setInitialized(true);
  console.log(`[PluginLoader] Plugin system initialized with ${registry.count()} plugins`);
}

/**
 * Load a single plugin into the registry
 * Used after installing a new plugin or when a plugin needs to be loaded on-demand
 * @returns The loaded plugin record, or null if loading failed
 */
export async function loadSinglePlugin(pluginName: string): Promise<PluginRecord | null> {
  const registry = getPluginRegistry();

  // Check if already loaded
  const existing = registry.get(pluginName);
  if (existing) {
    console.log(`[PluginLoader] Plugin ${pluginName} already loaded in registry`);
    return null;
  }

  const pluginDir = path.join(PLUGINS_DIR, pluginName);

  // Load from filesystem
  const result = await loadPluginFromDir(pluginDir);
  if (!result.success || !result.plugin) {
    console.error(`[PluginLoader] Failed to load plugin ${pluginName}: ${result.error}`);
    return null;
  }

  // Get db record
  const dbRecord = await prisma.plugin.findUnique({
    where: { name: pluginName },
  });

  if (!dbRecord) {
    console.error(`[PluginLoader] Plugin ${pluginName} not found in database`);
    return null;
  }

  // Register with the registry
  registry.register(
    result.plugin,
    dbRecord.id,
    dbRecord.config as Record<string, unknown>,
    dbRecord.permissions as unknown as PluginPermission[],
    dbRecord.enabled,
    dbRecord.configSchema as import('./types').JSONSchema | null
  );

  // Enable if marked as enabled in database
  if (dbRecord.enabled) {
    await registry.enable(pluginName);
  }

  console.log(
    `[PluginLoader] Loaded plugin: ${pluginName} v${result.plugin.manifest.version}` +
    ` (${dbRecord.enabled ? 'enabled' : 'disabled'})`
  );

  return dbRecord as unknown as PluginRecord;
}

/**
 * Reload a specific plugin
 */
export async function reloadPlugin(pluginName: string): Promise<boolean> {
  const registry = getPluginRegistry();

  // Get current plugin state
  const existing = registry.get(pluginName);
  if (!existing) {
    // Try to load it if not already loaded
    const loaded = await loadSinglePlugin(pluginName);
    return loaded !== null;
  }
  
  const pluginDir = path.join(PLUGINS_DIR, pluginName);
  
  // Disable first
  await registry.disable(pluginName);
  
  // Unregister
  registry.unregister(pluginName);
  
  // Reload from filesystem
  const result = await loadPluginFromDir(pluginDir);
  if (!result.success || !result.plugin) {
    console.error(`[PluginLoader] Failed to reload plugin ${pluginName}: ${result.error}`);
    return false;
  }
  
  // Get current db record
  const dbRecord = await prisma.plugin.findUnique({
    where: { name: pluginName },
  });
  
  if (!dbRecord) {
    console.error(`[PluginLoader] Plugin ${pluginName} not found in database`);
    return false;
  }
  
  // Re-register
  registry.register(
    result.plugin,
    dbRecord.id,
    dbRecord.config as Record<string, unknown>,
    dbRecord.permissions as unknown as PluginPermission[],
    dbRecord.enabled,
    dbRecord.configSchema as import('./types').JSONSchema | null
  );
  
  // Re-enable if was enabled
  if (dbRecord.enabled) {
    await registry.enable(pluginName);
  }
  
  console.log(`[PluginLoader] Reloaded plugin: ${pluginName}`);
  return true;
}

/**
 * Get list of all plugins from database
 */
export async function getPluginList(): Promise<PluginRecord[]> {
  const plugins = await prisma.plugin.findMany({
    orderBy: { name: 'asc' },
  });
  return plugins as unknown as PluginRecord[];
}

/**
 * Enable a plugin by name
 */
export async function enablePlugin(pluginName: string): Promise<boolean> {
  const registry = getPluginRegistry();

  // Update database (source of truth)
  await prisma.plugin.update({
    where: { name: pluginName },
    data: { enabled: true },
  });

  // Enable in registry if loaded (may not be present during dev hot-reload)
  if (registry.get(pluginName)) {
    await registry.enable(pluginName);
  }

  return true;
}

/**
 * Disable a plugin by name
 */
export async function disablePlugin(pluginName: string): Promise<boolean> {
  const registry = getPluginRegistry();

  // Update database (source of truth)
  await prisma.plugin.update({
    where: { name: pluginName },
    data: { enabled: false },
  });

  // Disable in registry if loaded (may not be present during dev hot-reload)
  if (registry.get(pluginName)) {
    await registry.disable(pluginName);
  }

  return true;
}

/**
 * Update plugin config
 */
export async function updatePluginConfig(
  pluginName: string,
  config: Record<string, unknown>
): Promise<boolean> {
  const registry = getPluginRegistry();
  
  // Update database - serialize config to ensure JSON compatibility
  await prisma.plugin.update({
    where: { name: pluginName },
    data: { config: JSON.parse(JSON.stringify(config)) },
  });
  
  // Update in registry
  return registry.updateConfig(pluginName, config);
}
