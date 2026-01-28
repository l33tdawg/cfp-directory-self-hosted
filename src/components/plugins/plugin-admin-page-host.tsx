'use client';

/**
 * Plugin Admin Page Host Component
 * @version 1.5.0
 *
 * Renders plugin-provided admin pages within an error boundary.
 * Fetches the registered page component from the slot registry and
 * matches it to the requested path.
 */

import React, { Suspense } from 'react';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { PluginErrorBoundary } from './plugin-error-boundary';
import { getSlotRegistry } from '@/lib/plugins/slots';
import type { DynamicSlotName } from '@/lib/plugins/slots/types';

export interface PluginAdminPageHostProps {
  /** Plugin name (kebab-case identifier) */
  pluginName: string;
  /** Plugin database ID (reserved for future use) */
  pluginId?: string;
  /** Plugin display name for UI */
  pluginDisplayName: string;
  /** Requested page path (e.g., '/history', '/personas', '/') */
  pagePath: string;
}

/**
 * Hosts plugin admin pages within the platform's admin section.
 * Looks up registered page components from the slot registry and
 * renders the matching page.
 */
export function PluginAdminPageHost({
  pluginName,
  pluginId: _pluginId,
  pluginDisplayName,
  pagePath,
}: PluginAdminPageHostProps) {
  // _pluginId reserved for future use (e.g., API calls)
  void _pluginId;
  const slotRegistry = getSlotRegistry();
  const slotName: DynamicSlotName = `admin.pages.${pluginName}`;

  // Get all registered admin pages for this plugin
  const registrations = slotRegistry.getSlotComponents(slotName);

  // Find the registration matching the requested path
  const normalizedPath = pagePath === '' ? '/' : pagePath;
  const matchingRegistration = registrations.find((reg) => {
    const regPath = (reg.metadata?.path as string) || '/';
    return regPath === normalizedPath;
  });

  // No admin pages registered at all
  if (registrations.length === 0) {
    return (
      <div className="space-y-4">
        <Breadcrumb pluginName={pluginName} pluginDisplayName={pluginDisplayName} />
        <div
          className="border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 rounded-lg p-6 text-center"
          data-testid="plugin-admin-no-pages"
        >
          <AlertTriangle className="h-8 w-8 text-amber-600 dark:text-amber-400 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-amber-800 dark:text-amber-200 mb-2">
            No Admin Pages Available
          </h2>
          <p className="text-sm text-amber-700 dark:text-amber-300">
            The plugin &ldquo;{pluginDisplayName}&rdquo; does not provide any admin pages.
          </p>
        </div>
      </div>
    );
  }

  // Page path not found
  if (!matchingRegistration) {
    return (
      <div className="space-y-4">
        <Breadcrumb pluginName={pluginName} pluginDisplayName={pluginDisplayName} />
        <div
          className="border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 rounded-lg p-6 text-center"
          data-testid="plugin-admin-page-not-found"
        >
          <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
            Page Not Found
          </h2>
          <p className="text-sm text-red-700 dark:text-red-300 mb-4">
            The requested page &ldquo;{normalizedPath}&rdquo; does not exist for this plugin.
          </p>
          <p className="text-xs text-red-600 dark:text-red-400">
            Available pages:{' '}
            {registrations.map((r) => (r.metadata?.path as string) || '/').join(', ')}
          </p>
        </div>
      </div>
    );
  }

  const PageComponent = matchingRegistration.component;
  const pageTitle = (matchingRegistration.metadata?.title as string) || 'Admin Page';

  return (
    <div className="space-y-6" data-testid="plugin-admin-page-host">
      <Breadcrumb
        pluginName={pluginName}
        pluginDisplayName={pluginDisplayName}
        pageTitle={pageTitle}
      />

      <PluginErrorBoundary pluginName={pluginName}>
        <Suspense fallback={<PageLoadingSkeleton />}>
          <PageComponent
            context={matchingRegistration.context}
            data={{ pagePath: normalizedPath }}
          />
        </Suspense>
      </PluginErrorBoundary>
    </div>
  );
}

function Breadcrumb({
  pluginName,
  pluginDisplayName,
  pageTitle,
}: {
  pluginName: string;
  pluginDisplayName: string;
  pageTitle?: string;
}) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Link
        href="/admin/plugins"
        className="flex items-center gap-1 hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Plugins
      </Link>
      <span>/</span>
      <Link
        href={`/admin/plugins/pages/${pluginName}`}
        className="hover:text-foreground transition-colors"
      >
        {pluginDisplayName}
      </Link>
      {pageTitle && (
        <>
          <span>/</span>
          <span className="text-foreground font-medium">{pageTitle}</span>
        </>
      )}
    </div>
  );
}

function PageLoadingSkeleton() {
  return (
    <div className="space-y-4" data-testid="plugin-admin-page-loading">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-96" />
      <div className="grid grid-cols-3 gap-4 mt-6">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-64 w-full mt-4" />
    </div>
  );
}
