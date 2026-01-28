/**
 * Plugin Sidebar Items API
 * @version 1.5.1
 *
 * Returns sidebar items for all enabled plugins.
 * Used by AdminSidebarSlot to render plugin menu items.
 */

import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { prisma } from '@/lib/db/prisma';
import { getApiUser } from '@/lib/auth';
import type { PluginSidebarSection, PluginSidebarItem } from '@/lib/plugins/types';

/**
 * Response shape for a plugin's sidebar data
 */
interface PluginSidebarData {
  pluginName: string;
  pluginId: string;
  sections: PluginSidebarSection[];
}

/**
 * Validate plugin name - only allow kebab-case alphanumeric names
 * This prevents path traversal attacks
 */
function isValidPluginName(name: string): boolean {
  // Must be 2-50 chars, lowercase alphanumeric with hyphens, no leading/trailing hyphens
  return /^[a-z0-9][a-z0-9-]{0,48}[a-z0-9]$/.test(name) || /^[a-z0-9]{1,2}$/.test(name);
}

/**
 * Validate a single sidebar item
 */
function isValidSidebarItem(item: unknown): item is PluginSidebarItem {
  if (!item || typeof item !== 'object') return false;
  const obj = item as Record<string, unknown>;

  return (
    typeof obj.key === 'string' &&
    obj.key.length > 0 &&
    obj.key.length <= 50 &&
    typeof obj.label === 'string' &&
    obj.label.length > 0 &&
    obj.label.length <= 100 &&
    typeof obj.path === 'string' &&
    obj.path.length > 0 &&
    obj.path.length <= 200 &&
    /^\/[a-z0-9\/-]*$/.test(obj.path) &&
    (obj.icon === undefined || (typeof obj.icon === 'string' && obj.icon.length <= 50))
  );
}

/**
 * Validate a sidebar section
 */
function isValidSidebarSection(section: unknown): section is PluginSidebarSection {
  if (!section || typeof section !== 'object') return false;
  const obj = section as Record<string, unknown>;

  return (
    typeof obj.title === 'string' &&
    obj.title.length > 0 &&
    obj.title.length <= 100 &&
    (obj.icon === undefined || (typeof obj.icon === 'string' && obj.icon.length <= 50)) &&
    Array.isArray(obj.items) &&
    obj.items.length > 0 &&
    obj.items.length <= 50 &&
    obj.items.every(isValidSidebarItem)
  );
}

/**
 * Validate sidebar items array from manifest
 */
function validateSidebarItems(items: unknown): PluginSidebarSection[] | null {
  if (!Array.isArray(items)) return null;
  if (items.length === 0 || items.length > 20) return null;
  if (!items.every(isValidSidebarSection)) return null;
  return items as PluginSidebarSection[];
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
      },
    });

    const items: PluginSidebarData[] = [];
    const pluginsDir = path.join(process.cwd(), 'plugins');

    for (const plugin of plugins) {
      // Validate plugin name to prevent path traversal
      if (!isValidPluginName(plugin.name)) {
        console.warn(`[sidebar-items] Skipping plugin with invalid name: ${plugin.name}`);
        continue;
      }

      const manifestPath = path.join(pluginsDir, plugin.name, 'manifest.json');

      // Verify resolved path stays within plugins directory (defense in depth)
      const normalizedPath = path.normalize(manifestPath);
      const normalizedPluginsDir = path.normalize(pluginsDir);
      if (!normalizedPath.startsWith(normalizedPluginsDir + path.sep)) {
        console.warn(`[sidebar-items] Path traversal attempt blocked for plugin: ${plugin.name}`);
        continue;
      }

      try {
        const manifestContent = await fs.readFile(manifestPath, 'utf-8');
        const manifest = JSON.parse(manifestContent);

        if (manifest.sidebarItems) {
          const validatedSections = validateSidebarItems(manifest.sidebarItems);
          if (validatedSections) {
            items.push({
              pluginName: plugin.name,
              pluginId: plugin.id,
              sections: validatedSections,
            });
          } else {
            console.warn(`[sidebar-items] Invalid sidebarItems format for plugin: ${plugin.name}`);
          }
        }
      } catch (error) {
        // Log specific errors for debugging
        if (error instanceof SyntaxError) {
          console.warn(`[sidebar-items] Invalid JSON in manifest for ${plugin.name}`);
        } else if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
          // File doesn't exist - this is normal for plugins without sidebar items
        } else if (error instanceof Error && 'code' in error && error.code === 'EACCES') {
          console.warn(`[sidebar-items] Permission denied reading manifest for ${plugin.name}`);
        }
        // Continue to next plugin
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
