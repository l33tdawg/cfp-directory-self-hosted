'use client';

/**
 * Official Plugins Gallery
 *
 * Fetches and displays the official plugin gallery below the
 * installed plugins list. Supports install, update, and refresh.
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Store,
  RefreshCw,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { GalleryPluginCard } from './gallery-plugin-card';
import type { GalleryPluginWithStatus } from '@/lib/plugins/gallery';

type LoadState = 'idle' | 'loading' | 'success' | 'error';

export function OfficialPluginsGallery() {
  const router = useRouter();
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [plugins, setPlugins] = useState<GalleryPluginWithStatus[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [installingPlugin, setInstallingPlugin] = useState<string | null>(null);
  // Track if we've received any response (prevents loading flash on initial load only)
  const [hasInitialResponse, setHasInitialResponse] = useState(false);

  const fetchGallery = useCallback(async (refresh = false) => {
    setLoadState('loading');
    setError(null);

    try {
      const url = refresh
        ? '/api/admin/plugins/gallery?refresh=true'
        : '/api/admin/plugins/gallery';
      const response = await fetch(url);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch gallery');
      }

      const data = await response.json();
      setPlugins(data.plugins);
      setLastUpdated(data.lastUpdated);
      setLoadState('success');
      setHasInitialResponse(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch gallery');
      setLoadState('error');
      setHasInitialResponse(true);
    }
  }, []);

  useEffect(() => {
    fetchGallery();
  }, [fetchGallery]);

  const handleInstall = useCallback(
    async (pluginName: string) => {
      setInstallingPlugin(pluginName);

      try {
        const response = await fetch('/api/admin/plugins/gallery/install', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pluginName }),
        });

        const data = await response.json();

        if (!response.ok) {
          toast.error(data.error || 'Failed to install plugin');
          return;
        }

        toast.success(
          `Plugin "${data.plugin?.displayName || pluginName}" installed successfully`
        );

        // Optimistic local state update
        setPlugins((prev) =>
          prev.map((p) =>
            p.name === pluginName
              ? { ...p, installStatus: 'installed' as const, installedVersion: p.version }
              : p
          )
        );

        // Reload the installed plugins list above
        router.refresh();
      } catch {
        toast.error('Network error. Please try again.');
      } finally {
        setInstallingPlugin(null);
      }
    },
    [router]
  );

  if (loadState === 'idle') {
    return null;
  }

  // During INITIAL load only, don't show loading skeleton to prevent flash-then-disappear
  // After we've received any response, show loading normally on subsequent refreshes
  if (loadState === 'loading' && !hasInitialResponse) {
    return null;
  }

  return (
    <div className="mt-10">
      {/* Section header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Store className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              Official Plugins
            </h2>
            {lastUpdated && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Last updated:{' '}
                {new Date(lastUpdated).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchGallery(true)}
          disabled={loadState === 'loading'}
        >
          {loadState === 'loading' ? (
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-1.5" />
          )}
          Refresh
        </Button>
      </div>

      {/* Loading state */}
      {loadState === 'loading' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 animate-pulse"
            >
              <div className="h-[3px] w-full bg-slate-200 dark:bg-slate-700" />
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="h-10 w-10 rounded-lg bg-slate-200 dark:bg-slate-800 shrink-0" />
                    <div className="flex-1">
                      <div className="h-5 w-36 bg-slate-200 dark:bg-slate-800 rounded mb-2" />
                      <div className="h-4 w-28 bg-slate-100 dark:bg-slate-800/60 rounded" />
                    </div>
                  </div>
                  <div className="h-8 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
                </div>
                <div className="h-4 w-full bg-slate-100 dark:bg-slate-800/60 rounded mb-2" />
                <div className="h-4 w-3/4 bg-slate-100 dark:bg-slate-800/60 rounded mb-3" />
                <div className="flex gap-2">
                  <div className="h-5 w-16 bg-slate-100 dark:bg-slate-800/60 rounded" />
                  <div className="h-5 w-20 bg-slate-100 dark:bg-slate-800/60 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {loadState === 'error' && (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-700 dark:text-red-400">
                Failed to load plugin gallery
              </p>
              <p className="text-sm text-red-600 dark:text-red-400/80 mt-1">
                {error}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => fetchGallery(true)}
              >
                Try Again
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Success state */}
      {loadState === 'success' && plugins.length === 0 && (
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-8 text-center">
          <Store className="h-10 w-10 mx-auto text-slate-400 mb-3" />
          <p className="text-sm text-slate-600 dark:text-slate-300">
            No official plugins available yet.
          </p>
        </div>
      )}

      {loadState === 'success' && plugins.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {plugins.map((plugin) => (
            <GalleryPluginCard
              key={plugin.name}
              plugin={plugin}
              isInstalling={installingPlugin === plugin.name}
              onInstall={() => handleInstall(plugin.name)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
