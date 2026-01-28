/**
 * Plugin System
 * @version 1.7.0
 *
 * Main entry point for the plugin system.
 * Provides type exports, initialization, hook dispatch, job queue, UI slots,
 * PII decryption utilities, config encryption, data capability, and SDK for plugin development.
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
  EventWithCriteria,
  ReviewCapability,
  ReviewFilters,
  ReviewCreateData,
  StorageCapability,
  EmailCapability,
  EmailRecipient,
  PluginDataCapability,
  
  // Route types
  PluginRoute,
  PluginRouteHandler,
  HttpMethod,
  
  // Component types
  PluginComponent,
  PluginComponentProps,
  ClientPluginContext,
  
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
  syncPluginWithDatabase,
} from './loader';

// =============================================================================
// ARCHIVE EXPORTS (v1.6.0)
// =============================================================================

export type {
  ArchiveType,
  ValidationResult,
  ExtractionResult,
} from './archive';

export {
  detectArchiveType,
  validateArchive,
  extractPlugin,
  pluginExists,
  removePluginFiles,
  MAX_ARCHIVE_SIZE,
  MAX_EXTRACTED_SIZE,
} from './archive';

// =============================================================================
// CONTEXT EXPORTS
// =============================================================================

export {
  createPluginContext,
  createClientPluginContext,
  createV1Context,
} from './context';

export type { CreateContextOptions } from './context';

// =============================================================================
// CONFIG ENCRYPTION EXPORTS (v1.7.0)
// =============================================================================

export {
  getPasswordFields,
  encryptConfigFields,
  decryptConfigFields,
  maskConfigFields,
  PASSWORD_PLACEHOLDER,
} from './config-encryption';

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

// =============================================================================
// PII DECRYPTION EXPORTS (v1.5.1)
// =============================================================================

export type {
  DecryptedUser,
  DecryptedSpeakerProfile,
  DecryptedCoSpeaker,
} from './capabilities/pii';

export {
  decryptUserPii,
  decryptSpeakerProfilePii,
  decryptCoSpeakerPii,
  decryptUsersPii,
  decryptSpeakerProfilesPii,
} from './capabilities/pii';
