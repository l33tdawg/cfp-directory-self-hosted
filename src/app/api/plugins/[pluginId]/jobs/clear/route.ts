/**
 * Plugin Jobs Clear API
 *
 * Admin-only endpoint to clear completed/failed jobs for a plugin.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getApiUser } from '@/lib/auth';
import { z } from 'zod';

const clearJobsSchema = z.object({
  statuses: z.array(z.enum(['completed', 'failed'])).min(1),
  type: z.string().optional(),
});

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

    // Require admin role
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

    const body = await request.json();
    const { statuses, type } = clearJobsSchema.parse(body);

    // Build the where clause
    const where: Record<string, unknown> = {
      pluginId,
      status: { in: statuses },
    };

    if (type) {
      where.type = type;
    }

    // Delete the jobs
    const result = await prisma.pluginJob.deleteMany({ where });

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error clearing plugin jobs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
