/**
 * Plugin Admin Page Route
 * @version 1.5.2
 *
 * Dynamic route that hosts plugin-provided admin pages.
 * Route: /admin/plugins/pages/{pluginName}/{...path}
 *
 * Note: Plugin admin pages are rendered server-side with their components
 * imported dynamically based on plugin name and path. This avoids the
 * server/client registry boundary issue.
 *
 * Examples:
 * - /admin/plugins/pages/ai-paper-reviewer/history -> renders ReviewHistory component
 * - /admin/plugins/pages/ai-paper-reviewer/personas -> renders PersonasConfig component
 */

import { redirect, notFound } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { Skeleton } from '@/components/ui/skeleton';
import { PluginErrorBoundary } from '@/components/plugins/plugin-error-boundary';
import { createClientPluginContext } from '@/lib/plugins/context';
import type { PluginComponentProps } from '@/lib/plugins/types';

export const metadata = {
  title: 'Plugin Admin',
};

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{
    pluginName: string;
    path?: string[];
  }>;
}

/**
 * Load a plugin's admin page component dynamically.
 * Uses the plugin registry which has already loaded the plugin modules.
 */
async function getPluginAdminPage(
  pluginName: string,
  pagePath: string
): Promise<{
  component: React.ComponentType<PluginComponentProps>;
  title: string;
} | null> {
  try {
    // Import the plugin registry to get the already-loaded plugin
    const { getPluginRegistry } = await import('@/lib/plugins/registry');
    const registry = getPluginRegistry();
    const loadedPlugin = registry.get(pluginName);

    if (!loadedPlugin) {
      console.log(`[PluginAdminPage] Plugin ${pluginName} not found in registry`);
      return null;
    }

    const plugin = loadedPlugin.plugin;

    if (!plugin.adminPages || !Array.isArray(plugin.adminPages)) {
      console.log(`[PluginAdminPage] Plugin ${pluginName} has no adminPages defined`);
      return null;
    }

    // Find the matching page - try both with and without leading slash
    const normalizedPath = pagePath.startsWith('/') ? pagePath : `/${pagePath}`;
    const adminPage = plugin.adminPages.find(
      (page: { path: string }) => {
        const pagePathNorm = page.path.startsWith('/') ? page.path : `/${page.path}`;
        return pagePathNorm === normalizedPath;
      }
    );

    if (!adminPage) {
      console.log(`[PluginAdminPage] No matching page for path "${pagePath}" in ${pluginName}. Available: ${plugin.adminPages.map((p: { path: string }) => p.path).join(', ')}`);
      return null;
    }

    return {
      component: adminPage.component,
      title: adminPage.title,
    };
  } catch (error) {
    console.error(`[PluginAdminPage] Failed to load admin page for ${pluginName}:`, error);
    return null;
  }
}

export default async function PluginAdminPage({ params }: PageProps) {
  const resolvedParams = await params;
  const { pluginName, path: pathSegments = [] } = resolvedParams;

  // Admin auth check
  const currentUser = await getCurrentUser();
  if (currentUser.role !== 'ADMIN') {
    redirect('/dashboard?error=unauthorized');
  }

  // Verify plugin exists and is enabled
  const plugin = await prisma.plugin.findFirst({
    where: {
      name: pluginName,
    },
    select: {
      id: true,
      name: true,
      displayName: true,
      enabled: true,
      config: true,
      configSchema: true,
    },
  });

  if (!plugin) {
    notFound();
  }

  if (!plugin.enabled) {
    redirect(`/admin/plugins?error=plugin_disabled&plugin=${pluginName}`);
  }

  // Build the page path (e.g., ['history'] -> '/history', [] -> '/')
  const pagePath = '/' + pathSegments.join('/');

  // Get the admin page component
  const adminPage = await getPluginAdminPage(pluginName, pagePath);

  // Create a client-safe context for the component
  const clientContext = createClientPluginContext(
    plugin.id,
    plugin.name,
    plugin.config as Record<string, unknown>,
    plugin.configSchema as import('@/lib/plugins/types').JSONSchema | null
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="space-y-6">
        <Breadcrumb
          pluginName={plugin.name}
          pluginDisplayName={plugin.displayName}
          pageTitle={adminPage?.title}
        />

        {!adminPage ? (
          <NoAdminPagesMessage pluginDisplayName={plugin.displayName} pagePath={pagePath} />
        ) : (
          <PluginErrorBoundary pluginName={pluginName}>
            <Suspense fallback={<PageLoadingSkeleton />}>
              <adminPage.component
                context={clientContext}
                data={{ pagePath }}
              />
            </Suspense>
          </PluginErrorBoundary>
        )}
      </div>
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

function NoAdminPagesMessage({
  pluginDisplayName,
  pagePath,
}: {
  pluginDisplayName: string;
  pagePath: string;
}) {
  return (
    <div
      className="border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 rounded-lg p-6 text-center"
      data-testid="plugin-admin-no-pages"
    >
      <AlertTriangle className="h-8 w-8 text-amber-600 dark:text-amber-400 mx-auto mb-3" />
      <h2 className="text-lg font-semibold text-amber-800 dark:text-amber-200 mb-2">
        Page Not Found
      </h2>
      <p className="text-sm text-amber-700 dark:text-amber-300">
        The plugin &ldquo;{pluginDisplayName}&rdquo; does not have an admin page at &ldquo;{pagePath}&rdquo;.
      </p>
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
