'use client';

/**
 * Gallery Plugin Card Component
 *
 * Displays a single plugin from the official gallery with
 * accent strip, icon, install status, and one-click install/update.
 */

import {
  Download,
  Check,
  ArrowUpCircle,
  Loader2,
  ExternalLink,
  Shield,
  Briefcase,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { GalleryPluginWithStatus } from '@/lib/plugins/gallery';

interface GalleryPluginCardProps {
  plugin: GalleryPluginWithStatus;
  isInstalling: boolean;
  onInstall: () => void;
}

function GalleryPluginIcon({ name, status }: { name: string; status: string }) {
  const initials = name
    .split(/[\s-]+/)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const colors = {
    installed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    update_available: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    not_installed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  };

  return (
    <div
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
        colors[status as keyof typeof colors] || colors.not_installed
      }`}
    >
      {initials}
    </div>
  );
}

export function GalleryPluginCard({
  plugin,
  isInstalling,
  onInstall,
}: GalleryPluginCardProps) {
  const accentColors = {
    installed: 'bg-gradient-to-r from-green-400 to-emerald-500',
    update_available: 'bg-gradient-to-r from-amber-400 to-orange-500',
    not_installed: 'bg-gradient-to-r from-blue-400 to-indigo-500',
  };

  return (
    <div className="group relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 transition-all hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-700">
      {/* Accent strip */}
      <div
        className={`h-[3px] w-full ${
          accentColors[plugin.installStatus] || accentColors.not_installed
        }`}
      />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3 min-w-0">
            <GalleryPluginIcon name={plugin.displayName} status={plugin.installStatus} />
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                {plugin.displayName}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {plugin.name} v{plugin.version}
              </p>
            </div>
          </div>
          <div className="ml-4">
            {isInstalling ? (
              <Button size="sm" disabled>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                Installing...
              </Button>
            ) : plugin.installStatus === 'not_installed' ? (
              <Button size="sm" onClick={onInstall}>
                <Download className="h-4 w-4 mr-1.5" />
                Install
              </Button>
            ) : plugin.installStatus === 'update_available' ? (
              <Button size="sm" variant="outline" onClick={onInstall}>
                <ArrowUpCircle className="h-4 w-4 mr-1.5" />
                Update
              </Button>
            ) : (
              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                <Check className="h-3 w-3 mr-1" />
                Installed
              </Badge>
            )}
          </div>
        </div>

        {/* Version upgrade path */}
        {plugin.installStatus === 'update_available' && plugin.installedVersion && (
          <div className="mb-3">
            <Badge variant="outline" className="text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-700">
              v{plugin.installedVersion} → v{plugin.version}
            </Badge>
          </div>
        )}

        {/* Description */}
        {plugin.description && (
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-3 line-clamp-2">
            {plugin.description}
          </p>
        )}

        {/* Metadata badges */}
        <div className="flex flex-wrap gap-2 mb-3">
          <Badge variant="outline">API v{plugin.apiVersion}</Badge>
          {plugin.author && (
            <Badge variant="outline">{plugin.author}</Badge>
          )}
          {plugin.category && (
            <Badge variant="outline">{plugin.category}</Badge>
          )}
        </div>

        {/* Stats row with Tooltips */}
        <TooltipProvider delayDuration={300}>
          <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
            {plugin.permissions.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center gap-1 cursor-default">
                    <Shield className="h-3 w-3" />
                    {plugin.permissions.length}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {plugin.permissions.length} permission{plugin.permissions.length !== 1 ? 's' : ''}
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
            {plugin.homepage && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href={plugin.homepage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </TooltipTrigger>
                <TooltipContent>Documentation</TooltipContent>
              </Tooltip>
            )}
          </div>
        </TooltipProvider>
      </div>
    </div>
  );
}
