/**
 * Admin Plugin Disable API
 *
 * Disable a plugin by ID.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getApiUser } from '@/lib/auth';

export async function POST(
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
    });

    if (!plugin) {
      return NextResponse.json(
        { error: 'Plugin not found' },
        { status: 404 }
      );
    }

    if (!plugin.enabled) {
      return NextResponse.json(
        { error: 'Plugin is already disabled' },
        { status: 400 }
      );
    }

    // Disable in database and registry
    const { disablePlugin } = await import('@/lib/plugins');
    const success = await disablePlugin(plugin.name);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to disable plugin' },
        { status: 500 }
      );
    }

    const updated = await prisma.plugin.findUnique({
      where: { id },
    });

    return NextResponse.json({ plugin: updated });
  } catch (error) {
    console.error('Error disabling plugin:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
