/**
 * Internal Job Worker
 * @version 1.13.0
 *
 * Background worker that automatically processes plugin jobs without requiring
 * external cron configuration. Starts automatically when the server boots.
 *
 * Features:
 * - Auto-starts on server initialization
 * - Configurable polling interval (default: 30 seconds)
 * - Graceful shutdown support
 * - Automatic stale lock recovery
 * - Self-healing on errors
 */

import { processJobs, recoverStaleLocks, getJobStats } from './index';

// =============================================================================
// CONFIGURATION
// =============================================================================

/** Default polling interval in milliseconds (30 seconds) */
const DEFAULT_POLL_INTERVAL_MS = 30_000;

/** Minimum polling interval (5 seconds) */
const MIN_POLL_INTERVAL_MS = 5_000;

/** Maximum polling interval (5 minutes) */
const MAX_POLL_INTERVAL_MS = 300_000;

/** How often to recover stale locks (every 5 polling cycles) */
const STALE_LOCK_RECOVERY_FREQUENCY = 5;

/** How often to log stats (every 10 polling cycles) */
const STATS_LOG_FREQUENCY = 10;

// =============================================================================
// WORKER STATE
// =============================================================================

let isRunning = false;
let pollInterval: NodeJS.Timeout | null = null;
let cycleCount = 0;
let totalProcessed = 0;
let totalFailed = 0;
let lastPollTime: Date | null = null;
let startTime: Date | null = null;

/**
 * Worker status information
 */
export interface InternalWorkerStatus {
  running: boolean;
  startedAt: Date | null;
  lastPollAt: Date | null;
  cycleCount: number;
  totalProcessed: number;
  totalFailed: number;
  pollIntervalMs: number;
}

// =============================================================================
// WORKER FUNCTIONS
// =============================================================================

/**
 * Get the configured poll interval from environment
 */
function getPollIntervalMs(): number {
  const envValue = process.env.JOB_WORKER_INTERVAL_SECONDS;
  if (!envValue) {
    return DEFAULT_POLL_INTERVAL_MS;
  }

  const seconds = parseInt(envValue, 10);
  if (isNaN(seconds) || seconds < 1) {
    console.warn('[InternalWorker] Invalid JOB_WORKER_INTERVAL_SECONDS, using default');
    return DEFAULT_POLL_INTERVAL_MS;
  }

  const ms = seconds * 1000;
  return Math.max(MIN_POLL_INTERVAL_MS, Math.min(MAX_POLL_INTERVAL_MS, ms));
}

/**
 * Process pending jobs in a single poll cycle
 */
async function pollAndProcess(): Promise<void> {
  cycleCount++;
  lastPollTime = new Date();

  try {
    // Periodically recover stale locks
    if (cycleCount % STALE_LOCK_RECOVERY_FREQUENCY === 0) {
      const recovered = await recoverStaleLocks();
      if (recovered > 0) {
        console.log(`[InternalWorker] Recovered ${recovered} stale job locks`);
      }
    }

    // Process a batch of pending jobs
    const results = await processJobs({ batchSize: 10 });

    if (results.length > 0) {
      const succeeded = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).length;

      totalProcessed += succeeded;
      totalFailed += failed;

      console.log(
        `[InternalWorker] Processed ${results.length} jobs: ${succeeded} succeeded, ${failed} failed`
      );
    }

    // Periodically log stats
    if (cycleCount % STATS_LOG_FREQUENCY === 0) {
      const stats = await getJobStats();
      console.log('[InternalWorker] Stats:', {
        pending: stats.pending,
        running: stats.running,
        completed: stats.completed,
        failed: stats.failed,
        totalProcessed,
        totalFailed,
        cycles: cycleCount,
      });
    }
  } catch (error) {
    console.error('[InternalWorker] Error during poll cycle:', error);
    // Worker continues running - self-healing on errors
  }
}

/**
 * Start the internal job worker
 *
 * Automatically begins polling for pending jobs at the configured interval.
 * Safe to call multiple times - will only start if not already running.
 */
export function startInternalWorker(): void {
  if (isRunning) {
    console.log('[InternalWorker] Already running, skipping start');
    return;
  }

  // Don't start in test environment
  if (process.env.NODE_ENV === 'test') {
    console.log('[InternalWorker] Skipping start in test environment');
    return;
  }

  const intervalMs = getPollIntervalMs();
  isRunning = true;
  startTime = new Date();
  cycleCount = 0;
  totalProcessed = 0;
  totalFailed = 0;

  console.log(
    `[InternalWorker] Starting background job worker (polling every ${intervalMs / 1000}s)`
  );

  // Run immediately on start to process any pending jobs
  pollAndProcess().catch((err) => {
    console.error('[InternalWorker] Error on initial poll:', err);
  });

  // Then poll at the configured interval
  pollInterval = setInterval(() => {
    pollAndProcess().catch((err) => {
      console.error('[InternalWorker] Error during scheduled poll:', err);
    });
  }, intervalMs);

  // Ensure the interval doesn't prevent Node from exiting
  if (pollInterval.unref) {
    pollInterval.unref();
  }
}

/**
 * Stop the internal job worker
 *
 * Stops polling for new jobs. Any currently running jobs will complete.
 */
export function stopInternalWorker(): void {
  if (!isRunning) {
    console.log('[InternalWorker] Not running, skipping stop');
    return;
  }

  console.log('[InternalWorker] Stopping background job worker', {
    uptime: startTime ? `${Math.round((Date.now() - startTime.getTime()) / 1000)}s` : 'unknown',
    cycles: cycleCount,
    totalProcessed,
    totalFailed,
  });

  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }

  isRunning = false;
}

/**
 * Get the current status of the internal worker
 */
export function getInternalWorkerStatus(): InternalWorkerStatus {
  return {
    running: isRunning,
    startedAt: startTime,
    lastPollAt: lastPollTime,
    cycleCount,
    totalProcessed,
    totalFailed,
    pollIntervalMs: getPollIntervalMs(),
  };
}

/**
 * Check if the internal worker is running
 */
export function isInternalWorkerRunning(): boolean {
  return isRunning;
}

// =============================================================================
// GRACEFUL SHUTDOWN
// =============================================================================

// Handle graceful shutdown signals
if (typeof process !== 'undefined') {
  const handleShutdown = (signal: string) => {
    console.log(`[InternalWorker] Received ${signal}, shutting down...`);
    stopInternalWorker();
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
}
