/**
 * Plugin Job Locking
 * @version 1.2.0
 *
 * Implements atomic job acquisition and lock management for concurrency safety.
 * Uses PostgreSQL's FOR UPDATE SKIP LOCKED for safe concurrent access.
 */

import { prisma } from '@/lib/db/prisma';
import type { AcquiredJob, PluginJobRecord } from './types';
import { JOB_DEFAULTS } from './types';

// =============================================================================
// WORKER ID GENERATION
// =============================================================================

/**
 * Generate a unique worker instance ID
 */
export function generateWorkerId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `worker-${process.pid}-${timestamp}-${random}`;
}

// =============================================================================
// JOB ACQUISITION
// =============================================================================

/**
 * Atomically acquire a job for processing
 * Uses FOR UPDATE SKIP LOCKED to safely handle concurrent workers
 *
 * @param workerId - Unique worker instance ID
 * @param batchSize - Maximum number of jobs to acquire (default 1)
 * @returns Array of acquired jobs ready for processing
 */
export async function acquireJobs(
  workerId: string,
  batchSize: number = 1
): Promise<AcquiredJob[]> {
  const now = new Date();
  
  // Calculate the threshold for stale locks
  const staleLockThreshold = new Date(
    now.getTime() - JOB_DEFAULTS.STALE_LOCK_THRESHOLD_SECONDS * 1000
  );

  // Use raw query for atomic job acquisition with FOR UPDATE SKIP LOCKED
  // This prevents race conditions between concurrent workers
  const jobs = await prisma.$queryRaw<PluginJobRecord[]>`
    UPDATE plugin_jobs
    SET 
      status = 'running',
      locked_at = ${now},
      locked_by = ${workerId},
      started_at = COALESCE(started_at, ${now}),
      attempts = attempts + 1
    WHERE id IN (
      SELECT id FROM plugin_jobs
      WHERE status = 'pending'
        AND run_at <= ${now}
        AND attempts < max_attempts
        AND (locked_at IS NULL OR locked_at < ${staleLockThreshold})
      ORDER BY priority ASC, run_at ASC
      LIMIT ${batchSize}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING 
      id,
      plugin_id as "pluginId",
      type,
      payload,
      attempts,
      max_attempts as "maxAttempts",
      locked_by as "lockedBy"
  `;

  return jobs.map((job) => ({
    id: job.id,
    pluginId: job.pluginId,
    type: job.type,
    payload: job.payload as Record<string, unknown>,
    attempts: job.attempts,
    maxAttempts: job.maxAttempts,
    lockedBy: job.lockedBy!,
  }));
}

/**
 * Acquire a specific job by ID for processing
 * Used for retrying specific jobs
 *
 * @param jobId - Job ID to acquire
 * @param workerId - Worker instance ID
 * @returns Acquired job or null if not available
 */
export async function acquireJobById(
  jobId: string,
  workerId: string
): Promise<AcquiredJob | null> {
  const now = new Date();
  const staleLockThreshold = new Date(
    now.getTime() - JOB_DEFAULTS.STALE_LOCK_THRESHOLD_SECONDS * 1000
  );

  const jobs = await prisma.$queryRaw<PluginJobRecord[]>`
    UPDATE plugin_jobs
    SET 
      status = 'running',
      locked_at = ${now},
      locked_by = ${workerId},
      started_at = COALESCE(started_at, ${now}),
      attempts = attempts + 1
    WHERE id = ${jobId}
      AND status = 'pending'
      AND attempts < max_attempts
      AND (locked_at IS NULL OR locked_at < ${staleLockThreshold})
    RETURNING 
      id,
      plugin_id as "pluginId",
      type,
      payload,
      attempts,
      max_attempts as "maxAttempts",
      locked_by as "lockedBy"
  `;

  return jobs[0] ? {
    id: jobs[0].id,
    pluginId: jobs[0].pluginId,
    type: jobs[0].type,
    payload: jobs[0].payload as Record<string, unknown>,
    attempts: jobs[0].attempts,
    maxAttempts: jobs[0].maxAttempts,
    lockedBy: jobs[0].lockedBy!,
  } : null;
}

// =============================================================================
// JOB COMPLETION
// =============================================================================

/**
 * Mark a job as completed successfully
 *
 * @param jobId - Job ID
 * @param workerId - Worker ID that processed the job
 * @param result - Job result data
 */
export async function completeJob(
  jobId: string,
  workerId: string,
  result?: Record<string, unknown>
): Promise<void> {
  const now = new Date();

  await prisma.pluginJob.updateMany({
    where: {
      id: jobId,
      lockedBy: workerId,
      status: 'running',
    },
    data: {
      status: 'completed',
      completedAt: now,
      result: result ? JSON.parse(JSON.stringify(result)) : null,
      lockedAt: null,
      lockedBy: null,
    },
  });
}

/**
 * Mark a job as failed
 *
 * @param jobId - Job ID
 * @param workerId - Worker ID that processed the job
 * @param error - Error message
 * @param isFinal - Whether this is the final failure (max attempts reached)
 */
export async function failJob(
  jobId: string,
  workerId: string,
  error: string,
  isFinal: boolean
): Promise<void> {
  const now = new Date();

  await prisma.pluginJob.updateMany({
    where: {
      id: jobId,
      lockedBy: workerId,
      status: 'running',
    },
    data: {
      status: isFinal ? 'failed' : 'pending',
      completedAt: isFinal ? now : null,
      result: { error },
      lockedAt: null,
      lockedBy: null,
      // If not final, schedule retry with exponential backoff
      runAt: isFinal ? undefined : new Date(now.getTime() + calculateBackoff(1)),
    },
  });
}

/**
 * Calculate exponential backoff delay in milliseconds
 * Uses jitter to prevent thundering herd
 *
 * @param attempt - Current attempt number (1-based)
 * @returns Delay in milliseconds
 */
export function calculateBackoff(attempt: number): number {
  // Base delay of 5 seconds, exponential increase up to 5 minutes
  const baseDelay = 5000;
  const maxDelay = 300000; // 5 minutes
  
  // Calculate exponential delay with jitter
  const exponentialDelay = Math.min(
    baseDelay * Math.pow(2, attempt - 1),
    maxDelay
  );
  
  // Add random jitter (±25%)
  const jitter = exponentialDelay * (0.75 + Math.random() * 0.5);
  
  return Math.floor(jitter);
}

// =============================================================================
// LOCK MANAGEMENT
// =============================================================================

/**
 * Release a lock on a job (for cleanup/cancellation)
 *
 * @param jobId - Job ID
 * @param workerId - Worker ID holding the lock
 */
export async function releaseLock(
  jobId: string,
  workerId: string
): Promise<void> {
  await prisma.pluginJob.updateMany({
    where: {
      id: jobId,
      lockedBy: workerId,
    },
    data: {
      status: 'pending',
      lockedAt: null,
      lockedBy: null,
    },
  });
}

/**
 * Recover stale locks that have exceeded the timeout
 * This handles cases where workers crash without releasing locks
 *
 * @returns Number of locks recovered
 */
export async function recoverStaleLocks(): Promise<number> {
  // Find and reset jobs with stale locks
  const result = await prisma.$executeRaw`
    UPDATE plugin_jobs
    SET 
      status = 'pending',
      locked_at = NULL,
      locked_by = NULL
    WHERE status = 'running'
      AND locked_at IS NOT NULL
      AND locked_at < NOW() - (lock_timeout || ' seconds')::interval
      AND attempts < max_attempts
  `;

  return result;
}

/**
 * Get count of jobs with stale locks
 */
export async function getStaleLockCount(): Promise<number> {
  const result = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*) as count
    FROM plugin_jobs
    WHERE status = 'running'
      AND locked_at IS NOT NULL
      AND locked_at < NOW() - (lock_timeout || ' seconds')::interval
  `;

  return Number(result[0].count);
}

/**
 * Extend the lock timeout for a long-running job
 *
 * @param jobId - Job ID
 * @param workerId - Worker ID holding the lock
 */
export async function extendLock(
  jobId: string,
  workerId: string
): Promise<boolean> {
  const result = await prisma.pluginJob.updateMany({
    where: {
      id: jobId,
      lockedBy: workerId,
      status: 'running',
    },
    data: {
      lockedAt: new Date(),
    },
  });

  return result.count > 0;
}

// =============================================================================
// CLEANUP
// =============================================================================

/**
 * Clean up old completed/failed jobs
 *
 * @param olderThanDays - Delete jobs older than this many days
 * @returns Number of jobs deleted
 */
export async function cleanupOldJobs(olderThanDays: number = 30): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  const result = await prisma.pluginJob.deleteMany({
    where: {
      status: {
        in: ['completed', 'failed'],
      },
      completedAt: {
        lt: cutoffDate,
      },
    },
  });

  return result.count;
}
