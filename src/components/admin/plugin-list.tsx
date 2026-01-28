'use client';

/**
 * Plugin List Component
 *
 * Displays all installed plugins with search, filtering,
 * and enable/disable controls.
 */

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Filter,
  Puzzle,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { PluginCard } from './plugin-card';

export interface PluginData {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  version: string;
  apiVersion: string;
  author: string | null;
  homepage: string | null;
  source: string;
  enabled: boolean;
  installed: boolean;
  permissions: unknown;
  hooks: string[];
  config: unknown;
  configSchema: unknown;
  createdAt: string;
  updatedAt: string;
  _count: {
    logs: number;
    jobs: number;
  };
}

interface PluginListProps {
  initialPlugins: PluginData[];
}

export function PluginList({ initialPlugins }: PluginListProps) {
  const router = useRouter();
  const [plugins, setPlugins] = useState<PluginData[]>(initialPlugins);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const filteredPlugins = useMemo(() => {
    return plugins.filter((plugin) => {
      const matchesSearch =
        searchQuery === '' ||
        plugin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        plugin.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (plugin.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'enabled' && plugin.enabled) ||
        (statusFilter === 'disabled' && !plugin.enabled);

      return matchesSearch && matchesStatus;
    });
  }, [plugins, searchQuery, statusFilter]);

  const handleUninstall = useCallback(
    async (pluginId: string) => {
      try {
        const response = await fetch(
          `/api/admin/plugins/${pluginId}/uninstall`,
          { method: 'DELETE' }
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to uninstall plugin');
        }

        setPlugins((prev) => prev.filter((p) => p.id !== pluginId));
        toast.success('Plugin uninstalled successfully');
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : 'Failed to uninstall plugin'
        );
      }
    },
    [router]
  );

  const handleToggleEnabled = useCallback(
    async (pluginId: string, currentEnabled: boolean) => {
      setTogglingId(pluginId);
      const action = currentEnabled ? 'disable' : 'enable';

      try {
        const response = await fetch(
          `/api/admin/plugins/${pluginId}/${action}`,
          { method: 'POST' }
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || `Failed to ${action} plugin`);
        }

        setPlugins((prev) =>
          prev.map((p) =>
            p.id === pluginId ? { ...p, enabled: !currentEnabled } : p
          )
        );

        toast.success(
          `Plugin ${currentEnabled ? 'disabled' : 'enabled'} successfully`
        );
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : `Failed to ${action} plugin`
        );
      } finally {
        setTogglingId(null);
      }
    },
    [router]
  );

  const enabledCount = plugins.filter((p) => p.enabled).length;
  const disabledCount = plugins.filter((p) => !p.enabled).length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4">
          <div className="flex items-center gap-2">
            <Puzzle className="h-4 w-4 text-slate-500" />
            <span className="text-sm text-slate-500 dark:text-slate-400">
              Total
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {plugins.length}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4">
          <div className="flex items-center gap-2">
            <ToggleRight className="h-4 w-4 text-green-500" />
            <span className="text-sm text-slate-500 dark:text-slate-400">
              Enabled
            </span>
          </div>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
            {enabledCount}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4">
          <div className="flex items-center gap-2">
            <ToggleLeft className="h-4 w-4 text-slate-400" />
            <span className="text-sm text-slate-500 dark:text-slate-400">
              Disabled
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-600 dark:text-slate-400 mt-1">
            {disabledCount}
          </p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search plugins..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Plugins</SelectItem>
            <SelectItem value="enabled">Enabled</SelectItem>
            <SelectItem value="disabled">Disabled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      <div className="text-sm text-slate-500 dark:text-slate-400">
        Showing {filteredPlugins.length} of {plugins.length} plugins
        {statusFilter !== 'all' && ` (${statusFilter})`}
        {searchQuery && ` matching "${searchQuery}"`}
      </div>

      {/* Plugin Grid */}
      {filteredPlugins.length === 0 ? (
        <div className="text-center py-12">
          <Puzzle className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
          <p className="text-slate-500 dark:text-slate-400">
            {plugins.length === 0
              ? 'No plugins installed. Add plugins to the plugins/ directory.'
              : 'No plugins match your search.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredPlugins.map((plugin) => (
            <PluginCard
              key={plugin.id}
              plugin={plugin}
              isToggling={togglingId === plugin.id}
              onToggleEnabled={() =>
                handleToggleEnabled(plugin.id, plugin.enabled)
              }
              onUninstall={() => handleUninstall(plugin.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
