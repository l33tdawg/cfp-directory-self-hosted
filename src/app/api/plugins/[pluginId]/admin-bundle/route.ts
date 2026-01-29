/**
 * Plugin Admin Bundle API
 *
 * Serves pre-compiled admin page bundles for client-side loading.
 * These bundles are generated at plugin build time using esbuild.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getApiUser } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pluginId: string }> }
) {
  try {
    const { pluginId } = await params;

    // Auth check - only admins can access plugin bundles
    const user = await getApiUser();
    if (!user || user.role !== 'ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get plugin from database
    const pluginRecord = await prisma.plugin.findFirst({
      where: {
        OR: [{ id: pluginId }, { name: pluginId }],
        enabled: true,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!pluginRecord) {
      return new NextResponse('Plugin not found', { status: 404 });
    }

    // Find the admin-pages.js bundle
    const pluginsDir = process.env.PLUGINS_DIR || path.join(process.cwd(), 'plugins');
    const bundlePath = path.join(pluginsDir, pluginRecord.name, 'dist', 'admin-pages.js');

    if (!fs.existsSync(bundlePath)) {
      return new NextResponse('Admin bundle not found', { status: 404 });
    }

    const bundleContent = fs.readFileSync(bundlePath, 'utf-8');

    return new NextResponse(bundleContent, {
      headers: {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('[PluginAdminBundle] Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
