/**
 * Plugin System
 * @version 1.4.0
 *
 * Main entry point for the plugin system.
 * Provides type exports, initialization, hook dispatch, job queue, and UI slots.
 */

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type {
  // Core types
  Plugin,
  PluginManifest,
  PluginContext,
  PluginLogger,
  PluginPermission,
  LoadedPlugin,
  PluginLoadResult,
  PluginSource,
  PluginRecord,
  
  // Capability types
  SubmissionCapability,
  SubmissionFilters,
  UserCapability,
  UserFilters,
  EventCapability,
  EventFilters,
  ReviewCapability,
  ReviewFilters,
  ReviewCreateData,
  StorageCapability,
  EmailCapability,
  EmailRecipient,
  
  // Route types
  PluginRoute,
  PluginRouteHandler,
  HttpMethod,
  
  // Component types
  PluginComponent,
  PluginComponentProps,
  
  // Schema types
  JSONSchema,
  JSONSchemaProperty,
} from './types';

// JobQueue re-exported from types.ts (which imports from jobs/types.ts)
export type { JobQueue } from './types';

export {
  // Error classes
  PluginPermissionError,
  PluginNotFoundError,
  PluginVersionError,
  
  // Permission metadata
  PERMISSION_DESCRIPTIONS,
} from './types';

// =============================================================================
// HOOK EXPORTS
// =============================================================================

export type {
  HookPayloads,
  HookHandler,
  PluginHooks,
  HookName,
  HookMetadata,
} from './hooks';

export {
  // Hook metadata
  HOOK_NAMES,
  HOOK_METADATA,
  getHookMetadata,
  getHooksByCategory,
  
  // Hook dispatch
  dispatchHook,
  dispatchHookAsync,
  hasHookHandlers,
  getHookHandlerCount,
  dispatchHooksSequentially,
  dispatchHooksParallel,
} from './hooks';

// =============================================================================
// VERSION EXPORTS
// =============================================================================

export {
  CURRENT_API_VERSION,
  SUPPORTED_VERSIONS,
  isVersionSupported,
  areVersionsCompatible,
  getVersionInfo,
  VERSION_CHANGELOG,
  UPCOMING_FEATURES,
} from './version';

// =============================================================================
// REGISTRY EXPORTS
// =============================================================================

export {
  getPluginRegistry,
  resetPluginRegistry,
} from './registry';

// =============================================================================
// LOADER EXPORTS
// =============================================================================

export {
  PLUGINS_DIR,
  initializePlugins,
  reloadPlugin,
  getPluginList,
  enablePlugin,
  disablePlugin,
  updatePluginConfig,
  scanPluginsDirectory,
} from './loader';

// =============================================================================
// CONTEXT EXPORTS
// =============================================================================

export {
  createPluginContext,
  createV1Context,
} from './context';

export type { CreateContextOptions } from './context';

// =============================================================================
// JOB QUEUE EXPORTS (v1.2.0)
// =============================================================================

export type {
  // Job types
  JobStatus,
  EnqueueJobOptions,
  JobInfo,
  JobResult,
  JobHandler,
  JobHandlerMap,
  InternalJobQueue,
  AcquiredJob,
  PluginJobRecord,
  WorkerInfo,
  WorkerOptions,
  ProcessingResult,
} from './jobs';

export {
  // Constants
  JOB_STATUSES,
  JOB_DEFAULTS,
  
  // Error classes
  JobNotFoundError,
  JobAlreadyCompletedError,
  JobHandlerNotFoundError,
  
  // Queue
  PluginJobQueue,
  createJobQueue,
  getPendingJobsCount,
  getJobStats,
  getJobById,
  retryJob,
  getRecentJobs,
  
  // Locking
  generateWorkerId,
  acquireJobs,
  acquireJobById,
  completeJob,
  failJob,
  releaseLock,
  recoverStaleLocks,
  getStaleLockCount,
  extendLock,
  calculateBackoff,
  cleanupOldJobs,
  
  // Worker
  getWorkerInfo,
  registerJobHandler,
  unregisterPluginHandlers,
  hasJobHandler,
  processJobs,
  processAllPendingJobs,
  createLockExtender,
  resetWorker,
  getHandlerStats,
} from './jobs';

// =============================================================================
// UI SLOT EXPORTS (v1.4.0)
// =============================================================================

export type {
  SlotName,
  SlotDefinition,
  SlotRegistration,
  SlotComponentProps,
} from './slots';

export {
  SLOT_NAMES,
  SLOT_DEFINITIONS,
  isValidSlotName,
  getSlotDefinition,
  getSlotRegistry,
  resetSlotRegistry,
} from './slots';
