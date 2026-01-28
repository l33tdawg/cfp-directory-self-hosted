'use client';

/**
 * Admin Sidebar Slot Component
 * @version 1.5.0
 *
 * Renders plugin-contributed menu items in the admin sidebar.
 * Provides pathname context for active link detection.
 */

import { usePathname } from 'next/navigation';
import { PluginSlot } from './plugin-slot';

/**
 * Renders the admin.sidebar.items slot with pathname context.
 * Plugin components receive { pathname, pluginBasePath } to:
 * - Highlight active links based on current route
 * - Build correct hrefs for their admin pages
 */
export function AdminSidebarSlot() {
  const pathname = usePathname();

  return (
    <PluginSlot
      name="admin.sidebar.items"
      data={{ pathname, pluginBasePath: '/admin/plugins/pages' }}
      className="space-y-1"
    />
  );
}
