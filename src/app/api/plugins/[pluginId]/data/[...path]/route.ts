/**
 * Plugin Data API
 *
 * Provides read access to plugin key-value data store.
 * Path format: /api/plugins/[pluginId]/data/[namespace]/[key]
 *
 * SECURITY: Only admins can access plugin data.
 * Encrypted values are NOT returned through this API.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getApiUser } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ pluginId: string; path: string[] }> }
) {
  try {
    const { pluginId, path } = await params;
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

    // Path should be [namespace, key]
    if (!path || path.length !== 2) {
      return NextResponse.json(
        { error: 'Invalid path. Expected: /data/[namespace]/[key]' },
        { status: 400 }
      );
    }

    const [namespace, key] = path;

    // Verify plugin exists
    const plugin = await prisma.plugin.findFirst({
      where: {
        OR: [{ id: pluginId }, { name: pluginId }],
      },
      select: { id: true, name: true },
    });

    if (!plugin) {
      return NextResponse.json(
        { error: 'Plugin not found' },
        { status: 404 }
      );
    }

    // Get the data
    const data = await prisma.pluginData.findUnique({
      where: {
        pluginId_namespace_key: {
          pluginId: plugin.id,
          namespace,
          key,
        },
      },
      select: {
        value: true,
        encrypted: true,
      },
    });

    if (!data) {
      return NextResponse.json(
        { error: 'Data not found', value: null },
        { status: 404 }
      );
    }

    // SECURITY: Never return encrypted values through client API
    if (data.encrypted) {
      return NextResponse.json(
        { error: 'Cannot access encrypted data through this API' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      namespace,
      key,
      value: data.value,
    });
  } catch (error) {
    console.error('[PluginDataAPI] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
