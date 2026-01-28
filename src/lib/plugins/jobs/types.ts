/**
 * Plugin Job Queue Type Definitions
 * @version 1.2.0
 *
 * Types for the background job queue system.
 */

// =============================================================================
// JOB STATUS
// =============================================================================

/**
 * Job execution status
 */
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed';

/**
 * All possible job statuses
 */
export const JOB_STATUSES: readonly JobStatus[] = [
  'pending',
  'running',
  'completed',
  'failed',
] as const;

// =============================================================================
// JOB CONFIGURATION
// =============================================================================

/**
 * Default configuration for the job queue
 */
export const JOB_DEFAULTS = {
  /** Default maximum retry attempts */
  MAX_ATTEMPTS: 3,
  /** Default lock timeout in seconds */
  LOCK_TIMEOUT_SECONDS: 300,
  /** Default job priority (lower = higher priority) */
  DEFAULT_PRIORITY: 100,
  /** Batch size for processing jobs */
  BATCH_SIZE: 10,
  /** How long to wait before considering a lock stale (in seconds) */
  STALE_LOCK_THRESHOLD_SECONDS: 600,
} as const;

// =============================================================================
// JOB TYPES
// =============================================================================

/**
 * Options for enqueueing a job
 */
export interface EnqueueJobOptions {
  /** Job type identifier (plugin-defined) */
  type: string;
  /** Job payload data */
  payload: Record<string, unknown>;
  /** When to run the job (defaults to now) */
  runAt?: Date;
  /** Maximum retry attempts (defaults to 3) */
  maxAttempts?: number;
  /** Priority (lower = higher priority, defaults to 100) */
  priority?: number;
  /** Lock timeout in seconds (defaults to 300) */
  lockTimeout?: number;
}

/**
 * Job information returned to plugins
 */
export interface JobInfo {
  id: string;
  type: string;
  status: JobStatus;
  payload: Record<string, unknown>;
  result?: Record<string, unknown>;
  attempts: number;
  maxAttempts: number;
  priority: number;
  createdAt: Date;
  runAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

/**
 * Job record from database
 */
export interface PluginJobRecord {
  id: string;
  pluginId: string;
  type: string;
  payload: unknown;
  status: string;
  result: unknown | null;
  attempts: number;
  maxAttempts: number;
  runAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  lockedAt: Date | null;
  lockedBy: string | null;
  lockTimeout: number;
  priority: number;
  createdAt: Date;
}

/**
 * Job execution result
 */
export interface JobResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

/**
 * Job handler function signature
 */
export type JobHandler = (
  payload: Record<string, unknown>
) => Promise<JobResult>;

/**
 * Map of job type to handler
 */
export type JobHandlerMap = Map<string, JobHandler>;

// =============================================================================
// WORKER TYPES
// =============================================================================

/**
 * Worker instance identification
 */
export interface WorkerInfo {
  /** Unique worker instance ID */
  id: string;
  /** Process ID */
  pid: number;
  /** When the worker started */
  startedAt: Date;
  /** Number of jobs processed */
  jobsProcessed: number;
  /** Number of jobs failed */
  jobsFailed: number;
}

/**
 * Worker configuration options
 */
export interface WorkerOptions {
  /** Batch size for fetching jobs */
  batchSize?: number;
  /** Polling interval in milliseconds */
  pollIntervalMs?: number;
  /** Maximum concurrent jobs */
  maxConcurrent?: number;
  /** Whether to recover stale locks on start */
  recoverStaleLocks?: boolean;
}

/**
 * Job processing result from worker
 */
export interface ProcessingResult {
  jobId: string;
  pluginId: string;
  type: string;
  success: boolean;
  durationMs: number;
  attempts: number;
  error?: string;
}

// =============================================================================
// JOB QUEUE INTERFACE
// =============================================================================

/**
 * Job queue interface provided to plugins
 */
export interface JobQueue {
  /**
   * Enqueue a new job
   * @returns Job ID
   */
  enqueue(options: EnqueueJobOptions): Promise<string>;

  /**
   * Get job information by ID
   */
  getJob(jobId: string): Promise<JobInfo | null>;

  /**
   * Cancel a pending job
   * @returns true if cancelled, false if job not found or already running
   */
  cancelJob(jobId: string): Promise<boolean>;

  /**
   * Get pending jobs count for this plugin
   */
  getPendingCount(): Promise<number>;

  /**
   * Get jobs by status for this plugin
   */
  getJobs(status?: JobStatus, limit?: number): Promise<JobInfo[]>;
}

// =============================================================================
// INTERNAL TYPES
// =============================================================================

/**
 * Internal job queue with additional methods for the worker
 */
export interface InternalJobQueue extends JobQueue {
  /** Plugin ID this queue belongs to */
  pluginId: string;
  
  /** Plugin name for logging */
  pluginName: string;
}

/**
 * Acquired job ready for processing
 */
export interface AcquiredJob {
  id: string;
  pluginId: string;
  type: string;
  payload: Record<string, unknown>;
  attempts: number;
  maxAttempts: number;
  lockedBy: string;
}

// =============================================================================
// ERROR TYPES
// =============================================================================

/**
 * Job not found error
 */
export class JobNotFoundError extends Error {
  constructor(public jobId: string) {
    super(`Job not found: ${jobId}`);
    this.name = 'JobNotFoundError';
  }
}

/**
 * Job already completed error
 */
export class JobAlreadyCompletedError extends Error {
  constructor(public jobId: string) {
    super(`Job already completed: ${jobId}`);
    this.name = 'JobAlreadyCompletedError';
  }
}

/**
 * Job handler not found error
 */
export class JobHandlerNotFoundError extends Error {
  constructor(public pluginId: string, public jobType: string) {
    super(`No handler found for job type '${jobType}' in plugin '${pluginId}'`);
    this.name = 'JobHandlerNotFoundError';
  }
}
