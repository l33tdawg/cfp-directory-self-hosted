/**
 * Plugin Sidebar Items API
 * @version 1.5.0
 *
 * Returns sidebar items for all enabled plugins.
 * Used by AdminSidebarSlot to render plugin menu items.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getApiUser } from '@/lib/auth';
import type { PluginSidebarSection } from '@/lib/plugins/types';

/**
 * Response shape for a plugin's sidebar data
 */
interface PluginSidebarData {
  pluginName: string;
  pluginId: string;
  sections: PluginSidebarSection[];
}

export async function GET() {
  try {
    const user = await getApiUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Only admins can see plugin sidebar items
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ items: [] });
    }

    // Fetch all enabled plugins that have sidebar items defined
    const plugins = await prisma.plugin.findMany({
      where: {
        enabled: true,
        installed: true,
      },
      select: {
        id: true,
        name: true,
        configSchema: true,
      },
    });

    const items: PluginSidebarData[] = [];

    for (const plugin of plugins) {
      // Sidebar items can be defined in the manifest (stored in configSchema's parent)
      // For now, check if the plugin has an associated manifest with sidebarItems
      // We need to read this from the filesystem since it's not stored in DB

      // Alternative: Look for a well-known pattern in the plugin config
      // For now, we'll use a database column if available, or fall back to hardcoded defaults

      // Read from plugin directory to get manifest
      const pluginPath = await getPluginManifestPath(plugin.name);
      if (pluginPath) {
        try {
          const fs = await import('fs/promises');
          const manifestContent = await fs.readFile(pluginPath, 'utf-8');
          const manifest = JSON.parse(manifestContent);

          if (manifest.sidebarItems && Array.isArray(manifest.sidebarItems)) {
            items.push({
              pluginName: plugin.name,
              pluginId: plugin.id,
              sections: manifest.sidebarItems as PluginSidebarSection[],
            });
          }
        } catch {
          // Manifest doesn't exist or doesn't have sidebar items
        }
      }
    }

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Error fetching plugin sidebar items:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Get the manifest path for a plugin
 */
async function getPluginManifestPath(pluginName: string): Promise<string | null> {
  const path = await import('path');
  const fs = await import('fs/promises');

  const pluginsDir = path.join(process.cwd(), 'plugins');
  const manifestPath = path.join(pluginsDir, pluginName, 'manifest.json');

  try {
    await fs.access(manifestPath);
    return manifestPath;
  } catch {
    return null;
  }
}
