/**
 * Admin Plugin Detail API
 *
 * Get plugin details and update plugin configuration.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getApiUser } from '@/lib/auth';
import { z } from 'zod';
import {
  getPasswordFields,
  encryptConfigFields,
  maskConfigFields,
} from '@/lib/plugins/config-encryption';
import type { JSONSchema } from '@/lib/plugins/types';

const updateConfigSchema = z.object({
  config: z.record(z.string(), z.unknown()),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getApiUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
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

    // Mask password fields before returning to frontend
    const passwordFields = getPasswordFields(plugin.configSchema as JSONSchema | null);
    const maskedConfig = maskConfigFields(
      plugin.config as Record<string, unknown>,
      passwordFields
    );

    return NextResponse.json({
      plugin: { ...plugin, config: maskedConfig },
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
    const user = await getApiUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
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

    // Encrypt password fields before saving
    const passwordFields = getPasswordFields(plugin.configSchema as JSONSchema | null);
    const existingConfig = plugin.config as Record<string, unknown>;
    const encryptedConfig = encryptConfigFields(
      validatedData.config,
      existingConfig,
      passwordFields
    );

    // Update config in database
    const updated = await prisma.plugin.update({
      where: { id },
      data: {
        config: JSON.parse(JSON.stringify(encryptedConfig)),
      },
    });

    // Update in-memory registry if plugin is loaded
    const { updatePluginConfig } = await import('@/lib/plugins');
    updatePluginConfig(plugin.name, encryptedConfig);

    // Mask password fields in response
    const maskedConfig = maskConfigFields(
      updated.config as Record<string, unknown>,
      passwordFields
    );

    return NextResponse.json({ plugin: { ...updated, config: maskedConfig } });
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
