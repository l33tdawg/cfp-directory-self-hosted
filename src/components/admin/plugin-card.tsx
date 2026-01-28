'use client';

/**
 * Plugin Card Component
 *
 * Displays a single plugin with its status, metadata,
 * and enable/disable toggle.
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
    <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 transition-shadow hover:shadow-md">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
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

      {/* Stats Row */}
      <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mb-3">
        {permissions.length > 0 && (
          <span className="flex items-center gap-1">
            <Shield className="h-3 w-3" />
            {permissions.length} permission{permissions.length !== 1 ? 's' : ''}
          </span>
        )}
        {plugin.hooks.length > 0 && (
          <span className="flex items-center gap-1">
            <Briefcase className="h-3 w-3" />
            {plugin.hooks.length} hook{plugin.hooks.length !== 1 ? 's' : ''}
          </span>
        )}
        <span className="flex items-center gap-1">
          <FileText className="h-3 w-3" />
          {plugin._count.logs} log{plugin._count.logs !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/admin/plugins/${plugin.id}`}>Manage</Link>
        </Button>
        {plugin.homepage && (
          <Button variant="ghost" size="sm" asChild>
            <a
              href={plugin.homepage}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1"
            >
              Docs
              <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
        )}
        {onUninstall && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/20"
                disabled={isUninstalling}
              >
                {isUninstalling ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                <span className="ml-1">Uninstall</span>
              </Button>
            </AlertDialogTrigger>
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
      </div>
    </div>
  );
}
