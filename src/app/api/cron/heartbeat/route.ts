/**
 * Scheduled Heartbeat Cron Job
 * 
 * This endpoint is called periodically (e.g., every hour) to:
 * 1. Send a heartbeat to cfp.directory
 * 2. Update local federation status
 * 3. Process any warnings from the license server
 * 
 * Deployment Options:
 * - Vercel Cron: Add to vercel.json
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
import { prisma } from '@/lib/db/prisma';
import { performHeartbeat, getFederationState } from '@/lib/federation';

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

// Verify the request is from an authorized cron source
function verifyCronAuth(request: NextRequest): boolean {
  const cronSecret = config.cronSecret;
  
  // SECURITY: Always require CRON_SECRET, even in development
  if (!cronSecret) {
    console.warn('[Cron Auth] CRON_SECRET not configured - cron endpoints are disabled');
    return false;
  }
  
  // Only trust Vercel cron header when actually deployed on Vercel
  // The x-vercel-cron header is automatically added by Vercel and cannot be spoofed
  // in their infrastructure, but can be spoofed on non-Vercel deployments
  if (process.env.VERCEL === '1') {
    const vercelCronHeader = request.headers.get('x-vercel-cron');
    if (vercelCronHeader === '1') {
      return true;
    }
  }
  
  // Check for manual cron secret with constant-time comparison
  const providedSecret = request.headers.get('x-cron-secret') || 
                         request.headers.get('authorization')?.replace('Bearer ', '');
  
  if (!providedSecret) {
    return false;
  }
  
  return secureCompare(providedSecret, cronSecret);
}

/**
 * GET - Read-only status check
 * 
 * SECURITY: GET should be idempotent and not perform state changes.
 * This endpoint only returns the current federation status without
 * performing a heartbeat or updating the database.
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
    // Check if federation is configured (read-only)
    const state = await getFederationState();
    
    // Get last heartbeat info from database (read-only)
    const settings = await prisma.siteSettings.findUnique({
      where: { id: 'default' },
      select: {
        federationLastHeartbeat: true,
        federationWarnings: true,
      },
    });
    
    return NextResponse.json({
      configured: state.isConfigured,
      enabled: state.isEnabled,
      lastHeartbeat: settings?.federationLastHeartbeat?.toISOString() || null,
      warningsCount: Array.isArray(settings?.federationWarnings) 
        ? settings.federationWarnings.length 
        : 0,
      message: 'Use POST to perform heartbeat with state changes',
    });
    
  } catch (error) {
    console.error('[Heartbeat] Error:', error);
    
    return NextResponse.json(
      { error: 'Failed to get status' },
      { status: 500 }
    );
  }
}

/**
 * POST - Perform heartbeat with state changes
 * 
 * This endpoint performs the actual heartbeat to cfp.directory
 * and updates the database with the result. Only POST should
 * be used for state-changing operations.
 */
export async function POST(request: NextRequest) {
  // Verify authorization
  if (!verifyCronAuth(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  try {
    // Check if federation is configured
    const state = await getFederationState();
    
    if (!state.isConfigured) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: 'Federation not configured',
      });
    }
    
    if (!state.isEnabled) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: 'Federation not enabled',
      });
    }
    
    // Perform heartbeat (state-changing operation)
    const result = await performHeartbeat();
    
    // Update last heartbeat timestamp in database (state-changing operation)
    if (result.success) {
      await prisma.siteSettings.update({
        where: { id: 'default' },
        data: {
          federationLastHeartbeat: new Date(),
          federationWarnings: result.warnings ? JSON.parse(JSON.stringify(result.warnings)) : [],
        },
      });
    }
    
    // Log any warnings
    if (result.warnings && result.warnings.length > 0) {
      console.log('[Heartbeat] Warnings:', result.warnings);
    }
    
    return NextResponse.json({
      success: result.success,
      timestamp: new Date().toISOString(),
      warnings: result.warnings?.length || 0,
      updateAvailable: result.updateAvailable || false,
    });
    
  } catch (error) {
    console.error('[Heartbeat] Error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Heartbeat failed',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
