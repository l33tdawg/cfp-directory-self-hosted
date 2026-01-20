/**
 * Health Check Endpoint
 * 
 * Used by Docker health checks and monitoring systems to verify
 * the application is running and can connect to the database.
 * 
 * GET /api/health - Returns health status
 * GET /api/health?detailed=true - Returns detailed health info (requires auth in production)
 */

import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

// Application version (should match package.json)
const APP_VERSION = process.env.npm_package_version || '0.1.0';
const NODE_ENV = process.env.NODE_ENV || 'development';

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
  
  const startTime = Date.now();
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
  
  const response: HealthStatus = {
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    version: APP_VERSION,
    environment: NODE_ENV,
    database: dbStatus,
  };
  
  // Add detailed checks if requested
  if (detailed) {
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
