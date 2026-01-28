'use client';

/**
 * Gallery Plugin Card Component
 *
 * Displays a single plugin from the official gallery with
 * install status and one-click install/update.
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
import type { GalleryPluginWithStatus } from '@/lib/plugins/gallery';

interface GalleryPluginCardProps {
  plugin: GalleryPluginWithStatus;
  isInstalling: boolean;
  onInstall: () => void;
}

export function GalleryPluginCard({
  plugin,
  isInstalling,
  onInstall,
}: GalleryPluginCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 transition-shadow hover:shadow-md">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            {plugin.displayName}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {plugin.name} v{plugin.version}
          </p>
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
              Update to v{plugin.version}
            </Button>
          ) : (
            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
              <Check className="h-3 w-3 mr-1" />
              Installed
            </Badge>
          )}
        </div>
      </div>

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

      {/* Stats row */}
      <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
        {plugin.permissions.length > 0 && (
          <span className="flex items-center gap-1">
            <Shield className="h-3 w-3" />
            {plugin.permissions.length} permission{plugin.permissions.length !== 1 ? 's' : ''}
          </span>
        )}
        {plugin.hooks.length > 0 && (
          <span className="flex items-center gap-1">
            <Briefcase className="h-3 w-3" />
            {plugin.hooks.length} hook{plugin.hooks.length !== 1 ? 's' : ''}
          </span>
        )}
        {plugin.homepage && (
          <a
            href={plugin.homepage}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            Docs
          </a>
        )}
      </div>
    </div>
  );
}
