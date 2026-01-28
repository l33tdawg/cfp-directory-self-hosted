/**
 * Admin Plugin Uninstall API
 *
 * Uninstall a plugin: disable, remove files, delete DB records.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getApiUser } from '@/lib/auth';
import { getPluginRegistry } from '@/lib/plugins/registry';
import { removePluginFiles } from '@/lib/plugins/archive';

export async function DELETE(
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

    const registry = getPluginRegistry();

    // Disable plugin first if enabled (calls onDisable hook)
    if (plugin.enabled) {
      try {
        await registry.disable(plugin.name);
      } catch (error) {
        console.error(`[Uninstall] Failed to disable plugin ${plugin.name}:`, error);
        // Continue with uninstall even if disable fails
      }
    }

    // Unregister from in-memory registry
    registry.unregister(plugin.name);

    // Remove plugin files
    try {
      await removePluginFiles(plugin.name);
    } catch (error) {
      console.error(`[Uninstall] Failed to remove plugin files for ${plugin.name}:`, error);
      // Continue with DB cleanup even if file removal fails
    }

    // Delete DB records: logs, jobs, then plugin
    await prisma.pluginLog.deleteMany({
      where: { pluginId: id },
    });

    await prisma.pluginJob.deleteMany({
      where: { pluginId: id },
    });

    await prisma.plugin.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error uninstalling plugin:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
