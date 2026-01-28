/**
 * Plugin Jobs API
 *
 * Client-accessible endpoint for plugin components to fetch job data.
 * Replaces direct context.jobs.getJobs() calls from client components.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getApiUser } from '@/lib/auth';

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

    // Strip rawResponse from results and optionally filter by submissionId
    const sanitizedJobs = jobs
      .map((job) => {
        const result = job.result as Record<string, unknown> | null;
        if (result?.data) {
          const data = result.data as Record<string, unknown>;
          if (data.analysis) {
            const analysis = { ...(data.analysis as Record<string, unknown>) };
            delete analysis.rawResponse;
            return {
              ...job,
              result: { ...result, data: { ...data, analysis } },
            };
          }
        }
        return job;
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
