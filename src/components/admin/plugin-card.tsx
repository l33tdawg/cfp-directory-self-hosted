'use client';

/**
 * Plugin Card Component
 *
 * Displays a single installed plugin with accent strip, icon,
 * status toggle, and compact action footer.
 */

import { useState } from 'react';
import Link from 'next/link';
import {
  Loader2,
  ExternalLink,
  FileText,
  Briefcase,
  Shield,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import type { PluginData } from './plugin-list';

interface PluginCardProps {
  plugin: PluginData;
  isToggling: boolean;
  onToggleEnabled: () => void;
  onUninstall?: () => void;
}

function PluginIcon({ name, enabled }: { name: string; enabled: boolean }) {
  const initials = name
    .split(/[\s-]+/)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
        enabled
          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
      }`}
    >
      {initials}
    </div>
  );
}

export function PluginCard({
  plugin,
  isToggling,
  onToggleEnabled,
  onUninstall,
}: PluginCardProps) {
  const [isUninstalling, setIsUninstalling] = useState(false);
  const permissions = Array.isArray(plugin.permissions)
    ? (plugin.permissions as string[])
    : [];

  return (
    <div className="group relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 transition-all hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-700">
      {/* Accent strip */}
      <div
        className={`h-[3px] w-full ${
          plugin.enabled
            ? 'bg-gradient-to-r from-green-400 to-emerald-500'
            : 'bg-gradient-to-r from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-700'
        }`}
      />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3 min-w-0">
            <PluginIcon name={plugin.displayName} enabled={plugin.enabled} />
            <div className="min-w-0">
              <Link
                href={`/admin/plugins/${plugin.id}`}
                className="text-lg font-semibold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                {plugin.displayName}
              </Link>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {plugin.name} v{plugin.version}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-4">
            {isToggling ? (
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            ) : (
              <Switch
                checked={plugin.enabled}
                onCheckedChange={onToggleEnabled}
                aria-label={`${plugin.enabled ? 'Disable' : 'Enable'} ${plugin.displayName}`}
              />
            )}
          </div>
        </div>

        {/* Description */}
        {plugin.description && (
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-3 line-clamp-2">
            {plugin.description}
          </p>
        )}

        {/* Metadata */}
        <div className="flex flex-wrap gap-2 mb-3">
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
          <Badge variant="outline">API v{plugin.apiVersion}</Badge>
          {plugin.source === 'local' && (
            <Badge variant="outline">Local</Badge>
          )}
          {plugin.author && (
            <Badge variant="outline">{plugin.author}</Badge>
          )}
        </div>

        {/* Stats Row with Tooltips */}
        <TooltipProvider delayDuration={300}>
          <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mb-3">
            {permissions.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center gap-1 cursor-default">
                    <Shield className="h-3 w-3" />
                    {permissions.length}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {permissions.length} permission{permissions.length !== 1 ? 's' : ''}
                </TooltipContent>
              </Tooltip>
            )}
            {plugin.hooks.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center gap-1 cursor-default">
                    <Briefcase className="h-3 w-3" />
                    {plugin.hooks.length}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {plugin.hooks.length} hook{plugin.hooks.length !== 1 ? 's' : ''}
                </TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex items-center gap-1 cursor-default">
                  <FileText className="h-3 w-3" />
                  {plugin._count.logs}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {plugin._count.logs} log{plugin._count.logs !== 1 ? 's' : ''}
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>

        {/* Actions */}
        <Separator className="mb-3" />
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/admin/plugins/${plugin.id}`}>Manage</Link>
          </Button>

          <TooltipProvider delayDuration={300}>
            {plugin.homepage && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                    <a
                      href={plugin.homepage}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Documentation</TooltipContent>
              </Tooltip>
            )}

            {onUninstall && (
              <AlertDialog>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="ml-auto h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-950/20"
                        disabled={isUninstalling}
                      >
                        {isUninstalling ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </AlertDialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Uninstall</TooltipContent>
                </Tooltip>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Uninstall {plugin.displayName}?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently remove plugin files and all associated
                      data including logs and job records. This action cannot be
                      undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-red-600 hover:bg-red-700 text-white"
                      onClick={async () => {
                        setIsUninstalling(true);
                        try {
                          await onUninstall();
                        } finally {
                          setIsUninstalling(false);
                        }
                      }}
                    >
                      Uninstall
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}
