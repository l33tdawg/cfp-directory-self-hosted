/**
 * Plugin Job Queue System
 * @version 1.2.0
 *
 * Main export file for the background job queue system.
 */

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type {
  JobStatus,
  EnqueueJobOptions,
  JobInfo,
  JobResult,
  JobHandler,
  JobHandlerMap,
  JobQueue,
  InternalJobQueue,
  AcquiredJob,
  PluginJobRecord,
  WorkerInfo,
  WorkerOptions,
  ProcessingResult,
} from './types';

export {
  // Constants
  JOB_STATUSES,
  JOB_DEFAULTS,
  
  // Error classes
  JobNotFoundError,
  JobAlreadyCompletedError,
  JobHandlerNotFoundError,
} from './types';

// =============================================================================
// QUEUE EXPORTS
// =============================================================================

export {
  // Queue implementation
  PluginJobQueue,
  createJobQueue,
  
  // Global queries
  getPendingJobsCount,
  getJobStats,
  getJobById,
  retryJob,
  getRecentJobs,
} from './queue';

// =============================================================================
// LOCKING EXPORTS
// =============================================================================

export {
  // Worker ID
  generateWorkerId,
  
  // Job acquisition
  acquireJobs,
  acquireJobById,
  
  // Job completion
  completeJob,
  failJob,
  
  // Lock management
  releaseLock,
  recoverStaleLocks,
  getStaleLockCount,
  extendLock,
  
  // Backoff calculation
  calculateBackoff,
  
  // Cleanup
  cleanupOldJobs,
} from './locking';

// =============================================================================
// WORKER EXPORTS
// =============================================================================

export {
  // Worker info
  getWorkerInfo,
  
  // Job handler registry
  registerJobHandler,
  unregisterPluginHandlers,
  hasJobHandler,
  
  // Job processing
  processJobs,
  processAllPendingJobs,
  
  // Long-running job support
  createLockExtender,
  
  // Worker management
  resetWorker,
  getHandlerStats,
} from './worker';
