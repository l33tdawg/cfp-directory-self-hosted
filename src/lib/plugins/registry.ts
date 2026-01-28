/**
 * Plugin Registry
 * @version 1.5.0
 *
 * Singleton that manages all loaded plugin instances.
 * Integrates with the slot registry for UI component management.
 */

import type { Plugin, LoadedPlugin, PluginPermission, JSONSchema } from './types';
import type { HookName } from './hooks/types';
import { createPluginContext, createClientPluginContext } from './context';
import { getSlotRegistry } from './slots/registry';
import { isStaticSlotName } from './slots/types';
import type { SlotName, DynamicSlotName } from './slots/types';
import { unregisterPluginHandlers } from './jobs/worker';
import { prisma } from '@/lib/db/prisma';

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
   */
  async disable(pluginName: string): Promise<boolean> {
    const loadedPlugin = this.plugins.get(pluginName);
    if (!loadedPlugin) {
      return false;
    }
    
    if (!loadedPlugin.enabled) {
      return true; // Already disabled
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
      return true;
    }
  }

  /**
   * Update plugin config
   */
  updateConfig(pluginName: string, config: Record<string, unknown>): boolean {
    const loadedPlugin = this.plugins.get(pluginName);
    if (!loadedPlugin) {
      return false;
    }
    
    // Update the context's config
    (loadedPlugin.context as { config: Record<string, unknown> }).config = config;
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

let registryInstance: PluginRegistry | null = null;

/**
 * Get the plugin registry singleton
 */
export function getPluginRegistry(): PluginRegistry {
  if (!registryInstance) {
    registryInstance = new PluginRegistry();
  }
  return registryInstance;
}

/**
 * Reset the plugin registry (for testing)
 */
export function resetPluginRegistry(): void {
  if (registryInstance) {
    registryInstance.clear();
  }
  registryInstance = null;
}
