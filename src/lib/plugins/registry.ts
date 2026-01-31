/**
 * Plugin Registry
 * @version 1.6.0
 *
 * Singleton that manages all loaded plugin instances.
 * Integrates with the slot registry for UI component management.
 *
 * Memory Management (v1.6.0):
 * - Plugins can implement onUnload() to clean up resources
 * - Use pruneDisabledPlugins() to remove disabled plugins from memory
 * - disable(name, true) will also unload the plugin from memory
 */

import type { Plugin, LoadedPlugin, PluginPermission, JSONSchema } from './types';
import type { HookName } from './hooks/types';
import { createPluginContext, createClientPluginContext } from './context';
import { getSlotRegistry } from './slots/registry';
import { isStaticSlotName } from './slots/types';
import type { SlotName, DynamicSlotName } from './slots/types';
import { unregisterPluginHandlers } from './jobs/worker';
import { prisma } from '@/lib/db/prisma';
import { getPasswordFields, decryptConfigFields } from './config-encryption';

// =============================================================================
// PLUGIN REGISTRY
// =============================================================================

class PluginRegistry {
  private plugins: Map<string, LoadedPlugin> = new Map();
  private hookIndex: Map<HookName, Set<string>> = new Map();
  private initialized: boolean = false;

  /**
   * Register a plugin with the registry
   */
  register(
    plugin: Plugin,
    dbId: string,
    config: Record<string, unknown>,
    permissions: PluginPermission[],
    enabled: boolean,
    configSchema?: JSONSchema | null
  ): LoadedPlugin {
    const pluginName = plugin.manifest.name;

    // Create context for this plugin
    const context = createPluginContext({
      pluginId: dbId,
      pluginName,
      config,
      permissions,
      configSchema,
    });
    
    const loadedPlugin: LoadedPlugin = {
      plugin,
      context,
      enabled,
      dbId,
    };
    
    // Store in registry
    this.plugins.set(pluginName, loadedPlugin);
    
    // Index hooks
    if (plugin.hooks) {
      for (const hookName of Object.keys(plugin.hooks) as HookName[]) {
        if (!this.hookIndex.has(hookName)) {
          this.hookIndex.set(hookName, new Set());
        }
        this.hookIndex.get(hookName)!.add(pluginName);
      }
    }

    // Register UI slot components if plugin is enabled
    if (enabled) {
      this.registerSlotComponents(loadedPlugin);
    }

    return loadedPlugin;
  }

  /**
   * Unregister a plugin
   */
  unregister(pluginName: string): boolean {
    const loadedPlugin = this.plugins.get(pluginName);
    if (!loadedPlugin) {
      return false;
    }
    
    // Remove from hook index
    if (loadedPlugin.plugin.hooks) {
      for (const hookName of Object.keys(loadedPlugin.plugin.hooks) as HookName[]) {
        this.hookIndex.get(hookName)?.delete(pluginName);
      }
    }

    // Remove UI slot components
    this.unregisterSlotComponents(pluginName);

    // Unregister job handlers (defense-in-depth)
    unregisterPluginHandlers(loadedPlugin.dbId);

    // Remove from registry
    this.plugins.delete(pluginName);
    return true;
  }

  /**
   * Get a plugin by name
   */
  get(pluginName: string): LoadedPlugin | undefined {
    return this.plugins.get(pluginName);
  }

  /**
   * Get all registered plugins
   */
  getAll(): LoadedPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get all enabled plugins
   */
  getEnabledPlugins(): LoadedPlugin[] {
    return Array.from(this.plugins.values()).filter(p => p.enabled);
  }

  /**
   * Get all plugins that handle a specific hook
   */
  getPluginsWithHook(hookName: HookName): LoadedPlugin[] {
    const pluginNames = this.hookIndex.get(hookName);
    if (!pluginNames) {
      return [];
    }
    
    return Array.from(pluginNames)
      .map(name => this.plugins.get(name))
      .filter((p): p is LoadedPlugin => p !== undefined && p.enabled);
  }

  /**
   * Enable a plugin
   */
  async enable(pluginName: string): Promise<boolean> {
    const loadedPlugin = this.plugins.get(pluginName);
    if (!loadedPlugin) {
      return false;
    }
    
    if (loadedPlugin.enabled) {
      return true; // Already enabled
    }
    
    try {
      // Call onEnable hook if defined
      if (loadedPlugin.plugin.onEnable) {
        await loadedPlugin.plugin.onEnable(loadedPlugin.context);
      }
      
      loadedPlugin.enabled = true;

      // Register UI slot components
      this.registerSlotComponents(loadedPlugin);

      loadedPlugin.context.logger.info('Plugin enabled');
      return true;
    } catch (error) {
      loadedPlugin.context.logger.error('Failed to enable plugin', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Disable a plugin
   * @param pluginName - The plugin name
   * @param unloadFromMemory - If true, also unload the plugin from memory (default: false)
   */
  async disable(pluginName: string, unloadFromMemory: boolean = false): Promise<boolean> {
    const loadedPlugin = this.plugins.get(pluginName);
    if (!loadedPlugin) {
      return false;
    }

    if (!loadedPlugin.enabled) {
      // Already disabled, but might still want to unload
      if (unloadFromMemory) {
        await this.unloadPlugin(pluginName);
      }
      return true;
    }

    try {
      // Call onDisable hook if defined
      if (loadedPlugin.plugin.onDisable) {
        await loadedPlugin.plugin.onDisable(loadedPlugin.context);
      }

      loadedPlugin.enabled = false;

      // Unregister UI slot components
      this.unregisterSlotComponents(pluginName);

      // Unregister job handlers
      unregisterPluginHandlers(loadedPlugin.dbId);

      // Cancel pending/running jobs
      await this.cancelPendingJobs(loadedPlugin.dbId, pluginName);

      loadedPlugin.context.logger.info('Plugin disabled');

      // Optionally unload from memory
      if (unloadFromMemory) {
        await this.unloadPlugin(pluginName);
      }

      return true;
    } catch (error) {
      loadedPlugin.context.logger.error('Failed to disable plugin', {
        error: error instanceof Error ? error.message : String(error),
      });
      // Still disable the plugin even if onDisable fails
      loadedPlugin.enabled = false;
      this.unregisterSlotComponents(pluginName);
      unregisterPluginHandlers(loadedPlugin.dbId);
      await this.cancelPendingJobs(loadedPlugin.dbId, pluginName).catch(() => {});

      if (unloadFromMemory) {
        await this.unloadPlugin(pluginName).catch(() => {});
      }

      return true;
    }
  }

  /**
   * Unload a plugin from memory, calling onUnload hook for cleanup
   * @version 1.6.0
   */
  async unloadPlugin(pluginName: string): Promise<boolean> {
    const loadedPlugin = this.plugins.get(pluginName);
    if (!loadedPlugin) {
      return false;
    }

    try {
      // Call onUnload hook if defined - allows plugin to clean up resources
      if (loadedPlugin.plugin.onUnload) {
        await loadedPlugin.plugin.onUnload();
      }
    } catch (error) {
      console.error(`[PluginRegistry] Error in onUnload for ${pluginName}:`, error);
    }

    // Remove from hook index
    if (loadedPlugin.plugin.hooks) {
      for (const hookName of Object.keys(loadedPlugin.plugin.hooks) as HookName[]) {
        this.hookIndex.get(hookName)?.delete(pluginName);
      }
    }

    // Remove from registry to free memory
    this.plugins.delete(pluginName);
    console.log(`[PluginRegistry] Unloaded plugin ${pluginName} from memory`);

    return true;
  }

  /**
   * Prune all disabled plugins from memory
   * Call this periodically in long-running processes to prevent memory leaks
   * @returns Number of plugins pruned
   * @version 1.6.0
   */
  async pruneDisabledPlugins(): Promise<number> {
    let pruned = 0;
    const disabledPluginNames: string[] = [];

    for (const [name, loaded] of this.plugins) {
      if (!loaded.enabled) {
        disabledPluginNames.push(name);
      }
    }

    for (const pluginName of disabledPluginNames) {
      const success = await this.unloadPlugin(pluginName);
      if (success) {
        pruned++;
      }
    }

    if (pruned > 0) {
      console.log(`[PluginRegistry] Pruned ${pruned} disabled plugin(s) from memory`);
    }

    return pruned;
  }

  /**
   * Update plugin config
   * @version 1.11.1 - Now decrypts password fields before storing in context
   */
  updateConfig(pluginName: string, config: Record<string, unknown>): boolean {
    const loadedPlugin = this.plugins.get(pluginName);
    if (!loadedPlugin) {
      return false;
    }

    // Decrypt password fields before storing in context
    // This ensures plugin actions receive decrypted values (e.g., API keys)
    const configSchema = loadedPlugin.plugin.manifest.configSchema as JSONSchema | undefined;
    const passwordFields = getPasswordFields(configSchema);
    const decryptedConfig = decryptConfigFields(config, passwordFields);

    // Update the context's config with decrypted values
    (loadedPlugin.context as { config: Record<string, unknown> }).config = decryptedConfig;
    return true;
  }

  /**
   * Check if registry is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Mark registry as initialized
   */
  setInitialized(value: boolean): void {
    this.initialized = value;
  }

  /**
   * Get plugin count
   */
  count(): number {
    return this.plugins.size;
  }

  // ===========================================================================
  // PRIVATE HELPERS - Job Cleanup
  // ===========================================================================

  /**
   * Cancel all pending/running jobs for a plugin by marking them as failed
   */
  private async cancelPendingJobs(pluginDbId: string, pluginName: string): Promise<void> {
    try {
      const result = await prisma.pluginJob.updateMany({
        where: {
          pluginId: pluginDbId,
          status: { in: ['pending', 'running'] },
        },
        data: {
          status: 'failed',
          result: { error: `Plugin ${pluginName} was disabled` },
          completedAt: new Date(),
        },
      });
      if (result.count > 0) {
        console.log(`[PluginRegistry] Cancelled ${result.count} pending/running jobs for plugin ${pluginName}`);
      }
    } catch (error) {
      console.error(`[PluginRegistry] Failed to cancel pending jobs for ${pluginName}:`, error);
    }
  }

  // ===========================================================================
  // PRIVATE HELPERS - Slot Registration
  // ===========================================================================

  /**
   * Register a plugin's UI components with the slot registry
   */
  private registerSlotComponents(loadedPlugin: LoadedPlugin): void {
    const { plugin } = loadedPlugin;

    // Create a sanitized client-safe context for slot components
    const clientContext = createClientPluginContext(
      loadedPlugin.dbId,
      plugin.manifest.name,
      loadedPlugin.context.config,
      plugin.manifest.configSchema
    );

    const slotRegistry = getSlotRegistry();

    // Register standard UI slot components
    if (plugin.components && plugin.components.length > 0) {
      for (const comp of plugin.components) {
        if (isStaticSlotName(comp.slot)) {
          slotRegistry.register({
            pluginName: plugin.manifest.name,
            pluginId: loadedPlugin.dbId,
            slot: comp.slot as SlotName,
            component: comp.component,
            context: clientContext,
            order: comp.order ?? 100,
          });
        }
      }
    }

    // Register admin pages to the dynamic admin.pages.{pluginName} slot
    if (plugin.adminPages && plugin.adminPages.length > 0) {
      const adminSlotName: DynamicSlotName = `admin.pages.${plugin.manifest.name}`;

      for (const page of plugin.adminPages) {
        slotRegistry.register({
          pluginName: plugin.manifest.name,
          pluginId: loadedPlugin.dbId,
          slot: adminSlotName,
          component: page.component,
          context: clientContext,
          order: 100,
          metadata: {
            path: page.path,
            title: page.title,
          },
        });
      }
    }
  }

  /**
   * Unregister all of a plugin's UI components from the slot registry
   */
  private unregisterSlotComponents(pluginName: string): void {
    const slotRegistry = getSlotRegistry();
    slotRegistry.unregisterPlugin(pluginName);
  }

  /**
   * Clear all plugins (for testing)
   */
  clear(): void {
    this.plugins.clear();
    this.hookIndex.clear();
    this.initialized = false;
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

// Use globalThis to ensure the singleton persists across all modules in Next.js
// This is necessary because Next.js may create separate module instances for
// different parts of the application (API routes, server components, etc.)
const REGISTRY_KEY = '__plugin_registry__';

declare global {
  var __plugin_registry__: PluginRegistry | undefined;
}

/**
 * Get the plugin registry singleton
 */
export function getPluginRegistry(): PluginRegistry {
  if (!globalThis[REGISTRY_KEY]) {
    globalThis[REGISTRY_KEY] = new PluginRegistry();
  }
  return globalThis[REGISTRY_KEY];
}

/**
 * Reset the plugin registry (for testing)
 */
export function resetPluginRegistry(): void {
  if (globalThis[REGISTRY_KEY]) {
    globalThis[REGISTRY_KEY].clear();
  }
  globalThis[REGISTRY_KEY] = undefined;
}
