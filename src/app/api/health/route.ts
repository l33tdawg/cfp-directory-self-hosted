/**
 * Health Check Endpoint
 * 
 * Used by Docker health checks and monitoring systems to verify
 * the application is running and can connect to the database.
 * 
 * GET /api/health - Returns basic health status (public)
 * GET /api/health?detailed=true - Returns detailed health info (requires admin auth or CRON_SECRET)
 * 
 * SECURITY: Detailed health info is restricted because it reveals:
 * - Environment configuration (NODE_ENV)
 * - Whether storage/email is configured
 * - Database latency (useful for timing attacks)
 */

import { NextResponse, NextRequest } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db/prisma';
import { auth } from '@/lib/auth/auth';
import { config } from '@/lib/env';

export const dynamic = 'force-dynamic';

// Application version (should match package.json)
const APP_VERSION = process.env.npm_package_version || '0.1.0';

/**
 * Check if request is authorized for detailed health info
 * Accepts admin session or CRON_SECRET header
 */
async function isAuthorizedForDetails(request: NextRequest): Promise<boolean> {
  // Check CRON_SECRET header (for monitoring systems)
  if (config.cronSecret) {
    const providedSecret = request.headers.get('x-cron-secret') || 
      request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (providedSecret) {
      try {
        if (crypto.timingSafeEqual(Buffer.from(providedSecret), Buffer.from(config.cronSecret))) {
          return true;
        }
      } catch {
        // Buffer length mismatch - not authorized
      }
    }
  }
  
  // Check admin session
  const session = await auth();
  return session?.user?.role === 'ADMIN';
}

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  version: string;
  environment: string;
  database: 'connected' | 'disconnected';
  checks?: {
    database: { status: string; latency?: number };
    storage: { status: string };
    email: { status: string };
  };
  error?: string;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const detailed = searchParams.get('detailed') === 'true';
  
  let dbLatency = 0;
  let dbStatus: 'connected' | 'disconnected' = 'disconnected';
  
  try {
    // Check database connectivity
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatency = Date.now() - dbStart;
    dbStatus = 'connected';
  } catch (error) {
    console.error('Health check - database error:', error);
  }
  
  const isHealthy = dbStatus === 'connected';
  
  // Basic health response (always public)
  const response: HealthStatus = {
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    version: APP_VERSION,
    environment: config.isProd ? 'production' : 'development', // Don't leak exact NODE_ENV
    database: dbStatus,
  };
  
  // SECURITY: Detailed checks require authorization
  // This prevents reconnaissance attacks that could reveal:
  // - Configuration details (storage/email setup)
  // - Database latency (timing information)
  // - Infrastructure details
  if (detailed) {
    const authorized = await isAuthorizedForDetails(request);
    
    if (!authorized) {
      return NextResponse.json(
        { error: 'Detailed health information requires admin authentication or CRON_SECRET' },
        { status: 401 }
      );
    }
    
    response.checks = {
      database: {
        status: dbStatus,
        latency: dbLatency,
      },
      storage: {
        status: process.env.UPLOAD_DIR ? 'configured' : 'default',
      },
      email: {
        status: process.env.SMTP_HOST ? 'configured' : 'not_configured',
      },
    };
  }
  
  return NextResponse.json(response, {
    status: isHealthy ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
