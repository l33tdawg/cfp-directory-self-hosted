'use client';

/**
 * Plugin Detail Component
 *
 * Shows full plugin information including configuration form,
 * permissions with severity indicators, hooks with descriptions,
 * jobs with status icons, and logs.
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
  Clock,
  RotateCw,
  CheckCircle2,
  XCircle,
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

// ---------------------------------------------------------------------------
// Helper: Plugin icon (same style as cards)
// ---------------------------------------------------------------------------

function PluginIcon({ name, enabled }: { name: string; enabled: boolean }) {
  const initials = name
    .split(/[\s-]+/)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-base font-bold ${
        enabled
          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
      }`}
    >
      {initials}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper: Permission severity
// ---------------------------------------------------------------------------

function getPermissionSeverity(perm: string): 'read' | 'write' | 'manage' {
  if (perm.includes(':manage')) return 'manage';
  if (perm.includes(':write') || perm.includes(':send')) return 'write';
  return 'read';
}

const SEVERITY_COLORS = {
  read: 'text-green-500',
  write: 'text-amber-500',
  manage: 'text-red-500',
};

const SEVERITY_BG = {
  read: 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800',
  write: 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800',
  manage: 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800',
};

const SEVERITY_BADGE = {
  read: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  write: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  manage: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

// ---------------------------------------------------------------------------
// Helper: Hook descriptions
// ---------------------------------------------------------------------------

const HOOK_DESCRIPTIONS: Record<string, string> = {
  'submission.created': 'Triggered when a new paper or talk is submitted',
  'submission.updated': 'Triggered when an existing submission is modified',
  'submission.deleted': 'Triggered when a submission is removed',
  'submission.statusChanged': 'Triggered when a submission status changes (accepted, rejected, etc.)',
  'review.created': 'Triggered when a new review is submitted',
  'review.updated': 'Triggered when a review is modified',
  'event.created': 'Triggered when a new event is created',
  'event.updated': 'Triggered when event details are modified',
  'event.published': 'Triggered when an event is published',
  'user.registered': 'Triggered when a new user registers',
  'user.updated': 'Triggered when a user profile is updated',
};

// ---------------------------------------------------------------------------
// Helper: Job status icons
// ---------------------------------------------------------------------------

const JOB_STATUS_ICONS = {
  pending: { icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-950/20' },
  running: { icon: RotateCw, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/20', animate: 'animate-spin' },
  completed: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-950/20' },
  failed: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-950/20' },
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

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

      {/* Header with Icon */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <PluginIcon name={plugin.displayName} enabled={plugin.enabled} />
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
          <TabsTrigger value="config">
            <Settings className="h-4 w-4" />
            Configuration
          </TabsTrigger>
          <TabsTrigger value="permissions">
            <Shield className="h-4 w-4" />
            Permissions ({permissions.length})
          </TabsTrigger>
          <TabsTrigger value="hooks">
            <Briefcase className="h-4 w-4" />
            Hooks ({plugin.hooks.length})
          </TabsTrigger>
          <TabsTrigger value="jobs">
            <Activity className="h-4 w-4" />
            Jobs
          </TabsTrigger>
          <TabsTrigger value="logs">
            <FileText className="h-4 w-4" />
            Logs ({plugin._count.logs})
          </TabsTrigger>
        </TabsList>

        {/* Configuration Tab */}
        <TabsContent value="config" className="mt-6">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6">
            <PluginConfigForm
              pluginId={plugin.id}
              pluginName={plugin.displayName}
              config={plugin.config}
              configSchema={plugin.configSchema as Parameters<typeof PluginConfigForm>[0]['configSchema']}
            />
          </div>
        </TabsContent>

        {/* Permissions Tab */}
        <TabsContent value="permissions" className="mt-6">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6">
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
                    const severity = getPermissionSeverity(perm);
                    return (
                      <div
                        key={perm}
                        className={`flex items-center gap-3 p-3 rounded-lg border ${SEVERITY_BG[severity]}`}
                      >
                        <Shield className={`h-4 w-4 ${SEVERITY_COLORS[severity]}`} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-slate-900 dark:text-white">
                              {perm}
                            </p>
                            <Badge className={`text-[10px] px-1.5 py-0 ${SEVERITY_BADGE[severity]}`}>
                              {severity}
                            </Badge>
                          </div>
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
          </div>
        </TabsContent>

        {/* Hooks Tab */}
        <TabsContent value="hooks" className="mt-6">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6">
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
                  {plugin.hooks.map((hook) => {
                    const friendlyDescription = HOOK_DESCRIPTIONS[hook];
                    return (
                      <div
                        key={hook}
                        className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50"
                      >
                        <Briefcase className="h-4 w-4 text-blue-500 mt-0.5" />
                        <div>
                          <code className="text-sm font-mono text-slate-700 dark:text-slate-300">
                            {hook}
                          </code>
                          {friendlyDescription && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {friendlyDescription}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Jobs Tab */}
        <TabsContent value="jobs" className="mt-6">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6">
            <div className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Background job statistics for this plugin:
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {(['pending', 'running', 'completed', 'failed'] as const).map(
                  (status) => {
                    const count = jobStats[status] || 0;
                    const statusInfo = JOB_STATUS_ICONS[status];
                    const Icon = statusInfo.icon;
                    const colors = {
                      pending: 'text-yellow-600 dark:text-yellow-400',
                      running: 'text-blue-600 dark:text-blue-400',
                      completed: 'text-green-600 dark:text-green-400',
                      failed: 'text-red-600 dark:text-red-400',
                    };
                    return (
                      <div
                        key={status}
                        className={`rounded-lg border border-slate-200 dark:border-slate-800 p-4 text-center ${statusInfo.bg}`}
                      >
                        <div className="flex justify-center mb-2">
                          <Icon
                            className={`h-5 w-5 ${statusInfo.color} ${
                              'animate' in statusInfo ? statusInfo.animate : ''
                            }`}
                          />
                        </div>
                        <p className={`text-2xl font-bold ${colors[status]}`}>
                          {count}
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 capitalize mt-1">
                          {status}
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
          </div>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="mt-6">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6">
            <PluginLogsViewer
              pluginId={plugin.id}
              pluginName={plugin.displayName}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
