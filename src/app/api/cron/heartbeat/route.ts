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
import { config } from '@/lib/env';
import { prisma } from '@/lib/db/prisma';
import { performHeartbeat, getFederationState } from '@/lib/federation';

// Verify the request is from an authorized cron source
function verifyCronAuth(request: NextRequest): boolean {
  const cronSecret = config.cronSecret;
  
  // If no secret configured, allow in development only
  if (!cronSecret) {
    return config.nodeEnv === 'development';
  }
  
  // Check for Vercel cron header
  const vercelCronHeader = request.headers.get('x-vercel-cron');
  if (vercelCronHeader === '1') {
    return true;
  }
  
  // Check for manual cron secret
  const providedSecret = request.headers.get('x-cron-secret') || 
                         request.headers.get('authorization')?.replace('Bearer ', '');
  
  return providedSecret === cronSecret;
}

export async function GET(request: NextRequest) {
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
    
    // Perform heartbeat
    const result = await performHeartbeat();
    
    // Update last heartbeat timestamp in database
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

// Also support POST for flexibility
export async function POST(request: NextRequest) {
  return GET(request);
}
