'use client';

/**
 * Plugin Detail Component
 *
 * Shows full plugin information including configuration form,
 * permissions, hooks, logs, and job stats.
 */

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Shield,
  Briefcase,
  Settings,
  FileText,
  ExternalLink,
  Loader2,
  Activity,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { PERMISSION_DESCRIPTIONS } from '@/lib/plugins/types';
import type { PluginPermission } from '@/lib/plugins/types';
import { PluginConfigForm } from './plugin-config-form';
import { PluginLogsViewer } from './plugin-logs-viewer';

interface PluginDetailData {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  version: string;
  apiVersion: string;
  author: string | null;
  homepage: string | null;
  source: string;
  sourcePath: string;
  enabled: boolean;
  installed: boolean;
  permissions: unknown;
  hooks: string[];
  config: Record<string, unknown>;
  configSchema: unknown;
  createdAt: string;
  updatedAt: string;
  _count: {
    logs: number;
    jobs: number;
  };
}

interface PluginDetailProps {
  plugin: PluginDetailData;
  jobStats: Record<string, number>;
}

export function PluginDetail({ plugin: initialPlugin, jobStats }: PluginDetailProps) {
  const router = useRouter();
  const [plugin, setPlugin] = useState(initialPlugin);
  const [isToggling, setIsToggling] = useState(false);

  const permissions = Array.isArray(plugin.permissions)
    ? (plugin.permissions as string[])
    : [];

  const handleToggleEnabled = useCallback(async () => {
    setIsToggling(true);
    const action = plugin.enabled ? 'disable' : 'enable';

    try {
      const response = await fetch(
        `/api/admin/plugins/${plugin.id}/${action}`,
        { method: 'POST' }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Failed to ${action} plugin`);
      }

      setPlugin((prev) => ({ ...prev, enabled: !prev.enabled }));
      toast.success(`Plugin ${plugin.enabled ? 'disabled' : 'enabled'} successfully`);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : `Failed to ${action} plugin`
      );
    } finally {
      setIsToggling(false);
    }
  }, [plugin.id, plugin.enabled, router]);

  return (
    <div className="space-y-8">
      {/* Back Link */}
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/plugins" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Plugins
          </Link>
        </Button>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {plugin.displayName}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {plugin.name} v{plugin.version} | API v{plugin.apiVersion}
          </p>
          {plugin.description && (
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 max-w-2xl">
              {plugin.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {isToggling ? (
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {plugin.enabled ? 'Enabled' : 'Disabled'}
              </span>
              <Switch
                checked={plugin.enabled}
                onCheckedChange={handleToggleEnabled}
                aria-label={`${plugin.enabled ? 'Disable' : 'Enable'} ${plugin.displayName}`}
              />
            </div>
          )}
        </div>
      </div>

      {/* Metadata Badges */}
      <div className="flex flex-wrap gap-2">
        <Badge
          variant={plugin.enabled ? 'default' : 'secondary'}
          className={
            plugin.enabled
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
              : ''
          }
        >
          {plugin.enabled ? 'Enabled' : 'Disabled'}
        </Badge>
        <Badge variant="outline">Source: {plugin.source}</Badge>
        {plugin.author && <Badge variant="outline">By {plugin.author}</Badge>}
        {plugin.homepage && (
          <a
            href={plugin.homepage}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            Documentation
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      <Separator />

      {/* Tabs */}
      <Tabs defaultValue="config">
        <TabsList>
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configuration
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Permissions ({permissions.length})
          </TabsTrigger>
          <TabsTrigger value="hooks" className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Hooks ({plugin.hooks.length})
          </TabsTrigger>
          <TabsTrigger value="jobs" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Jobs
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Logs ({plugin._count.logs})
          </TabsTrigger>
        </TabsList>

        {/* Configuration Tab */}
        <TabsContent value="config" className="mt-6">
          <PluginConfigForm
            pluginId={plugin.id}
            pluginName={plugin.displayName}
            config={plugin.config}
            configSchema={plugin.configSchema as Parameters<typeof PluginConfigForm>[0]['configSchema']}
          />
        </TabsContent>

        {/* Permissions Tab */}
        <TabsContent value="permissions" className="mt-6">
          {permissions.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 py-4">
              This plugin does not require any special permissions.
            </p>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                This plugin requires the following permissions to function:
              </p>
              <div className="space-y-2">
                {permissions.map((perm) => {
                  const description =
                    PERMISSION_DESCRIPTIONS[perm as PluginPermission] || perm;
                  return (
                    <div
                      key={perm}
                      className="flex items-center gap-3 p-3 rounded-md border border-slate-200 dark:border-slate-800"
                    >
                      <Shield className="h-4 w-4 text-amber-500" />
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {perm}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Hooks Tab */}
        <TabsContent value="hooks" className="mt-6">
          {plugin.hooks.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 py-4">
              This plugin does not register any hooks.
            </p>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                This plugin listens to the following application events:
              </p>
              <div className="space-y-2">
                {plugin.hooks.map((hook) => (
                  <div
                    key={hook}
                    className="flex items-center gap-3 p-3 rounded-md border border-slate-200 dark:border-slate-800"
                  >
                    <Briefcase className="h-4 w-4 text-blue-500" />
                    <code className="text-sm font-mono text-slate-700 dark:text-slate-300">
                      {hook}
                    </code>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Jobs Tab */}
        <TabsContent value="jobs" className="mt-6">
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Background job statistics for this plugin:
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(['pending', 'running', 'completed', 'failed'] as const).map(
                (status) => {
                  const count = jobStats[status] || 0;
                  const colors = {
                    pending: 'text-yellow-600 dark:text-yellow-400',
                    running: 'text-blue-600 dark:text-blue-400',
                    completed: 'text-green-600 dark:text-green-400',
                    failed: 'text-red-600 dark:text-red-400',
                  };
                  return (
                    <div
                      key={status}
                      className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 text-center"
                    >
                      <p className="text-sm text-slate-500 dark:text-slate-400 capitalize">
                        {status}
                      </p>
                      <p className={`text-2xl font-bold mt-1 ${colors[status]}`}>
                        {count}
                      </p>
                    </div>
                  );
                }
              )}
            </div>
            {plugin._count.jobs === 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                No background jobs have been created by this plugin yet.
              </p>
            )}
          </div>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="mt-6">
          <PluginLogsViewer
            pluginId={plugin.id}
            pluginName={plugin.displayName}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
