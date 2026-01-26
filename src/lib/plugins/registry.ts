/**
 * Plugin Registry
 * @version 1.1.0
 *
 * Singleton that manages all loaded plugin instances.
 */

import type { Plugin, LoadedPlugin, PluginPermission } from './types';
import type { HookName } from './hooks/types';
import { createPluginContext } from './context';

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
    enabled: boolean
  ): LoadedPlugin {
    const pluginName = plugin.manifest.name;
    
    // Create context for this plugin
    const context = createPluginContext({
      pluginId: dbId,
      pluginName,
      config,
      permissions,
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
      loadedPlugin.context.logger.info('Plugin disabled');
      return true;
    } catch (error) {
      loadedPlugin.context.logger.error('Failed to disable plugin', {
        error: error instanceof Error ? error.message : String(error),
      });
      // Still disable the plugin even if onDisable fails
      loadedPlugin.enabled = false;
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
