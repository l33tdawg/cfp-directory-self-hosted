/**
 * Admin Monitoring API
 * 
 * GET /api/admin/monitoring
 * 
 * Returns system health and metrics for monitoring dashboards.
 * Requires ADMIN role.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getAuthenticatedUser } from '@/lib/api/auth';
import { getQueueStats, getCachedLicense, getCachedWarnings } from '@/lib/federation';
import { config } from '@/lib/env';

interface MonitoringData {
  timestamp: string;
  system: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    version: string;
    environment: string;
    uptime: number;
  };
  database: {
    connected: boolean;
    latencyMs: number | null;
  };
  federation: {
    enabled: boolean;
    status: 'active' | 'inactive' | 'error';
    lastHeartbeat: string | null;
    warnings: string[];
  };
  webhooks: {
    pendingRetry: number;
    deadLetter: number;
    successfulRetries: number;
    oldestPending: string | null;
  };
  stats: {
    users: number;
    events: number;
    submissions: number;
    reviews: number;
    messages: number;
  };
}

export async function GET(request: NextRequest) {
  try {
    // Check admin authentication
    const { user, error } = await getAuthenticatedUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: error },
        { status: 401 }
      );
    }
    
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Admin access required' },
        { status: 403 }
      );
    }
    
    // Gather metrics
    const [
      dbHealth,
      stats,
      webhookStats,
      siteSettings,
    ] = await Promise.all([
      checkDatabaseHealth(),
      getStats(),
      getQueueStats().catch(() => ({
        pendingRetry: 0,
        deadLetter: 0,
        successfulRetries: 0,
        oldestPending: null,
      })),
      prisma.siteSettings.findUnique({ where: { id: 'default' } }),
    ]);
    
    // Get federation status
    const license = getCachedLicense();
    const warnings = getCachedWarnings();
    
    // Determine overall system status
    let systemStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (!dbHealth.connected) {
      systemStatus = 'unhealthy';
    } else if (webhookStats.deadLetter > 0 || warnings.length > 0) {
      systemStatus = 'degraded';
    }
    
    const monitoring: MonitoringData = {
      timestamp: new Date().toISOString(),
      system: {
        status: systemStatus,
        version: process.env.npm_package_version || '0.1.0',
        environment: config.isProd ? 'production' : (config.isTest ? 'test' : 'development'),
        uptime: process.uptime(),
      },
      database: {
        connected: dbHealth.connected,
        latencyMs: dbHealth.latencyMs,
      },
      federation: {
        enabled: config.federation.enabled,
        status: license ? 'active' : (config.federation.enabled ? 'error' : 'inactive'),
        lastHeartbeat: siteSettings?.federationLastHeartbeat?.toISOString() || null,
        warnings: warnings.map(w => w.message),
      },
      webhooks: {
        pendingRetry: webhookStats.pendingRetry,
        deadLetter: webhookStats.deadLetter,
        successfulRetries: webhookStats.successfulRetries,
        oldestPending: webhookStats.oldestPending?.toISOString() || null,
      },
      stats,
    };
    
    return NextResponse.json(monitoring);
  } catch (error) {
    console.error('Monitoring error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Check database health and latency
 */
async function checkDatabaseHealth(): Promise<{
  connected: boolean;
  latencyMs: number | null;
}> {
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const latencyMs = Date.now() - start;
    
    return {
      connected: true,
      latencyMs,
    };
  } catch (error) {
    console.error('Database health check failed:', error);
    return {
      connected: false,
      latencyMs: null,
    };
  }
}

/**
 * Get aggregate statistics
 */
async function getStats(): Promise<MonitoringData['stats']> {
  const [users, events, submissions, reviews, messages] = await Promise.all([
    prisma.user.count(),
    prisma.event.count(),
    prisma.submission.count(),
    prisma.review.count(),
    prisma.message.count(),
  ]);
  
  return {
    users,
    events,
    submissions,
    reviews,
    messages,
  };
}

// Disallow other methods
export async function POST() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
