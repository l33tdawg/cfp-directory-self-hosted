/**
 * Plugin Jobs API
 *
 * Client-accessible endpoint for plugin components to fetch and create jobs.
 * Replaces direct context.jobs calls from client components.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getApiUser } from '@/lib/auth';
import { z } from 'zod';

const createJobSchema = z.object({
  type: z.string(),
  payload: z.record(z.string(), z.unknown()),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ pluginId: string }> }
) {
  try {
    const { pluginId } = await params;
    const user = await getApiUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // SECURITY: Require admin role to view job history
    // Job payloads/results may contain sensitive data (submission content, API responses, etc.)
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Verify plugin exists
    const plugin = await prisma.plugin.findUnique({
      where: { id: pluginId },
      select: { id: true },
    });

    if (!plugin) {
      return NextResponse.json(
        { error: 'Plugin not found' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const submissionId = searchParams.get('submissionId') || undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

    const where: Record<string, unknown> = { pluginId };

    if (status) {
      where.status = status;
    }

    const jobs = await prisma.pluginJob.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // SECURITY: Redact sensitive fields from job payloads and results
    // This prevents exposure of API keys, tokens, and raw provider responses
    const SENSITIVE_KEYS = [
      'rawResponse', 'apiKey', 'apikey', 'api_key', 'token', 'secret',
      'password', 'credential', 'authorization', 'bearer', 'accessToken',
      'access_token', 'refreshToken', 'refresh_token', 'privateKey', 'private_key'
    ];

    function redactSensitiveFields(obj: Record<string, unknown> | null): Record<string, unknown> | null {
      if (!obj) return null;
      const redacted: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();
        // Check if key matches any sensitive pattern
        if (SENSITIVE_KEYS.some(sk => lowerKey.includes(sk.toLowerCase()))) {
          redacted[key] = '[REDACTED]';
        } else if (value && typeof value === 'object' && !Array.isArray(value)) {
          redacted[key] = redactSensitiveFields(value as Record<string, unknown>);
        } else if (Array.isArray(value)) {
          redacted[key] = value.map(item =>
            item && typeof item === 'object'
              ? redactSensitiveFields(item as Record<string, unknown>)
              : item
          );
        } else {
          redacted[key] = value;
        }
      }
      return redacted;
    }

    // Sanitize jobs and optionally filter by submissionId
    const sanitizedJobs = jobs
      .map((job) => {
        return {
          ...job,
          payload: redactSensitiveFields(job.payload as Record<string, unknown> | null),
          result: redactSensitiveFields(job.result as Record<string, unknown> | null),
        };
      })
      .filter((job) => {
        if (!submissionId) return true;
        const payload = job.payload as Record<string, unknown> | null;
        const result = job.result as Record<string, unknown> | null;
        const resultData = result?.data as Record<string, unknown> | undefined;
        return (
          payload?.submissionId === submissionId ||
          resultData?.submissionId === submissionId
        );
      });

    return NextResponse.json({ jobs: sanitizedJobs });
  } catch (error) {
    console.error('Error fetching plugin jobs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/plugins/[pluginId]/jobs
 *
 * Create a new job for the plugin.
 * Admin-only endpoint for manually triggering plugin jobs.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ pluginId: string }> }
) {
  try {
    const { pluginId } = await params;
    const user = await getApiUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Require admin role for creating jobs
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Verify plugin exists and is enabled
    const plugin = await prisma.plugin.findUnique({
      where: { id: pluginId },
      select: { id: true, name: true, enabled: true },
    });

    if (!plugin) {
      return NextResponse.json(
        { error: 'Plugin not found' },
        { status: 404 }
      );
    }

    if (!plugin.enabled) {
      return NextResponse.json(
        { error: 'Plugin is not enabled' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { type, payload } = createJobSchema.parse(body);

    // Create the job
    const job = await prisma.pluginJob.create({
      data: {
        pluginId,
        type,
        payload: JSON.parse(JSON.stringify(payload)),
        status: 'pending',
        runAt: new Date(),
        maxAttempts: 3,
        priority: 1,
        lockTimeout: 300,
      },
    });

    return NextResponse.json({ job }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error creating plugin job:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
