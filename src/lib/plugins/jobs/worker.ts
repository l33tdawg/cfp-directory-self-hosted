/**
 * Plugin Job Worker
 * @version 1.2.0
 *
 * Background worker that processes queued plugin jobs.
 * Designed to be called from a cron endpoint or run as a background process.
 */

import { getPluginRegistry } from '../registry';
import type {
  WorkerInfo,
  WorkerOptions,
  ProcessingResult,
  AcquiredJob,
  JobHandler,
} from './types';
import { JOB_DEFAULTS, JobHandlerNotFoundError } from './types';
import {
  generateWorkerId,
  acquireJobs,
  completeJob,
  failJob,
  recoverStaleLocks,
  extendLock,
} from './locking';

// =============================================================================
// WORKER STATE
// =============================================================================

let workerInfo: WorkerInfo | null = null;

/**
 * Get the current worker info
 */
export function getWorkerInfo(): WorkerInfo | null {
  return workerInfo;
}

// =============================================================================
// JOB HANDLER REGISTRY
// =============================================================================

/**
 * Map of plugin ID -> job type -> handler
 */
const jobHandlers = new Map<string, Map<string, JobHandler>>();

/**
 * Register a job handler for a plugin
 */
export function registerJobHandler(
  pluginId: string,
  jobType: string,
  handler: JobHandler
): void {
  if (!jobHandlers.has(pluginId)) {
    jobHandlers.set(pluginId, new Map());
  }
  jobHandlers.get(pluginId)!.set(jobType, handler);
}

/**
 * Unregister all handlers for a plugin
 */
export function unregisterPluginHandlers(pluginId: string): void {
  jobHandlers.delete(pluginId);
}

/**
 * Get a handler for a specific job
 */
function getJobHandler(pluginId: string, jobType: string): JobHandler | null {
  return jobHandlers.get(pluginId)?.get(jobType) ?? null;
}

/**
 * Check if a handler exists for a job type
 */
export function hasJobHandler(pluginId: string, jobType: string): boolean {
  return jobHandlers.get(pluginId)?.has(jobType) ?? false;
}

// =============================================================================
// JOB PROCESSING
// =============================================================================

/**
 * Process a single acquired job
 */
async function processJob(
  job: AcquiredJob,
  workerId: string
): Promise<ProcessingResult> {
  const startTime = Date.now();
  const registry = getPluginRegistry();
  const loadedPlugin = registry.getAll().find(p => p.dbId === job.pluginId);
  
  // Log job start
  if (loadedPlugin) {
    loadedPlugin.context.logger.info(`Processing job: ${job.type}`, {
      jobId: job.id,
      attempt: job.attempts,
      maxAttempts: job.maxAttempts,
    });
  }

  try {
    // Get the job handler
    const handler = getJobHandler(job.pluginId, job.type);
    
    if (!handler) {
      throw new JobHandlerNotFoundError(job.pluginId, job.type);
    }

    // Execute the handler
    const result = await handler(job.payload);

    if (result.success) {
      // Mark job as completed
      await completeJob(job.id, workerId, result.data);
      
      if (loadedPlugin) {
        loadedPlugin.context.logger.info(`Job completed: ${job.type}`, {
          jobId: job.id,
          durationMs: Date.now() - startTime,
        });
      }

      return {
        jobId: job.id,
        pluginId: job.pluginId,
        type: job.type,
        success: true,
        durationMs: Date.now() - startTime,
        attempts: job.attempts,
      };
    } else {
      // Handler returned failure
      const isFinal = job.attempts >= job.maxAttempts;
      await failJob(job.id, workerId, result.error || 'Unknown error', isFinal);
      
      if (loadedPlugin) {
        loadedPlugin.context.logger.warn(
          `Job ${isFinal ? 'failed permanently' : 'failed, will retry'}: ${job.type}`,
          {
            jobId: job.id,
            error: result.error,
            attempts: job.attempts,
            maxAttempts: job.maxAttempts,
          }
        );
      }

      return {
        jobId: job.id,
        pluginId: job.pluginId,
        type: job.type,
        success: false,
        durationMs: Date.now() - startTime,
        attempts: job.attempts,
        error: result.error,
      };
    }
  } catch (error) {
    // Unexpected error during processing
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isFinal = job.attempts >= job.maxAttempts;
    
    await failJob(job.id, workerId, errorMessage, isFinal);
    
    if (loadedPlugin) {
      loadedPlugin.context.logger.error(
        `Job error ${isFinal ? '(final)' : '(will retry)'}: ${job.type}`,
        {
          jobId: job.id,
          error: errorMessage,
          attempts: job.attempts,
          maxAttempts: job.maxAttempts,
        }
      );
    }

    return {
      jobId: job.id,
      pluginId: job.pluginId,
      type: job.type,
      success: false,
      durationMs: Date.now() - startTime,
      attempts: job.attempts,
      error: errorMessage,
    };
  }
}

// =============================================================================
// WORKER MAIN LOOP
// =============================================================================

/**
 * Process a batch of jobs
 * This is the main entry point for the cron endpoint
 *
 * @param options - Worker options
 * @returns Array of processing results
 */
export async function processJobs(
  options: WorkerOptions = {}
): Promise<ProcessingResult[]> {
  const {
    batchSize = JOB_DEFAULTS.BATCH_SIZE,
    recoverStaleLocks: shouldRecoverLocks = true,
  } = options;

  // Initialize worker info if not already
  const workerId = workerInfo?.id ?? generateWorkerId();
  if (!workerInfo) {
    workerInfo = {
      id: workerId,
      pid: process.pid,
      startedAt: new Date(),
      jobsProcessed: 0,
      jobsFailed: 0,
    };
  }

  // Optionally recover stale locks first
  if (shouldRecoverLocks) {
    const recovered = await recoverStaleLocks();
    if (recovered > 0) {
      console.log(`[JobWorker] Recovered ${recovered} stale locks`);
    }
  }

  // Acquire jobs
  const jobs = await acquireJobs(workerId, batchSize);
  
  if (jobs.length === 0) {
    return [];
  }

  console.log(`[JobWorker] Processing ${jobs.length} jobs`);

  // Process jobs sequentially (can be made concurrent with maxConcurrent option)
  const results: ProcessingResult[] = [];
  
  for (const job of jobs) {
    const result = await processJob(job, workerId);
    results.push(result);
    
    // Update worker stats
    if (result.success) {
      workerInfo.jobsProcessed++;
    } else {
      workerInfo.jobsFailed++;
    }
  }

  return results;
}

/**
 * Process jobs until none are left or max iterations reached
 * Useful for catching up on a backlog
 *
 * @param maxIterations - Maximum number of batch iterations
 * @param options - Worker options
 * @returns Total jobs processed
 */
export async function processAllPendingJobs(
  maxIterations: number = 100,
  options: WorkerOptions = {}
): Promise<{ processed: number; failed: number; iterations: number }> {
  let processed = 0;
  let failed = 0;
  let iterations = 0;

  for (let i = 0; i < maxIterations; i++) {
    const results = await processJobs(options);
    iterations++;
    
    if (results.length === 0) {
      break;
    }
    
    for (const result of results) {
      if (result.success) {
        processed++;
      } else {
        failed++;
      }
    }
  }

  return { processed, failed, iterations };
}

// =============================================================================
// LONG-RUNNING JOB SUPPORT
// =============================================================================

/**
 * Create a lock extender for long-running jobs
 * Call this periodically in long-running job handlers to prevent lock timeout
 *
 * @param jobId - Job ID
 * @param workerId - Worker ID
 * @param intervalMs - How often to extend the lock (default: 60s)
 * @returns Function to stop the extender
 */
export function createLockExtender(
  jobId: string,
  workerId: string,
  intervalMs: number = 60000
): () => void {
  const interval = setInterval(async () => {
    try {
      const extended = await extendLock(jobId, workerId);
      if (!extended) {
        console.warn(`[JobWorker] Failed to extend lock for job ${jobId}`);
      }
    } catch (error) {
      console.error(`[JobWorker] Error extending lock for job ${jobId}:`, error);
    }
  }, intervalMs);

  return () => clearInterval(interval);
}

// =============================================================================
// WORKER CLEANUP
// =============================================================================

/**
 * Reset worker state (for testing)
 */
export function resetWorker(): void {
  workerInfo = null;
  jobHandlers.clear();
}

/**
 * Get job handler stats
 */
export function getHandlerStats(): { plugins: number; totalHandlers: number } {
  let totalHandlers = 0;
  for (const handlers of jobHandlers.values()) {
    totalHandlers += handlers.size;
  }
  
  return {
    plugins: jobHandlers.size,
    totalHandlers,
  };
}
