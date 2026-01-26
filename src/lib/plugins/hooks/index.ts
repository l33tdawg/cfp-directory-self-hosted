/**
 * Hooks Module Index
 * @version 1.1.0
 */

// Types
export type {
  HookPayloads,
  HookHandler,
  PluginHooks,
  HookName,
  HookMetadata,
} from './types';

export {
  HOOK_NAMES,
  HOOK_METADATA,
  getHookMetadata,
  getHooksByCategory,
} from './types';

// Dispatch
export {
  dispatchHook,
  dispatchHookAsync,
  hasHookHandlers,
  getHookHandlerCount,
  dispatchHooksSequentially,
  dispatchHooksParallel,
} from './dispatch';
