/**
 * Plugin Events
 * @version 1.1.0
 *
 * Browser-based event system for plugin state changes.
 * Uses CustomEvent to ensure events work across all components
 * regardless of module bundling/isolation.
 */

const PLUGIN_CHANGE_EVENT = 'cfp:plugin-change';

/**
 * Subscribe to plugin change events.
 * Returns an unsubscribe function.
 */
export function onPluginChange(callback: () => void): () => void {
  if (typeof window === 'undefined') {
    // Server-side: no-op
    return () => {};
  }

  const handler = () => callback();
  window.addEventListener(PLUGIN_CHANGE_EVENT, handler);

  return () => {
    window.removeEventListener(PLUGIN_CHANGE_EVENT, handler);
  };
}

/**
 * Emit a plugin change event to all listeners.
 * Call this after install, uninstall, enable, or disable operations.
 */
export function emitPluginChange(): void {
  if (typeof window === 'undefined') {
    // Server-side: no-op
    return;
  }

  window.dispatchEvent(new CustomEvent(PLUGIN_CHANGE_EVENT));
}
