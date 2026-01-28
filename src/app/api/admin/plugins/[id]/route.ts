/**
 * Admin Plugin Detail API
 *
 * Get plugin details and update plugin configuration.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth';
import { z } from 'zod';

const updateConfigSchema = z.object({
  config: z.record(z.string(), z.unknown()),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const plugin = await prisma.plugin.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            logs: true,
            jobs: true,
          },
        },
      },
    });

    if (!plugin) {
      return NextResponse.json(
        { error: 'Plugin not found' },
        { status: 404 }
      );
    }

    // Get job stats
    const jobStats = await prisma.pluginJob.groupBy({
      by: ['status'],
      where: { pluginId: id },
      _count: true,
    });

    return NextResponse.json({
      plugin,
      jobStats: jobStats.reduce(
        (acc, stat) => ({ ...acc, [stat.status]: stat._count }),
        {} as Record<string, number>
      ),
    });
  } catch (error) {
    console.error('Error fetching plugin:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const plugin = await prisma.plugin.findUnique({
      where: { id },
    });

    if (!plugin) {
      return NextResponse.json(
        { error: 'Plugin not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validatedData = updateConfigSchema.parse(body);

    // Update config in database
    const updated = await prisma.plugin.update({
      where: { id },
      data: {
        config: JSON.parse(JSON.stringify(validatedData.config)),
      },
    });

    // Update in-memory registry if plugin is loaded
    const { updatePluginConfig } = await import('@/lib/plugins');
    updatePluginConfig(plugin.name, validatedData.config);

    return NextResponse.json({ plugin: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error updating plugin:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
