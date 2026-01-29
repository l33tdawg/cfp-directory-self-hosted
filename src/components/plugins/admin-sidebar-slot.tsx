'use client';

/**
 * Admin Sidebar Slot Component
 * @version 1.6.0
 *
 * Renders plugin-contributed menu items in the admin sidebar.
 * Fetches sidebar item data from API and renders with standard components.
 * Auto-refreshes when plugins are installed/uninstalled/enabled/disabled.
 */

import { useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import * as LucideIcons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { PluginSidebarSection } from '@/lib/plugins/types';
import { onPluginChange } from '@/lib/plugins/events';

/**
 * Response shape from the API
 */
interface PluginSidebarData {
  pluginName: string;
  pluginId: string;
  sections: PluginSidebarSection[];
}

interface ApiResponse {
  items: PluginSidebarData[];
}

/**
 * Get a Lucide icon by name
 */
function getIcon(name?: string): LucideIcon {
  if (!name) return LucideIcons.Circle;
  const icons = LucideIcons as unknown as Record<string, LucideIcon>;
  return icons[name] || LucideIcons.Circle;
}

/**
 * Renders the admin.sidebar.items slot by fetching from API.
 * Plugin sidebar items are defined in manifest.sidebarItems and
 * rendered with a standard template.
 */
export function AdminSidebarSlot() {
  const pathname = usePathname();
  const [sidebarData, setSidebarData] = useState<PluginSidebarData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSidebarItems = useCallback(async () => {
    try {
      const response = await fetch('/api/plugins/sidebar-items');
      if (response.ok) {
        const data: ApiResponse = await response.json();
        setSidebarData(data.items || []);
      }
    } catch (error) {
      console.error('Failed to fetch sidebar items:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchSidebarItems();
  }, [fetchSidebarItems]);

  // Subscribe to plugin change events for auto-refresh
  useEffect(() => {
    const unsubscribe = onPluginChange(() => {
      fetchSidebarItems();
    });
    return unsubscribe;
  }, [fetchSidebarItems]);

  if (isLoading || sidebarData.length === 0) {
    return null;
  }

  const pluginBasePath = '/admin/plugins/pages';

  return (
    <div className="space-y-4" data-plugin-slot="admin.sidebar.items">
      {sidebarData.map((plugin) => (
        <div key={plugin.pluginName}>
          {plugin.sections.map((section, sectionIndex) => {
            const SectionIcon = getIcon(section.icon);

            return (
              <div
                key={`${plugin.pluginName}-section-${sectionIndex}`}
                className="pt-4 border-t border-slate-200 dark:border-slate-700"
              >
                {/* Section Header */}
                <div className="flex items-center gap-2 px-3 py-2 mb-1">
                  <SectionIcon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {section.title}
                  </span>
                </div>

                {/* Section Items */}
                <nav className="space-y-1">
                  {section.items.map((item) => {
                    const ItemIcon = getIcon(item.icon);
                    const href = `${pluginBasePath}/${plugin.pluginName}${item.path}`;
                    const isActive = pathname.startsWith(href);

                    return (
                      <Link
                        key={item.key}
                        href={href}
                        className={`flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
                          isActive
                            ? 'bg-purple-100 text-purple-900 dark:bg-purple-900 dark:text-purple-100'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800'
                        }`}
                        data-testid={`sidebar-link-${item.key}`}
                      >
                        <ItemIcon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </nav>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
