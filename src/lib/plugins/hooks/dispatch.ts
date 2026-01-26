/**
 * Hook Dispatch System
 * @version 1.1.0
 *
 * Type-safe hook dispatch that calls all registered plugin handlers.
 */

import type { HookPayloads, HookName, HookHandler } from './types';
import { getPluginRegistry } from '../registry';

/**
 * Dispatch a hook to all enabled plugins that handle it
 *
 * @param hookName - The hook to dispatch
 * @param payload - The hook payload
 * @returns The potentially modified payload
 *
 * @example
 * ```typescript
 * // Dispatch submission.created hook
 * await dispatchHook('submission.created', {
 *   submission,
 *   speaker: { id: user.id, email: user.email, name: user.name },
 *   event: { id: event.id, name: event.name, slug: event.slug },
 * });
 * ```
 */
export async function dispatchHook<K extends HookName>(
  hookName: K,
  payload: HookPayloads[K]
): Promise<HookPayloads[K]> {
  const registry = getPluginRegistry();
  let currentPayload = { ...payload };
  
  // Get all enabled plugins that have this hook registered
  const plugins = registry.getPluginsWithHook(hookName);
  
  for (const loadedPlugin of plugins) {
    const handler = loadedPlugin.plugin.hooks?.[hookName] as HookHandler<K> | undefined;
    
    if (!handler) {
      continue;
    }
    
    try {
      const result = await handler(loadedPlugin.context, currentPayload);
      
      // If handler returns a partial payload, merge it
      if (result && typeof result === 'object') {
        currentPayload = { ...currentPayload, ...result };
      }
    } catch (error) {
      // Log error but don't fail the entire dispatch
      loadedPlugin.context.logger.error(
        `Hook ${hookName} failed`,
        {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        }
      );
    }
  }
  
  return currentPayload;
}

/**
 * Dispatch a hook without waiting for results
 * Use this for fire-and-forget hooks where you don't need the modified payload
 */
export function dispatchHookAsync<K extends HookName>(
  hookName: K,
  payload: HookPayloads[K]
): void {
  // Run in background, don't await
  dispatchHook(hookName, payload).catch((error) => {
    console.error(`[PluginSystem] Async hook dispatch failed for ${hookName}:`, error);
  });
}

/**
 * Check if any plugin handles a specific hook
 */
export function hasHookHandlers(hookName: HookName): boolean {
  const registry = getPluginRegistry();
  return registry.getPluginsWithHook(hookName).length > 0;
}

/**
 * Get the count of plugins handling a specific hook
 */
export function getHookHandlerCount(hookName: HookName): number {
  const registry = getPluginRegistry();
  return registry.getPluginsWithHook(hookName).length;
}

/**
 * Dispatch multiple hooks in sequence
 * Useful when one event triggers multiple hooks
 */
export async function dispatchHooksSequentially<K extends HookName>(
  hooks: Array<{ name: K; payload: HookPayloads[K] }>
): Promise<void> {
  for (const hook of hooks) {
    await dispatchHook(hook.name, hook.payload);
  }
}

/**
 * Dispatch multiple independent hooks in parallel
 * Only use when hooks don't depend on each other's results
 */
export async function dispatchHooksParallel<K extends HookName>(
  hooks: Array<{ name: K; payload: HookPayloads[K] }>
): Promise<void> {
  await Promise.all(
    hooks.map(hook => dispatchHook(hook.name, hook.payload))
  );
}
