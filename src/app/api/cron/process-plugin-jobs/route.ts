/**
 * Plugin Job Processing Cron Endpoint
 * @version 1.2.0
 * 
 * This endpoint is called periodically to process background plugin jobs.
 * 
 * Deployment Options:
 * - Vercel Cron: Add to vercel.json (recommended: every 1-5 minutes)
 * - External Cron: Call with CRON_SECRET header
 * - Docker: Use system cron or scheduler
 * 
 * Security:
 * - Protected by CRON_SECRET environment variable
 * - Returns minimal information to prevent info leakage
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { config } from '@/lib/env';
import {
  processJobs,
  processAllPendingJobs,
  getJobStats,
  cleanupOldJobs,
  recoverStaleLocks,
  JOB_DEFAULTS,
} from '@/lib/plugins/jobs';

/**
 * Constant-time string comparison to prevent timing attacks
 */
function secureCompare(a: string, b: string): boolean {
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    // If buffers are different lengths, timingSafeEqual throws
    return false;
  }
}

/**
 * Verify the request is from an authorized cron source
 *
 * SECURITY: Defense-in-depth approach - ALWAYS require CRON_SECRET.
 * The x-vercel-cron header is NOT trusted as sole authentication because:
 * - It can potentially be spoofed by attackers sending requests directly
 * - Vercel does not guarantee this header is stripped from external requests
 * - Defense-in-depth: never rely on a single factor for sensitive operations
 *
 * Authentication requirements:
 * - Always require CRON_SECRET via x-cron-secret header or Bearer token
 * - On Vercel: Log presence of x-vercel-cron for monitoring purposes only
 */
function verifyCronAuth(request: NextRequest): boolean {
  const cronSecret = config.cronSecret;

  // SECURITY: Always require CRON_SECRET, even in development
  if (!cronSecret) {
    console.warn('[Plugin Jobs] CRON_SECRET not configured - cron endpoints are disabled');
    return false;
  }

  // Check for provided secret with constant-time comparison
  const providedSecret = request.headers.get('x-cron-secret') ||
                         request.headers.get('authorization')?.replace('Bearer ', '');

  // SECURITY: Always require the secret, regardless of x-vercel-cron header
  // The Vercel header is logged for monitoring but never trusted as sole auth
  if (process.env.VERCEL === '1') {
    const vercelCronHeader = request.headers.get('x-vercel-cron');
    if (vercelCronHeader === '1') {
      // Log for monitoring - but still require secret verification below
      console.log('[Plugin Jobs] Request includes x-vercel-cron header, verifying CRON_SECRET');
    }
  }

  // Always require the secret for authentication
  if (!providedSecret) {
    return false;
  }

  return secureCompare(providedSecret, cronSecret);
}

/**
 * GET - Read-only status check
 * 
 * Returns the current job queue status without processing any jobs.
 */
export async function GET(request: NextRequest) {
  // Verify authorization
  if (!verifyCronAuth(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  try {
    const stats = await getJobStats();
    
    return NextResponse.json({
      status: 'ok',
      stats,
      message: 'Use POST to process jobs',
    });
    
  } catch (error) {
    console.error('[Plugin Jobs] Error getting stats:', error);
    
    return NextResponse.json(
      { error: 'Failed to get job stats' },
      { status: 500 }
    );
  }
}

/**
 * POST - Process pending plugin jobs
 * 
 * Processes a batch of pending jobs. Supports the following options
 * via query parameters:
 * - batch: Number of jobs to process per batch (default: 10)
 * - catchup: If true, process all pending jobs (default: false)
 * - cleanup: If true, also clean up old completed/failed jobs (default: false)
 * - cleanupDays: Days to keep old jobs (default: 30)
 */
export async function POST(request: NextRequest) {
  // Verify authorization
  if (!verifyCronAuth(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  const startTime = Date.now();
  
  try {
    // Parse options from query params
    const { searchParams } = new URL(request.url);
    const batchSize = parseInt(searchParams.get('batch') || String(JOB_DEFAULTS.BATCH_SIZE), 10);
    const catchup = searchParams.get('catchup') === 'true';
    const cleanup = searchParams.get('cleanup') === 'true';
    const cleanupDays = parseInt(searchParams.get('cleanupDays') || '30', 10);
    
    // Get initial stats
    const statsBefore = await getJobStats();
    
    // Recover any stale locks first
    const recoveredLocks = await recoverStaleLocks();
    if (recoveredLocks > 0) {
      console.log(`[Plugin Jobs] Recovered ${recoveredLocks} stale locks`);
    }
    
    let processed = 0;
    let failed = 0;
    let iterations = 1;
    
    if (catchup) {
      // Process all pending jobs
      const result = await processAllPendingJobs(100, { batchSize });
      processed = result.processed;
      failed = result.failed;
      iterations = result.iterations;
    } else {
      // Process single batch
      const results = await processJobs({ batchSize });
      processed = results.filter(r => r.success).length;
      failed = results.filter(r => !r.success).length;
    }
    
    // Optionally clean up old jobs
    let cleanedUp = 0;
    if (cleanup) {
      cleanedUp = await cleanupOldJobs(cleanupDays);
      if (cleanedUp > 0) {
        console.log(`[Plugin Jobs] Cleaned up ${cleanedUp} old jobs`);
      }
    }
    
    // Get final stats
    const statsAfter = await getJobStats();
    
    const durationMs = Date.now() - startTime;
    
    return NextResponse.json({
      success: true,
      processed,
      failed,
      iterations,
      recoveredLocks,
      cleanedUp: cleanup ? cleanedUp : undefined,
      durationMs,
      stats: {
        before: statsBefore,
        after: statsAfter,
      },
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('[Plugin Jobs] Error processing jobs:', error);
    
    const durationMs = Date.now() - startTime;
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Job processing failed',
        durationMs,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
