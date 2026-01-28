/**
 * Plugin Job Queue Implementation
 * @version 1.2.0
 *
 * Provides the JobQueue interface for plugins to enqueue and manage background jobs.
 */

import { prisma } from '@/lib/db/prisma';
import { Prisma } from '@prisma/client';
import type {
  JobQueue,
  JobInfo,
  JobStatus,
  EnqueueJobOptions,
  InternalJobQueue,
} from './types';
import { JOB_DEFAULTS, JobNotFoundError } from './types';

// =============================================================================
// JOB QUEUE IMPLEMENTATION
// =============================================================================

/**
 * Implementation of the JobQueue interface for a specific plugin
 */
export class PluginJobQueue implements InternalJobQueue {
  constructor(
    public readonly pluginId: string,
    public readonly pluginName: string
  ) {}

  /**
   * Enqueue a new job for background processing
   */
  async enqueue(options: EnqueueJobOptions): Promise<string> {
    const {
      type,
      payload,
      runAt = new Date(),
      maxAttempts = JOB_DEFAULTS.MAX_ATTEMPTS,
      priority = JOB_DEFAULTS.DEFAULT_PRIORITY,
      lockTimeout = JOB_DEFAULTS.LOCK_TIMEOUT_SECONDS,
    } = options;

    const job = await prisma.pluginJob.create({
      data: {
        pluginId: this.pluginId,
        type,
        payload: JSON.parse(JSON.stringify(payload)),
        status: 'pending',
        runAt,
        maxAttempts,
        priority,
        lockTimeout,
      },
    });

    return job.id;
  }

  /**
   * Get job information by ID
   */
  async getJob(jobId: string): Promise<JobInfo | null> {
    const job = await prisma.pluginJob.findFirst({
      where: {
        id: jobId,
        pluginId: this.pluginId,
      },
    });

    if (!job) {
      return null;
    }

    return mapJobToInfo(job);
  }

  /**
   * Cancel a pending job
   * @returns true if cancelled, false if job not found or not cancellable
   */
  async cancelJob(jobId: string): Promise<boolean> {
    // Only cancel jobs that are still pending
    const result = await prisma.pluginJob.updateMany({
      where: {
        id: jobId,
        pluginId: this.pluginId,
        status: 'pending',
      },
      data: {
        status: 'failed',
        completedAt: new Date(),
        result: { cancelled: true, error: 'Job cancelled by plugin' },
      },
    });

    return result.count > 0;
  }

  /**
   * Get count of pending jobs for this plugin
   */
  async getPendingCount(): Promise<number> {
    return prisma.pluginJob.count({
      where: {
        pluginId: this.pluginId,
        status: 'pending',
      },
    });
  }

  /**
   * Get jobs by status for this plugin
   */
  async getJobs(status?: JobStatus, limit: number = 50): Promise<JobInfo[]> {
    const jobs = await prisma.pluginJob.findMany({
      where: {
        pluginId: this.pluginId,
        ...(status ? { status } : {}),
      },
      orderBy: [
        { priority: 'asc' },
        { createdAt: 'desc' },
      ],
      take: limit,
    });

    return jobs.map(mapJobToInfo);
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Map database job record to JobInfo interface
 */
function mapJobToInfo(job: {
  id: string;
  type: string;
  status: string;
  payload: unknown;
  result: unknown;
  attempts: number;
  maxAttempts: number;
  priority: number;
  createdAt: Date;
  runAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
}): JobInfo {
  return {
    id: job.id,
    type: job.type,
    status: job.status as JobStatus,
    payload: job.payload as Record<string, unknown>,
    result: job.result as Record<string, unknown> | undefined,
    attempts: job.attempts,
    maxAttempts: job.maxAttempts,
    priority: job.priority,
    createdAt: job.createdAt,
    runAt: job.runAt,
    startedAt: job.startedAt ?? undefined,
    completedAt: job.completedAt ?? undefined,
  };
}

// =============================================================================
// GLOBAL JOB QUERIES
// =============================================================================

/**
 * Get all pending jobs across all plugins
 * Used by the worker to process jobs
 */
export async function getPendingJobsCount(): Promise<number> {
  return prisma.pluginJob.count({
    where: {
      status: 'pending',
      runAt: {
        lte: new Date(),
      },
    },
  });
}

/**
 * Get job statistics
 */
export async function getJobStats(): Promise<{
  pending: number;
  running: number;
  completed: number;
  failed: number;
  total: number;
}> {
  const [pending, running, completed, failed] = await Promise.all([
    prisma.pluginJob.count({ where: { status: 'pending' } }),
    prisma.pluginJob.count({ where: { status: 'running' } }),
    prisma.pluginJob.count({ where: { status: 'completed' } }),
    prisma.pluginJob.count({ where: { status: 'failed' } }),
  ]);

  return {
    pending,
    running,
    completed,
    failed,
    total: pending + running + completed + failed,
  };
}

/**
 * Get a job by ID regardless of plugin
 * Used for admin/debugging
 */
export async function getJobById(jobId: string): Promise<JobInfo | null> {
  const job = await prisma.pluginJob.findUnique({
    where: { id: jobId },
  });

  if (!job) {
    return null;
  }

  return mapJobToInfo(job);
}

/**
 * Retry a failed job
 * Resets the job to pending status with reset attempts
 */
export async function retryJob(jobId: string): Promise<void> {
  const job = await prisma.pluginJob.findUnique({
    where: { id: jobId },
  });

  if (!job) {
    throw new JobNotFoundError(jobId);
  }

  if (job.status !== 'failed') {
    throw new Error(`Cannot retry job with status: ${job.status}`);
  }

  await prisma.pluginJob.update({
    where: { id: jobId },
    data: {
      status: 'pending',
      attempts: 0,
      result: Prisma.DbNull,
      runAt: new Date(),
      startedAt: null,
      completedAt: null,
      lockedAt: null,
      lockedBy: null,
    },
  });
}

/**
 * Get recent jobs for a plugin
 */
export async function getRecentJobs(
  pluginId: string,
  limit: number = 20
): Promise<JobInfo[]> {
  const jobs = await prisma.pluginJob.findMany({
    where: { pluginId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return jobs.map(mapJobToInfo);
}

/**
 * Create a job queue for a plugin
 */
export function createJobQueue(pluginId: string, pluginName: string): JobQueue {
  return new PluginJobQueue(pluginId, pluginName);
}
