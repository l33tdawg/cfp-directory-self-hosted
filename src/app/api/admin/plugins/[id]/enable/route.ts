/**
 * Admin Plugin Enable API
 *
 * Enable a plugin by ID.
 * 
 * SECURITY WARNING: Enabling a plugin allows it to execute arbitrary code
 * within your server. Only enable plugins from trusted sources.
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

    // SECURITY: Check for explicit acknowledgement of code execution risk
    const body = await request.json().catch(() => ({}));
    const acknowledgeRisk = body.acknowledgeCodeExecution === true;
    if (!acknowledgeRisk) {
      return NextResponse.json(
        { 
          error: 'Plugin activation requires acknowledgement of security risk',
          requiresAcknowledgement: true,
          securityWarning: 'Enabling this plugin allows it to execute arbitrary code ' +
            'within your server with full access to the database and file system. ' +
            'Set acknowledgeCodeExecution=true in request body to proceed.',
        },
        { status: 400 }
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

    if (plugin.enabled) {
      return NextResponse.json(
        { error: 'Plugin is already enabled' },
        { status: 400 }
      );
    }

    // Enable in database and registry
    const { enablePlugin } = await import('@/lib/plugins');
    const success = await enablePlugin(plugin.name);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to enable plugin' },
        { status: 500 }
      );
    }

    const updated = await prisma.plugin.findUnique({
      where: { id },
    });

    return NextResponse.json({ plugin: updated });
  } catch (error) {
    console.error('Error enabling plugin:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
