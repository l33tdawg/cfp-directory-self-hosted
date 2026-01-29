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
import Link from 'next/link';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { PluginErrorBoundary } from '@/components/plugins/plugin-error-boundary';
import { DynamicPluginLoader } from '@/components/plugins/dynamic-plugin-loader';
import { createClientPluginContext } from '@/lib/plugins/context';

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
 * Result from attempting to load a plugin admin page
 */
type AdminPageResult =
  | { success: true; componentName: string; title: string }
  | { success: false; error: 'not_loaded' | 'no_admin_pages' | 'page_not_found'; availablePages?: string[] };

/**
 * Load a plugin's admin page component dynamically.
 * Uses the plugin registry, loading the plugin on-demand if necessary.
 */
async function getPluginAdminPage(
  pluginName: string,
  pagePath: string
): Promise<AdminPageResult> {
  try {
    // Import the plugin registry and loader
    const { getPluginRegistry } = await import('@/lib/plugins/registry');
    const { loadSinglePlugin } = await import('@/lib/plugins/loader');

    const registry = getPluginRegistry();
    let loadedPlugin = registry.get(pluginName);

    // On-demand loading: if plugin is in DB but not in registry, load it now
    // This handles Next.js worker isolation where instrumentation.ts may not have run
    if (!loadedPlugin) {
      console.log(`[PluginAdminPage] Plugin ${pluginName} not in registry, loading on-demand...`);
      const loadResult = await loadSinglePlugin(pluginName);
      if (loadResult) {
        console.log(`[PluginAdminPage] On-demand load succeeded for ${pluginName}`);
      }
      loadedPlugin = registry.get(pluginName);
    }

    if (!loadedPlugin) {
      console.log(`[PluginAdminPage] Plugin ${pluginName} not found in registry after on-demand load`);
      return { success: false, error: 'not_loaded' };
    }

    const plugin = loadedPlugin.plugin;

    if (!plugin.adminPages || !Array.isArray(plugin.adminPages)) {
      console.log(`[PluginAdminPage] Plugin ${pluginName} has no adminPages defined`);
      return { success: false, error: 'no_admin_pages' };
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
      const availablePages = plugin.adminPages.map((p: { path: string }) => p.path);
      console.log(`[PluginAdminPage] No matching page for path "${pagePath}" in ${pluginName}. Available: ${availablePages.join(', ')}`);
      return { success: false, error: 'page_not_found', availablePages };
    }

    // Get the component name from the component function
    const componentName = adminPage.component?.name || adminPage.component?.displayName || 'Unknown';
    console.log(`[PluginAdminPage] Found admin page: ${adminPage.title} -> component: ${componentName}`);

    return {
      success: true,
      componentName: componentName,
      title: adminPage.title,
    };
  } catch (error) {
    console.error(`[PluginAdminPage] Failed to load admin page for ${pluginName}:`, error);
    return { success: false, error: 'not_loaded' };
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
  const adminPageResult = await getPluginAdminPage(pluginName, pagePath);

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
          pageTitle={adminPageResult.success ? adminPageResult.title : undefined}
        />

        {!adminPageResult.success ? (
          <PluginLoadError
            pluginDisplayName={plugin.displayName}
            pluginName={plugin.name}
            pagePath={pagePath}
            error={adminPageResult.error}
            availablePages={adminPageResult.availablePages}
          />
        ) : (
          <PluginErrorBoundary pluginName={pluginName}>
            <DynamicPluginLoader
              pluginName={pluginName}
              componentName={adminPageResult.componentName}
              context={clientContext}
            />
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

function PluginLoadError({
  pluginDisplayName,
  pluginName,
  pagePath,
  error,
  availablePages,
}: {
  pluginDisplayName: string;
  pluginName: string;
  pagePath: string;
  error: 'not_loaded' | 'no_admin_pages' | 'page_not_found';
  availablePages?: string[];
}) {
  const errorMessages = {
    not_loaded: {
      title: 'Plugin Not Loaded',
      description: `The plugin "${pluginDisplayName}" could not be loaded. This may happen if the plugin files are missing or corrupted. Try reinstalling the plugin.`,
    },
    no_admin_pages: {
      title: 'No Admin Pages',
      description: `The plugin "${pluginDisplayName}" does not provide any admin pages.`,
    },
    page_not_found: {
      title: 'Page Not Found',
      description: `The plugin "${pluginDisplayName}" does not have an admin page at "${pagePath}".`,
    },
  };

  const { title, description } = errorMessages[error];

  return (
    <div
      className="border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 rounded-lg p-6 text-center"
      data-testid="plugin-admin-error"
    >
      <AlertTriangle className="h-8 w-8 text-amber-600 dark:text-amber-400 mx-auto mb-3" />
      <h2 className="text-lg font-semibold text-amber-800 dark:text-amber-200 mb-2">
        {title}
      </h2>
      <p className="text-sm text-amber-700 dark:text-amber-300 mb-4">
        {description}
      </p>
      {availablePages && availablePages.length > 0 && (
        <div className="mt-4 text-left max-w-md mx-auto">
          <p className="text-xs font-medium text-amber-800 dark:text-amber-200 mb-2">
            Available pages:
          </p>
          <ul className="text-xs text-amber-700 dark:text-amber-300 space-y-1">
            {availablePages.map((page) => (
              <li key={page}>
                <Link
                  href={`/admin/plugins/pages/${pluginName}${page}`}
                  className="hover:underline"
                >
                  {page}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
