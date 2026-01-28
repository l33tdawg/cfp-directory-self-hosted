/**
 * Plugin Admin Page Route
 * @version 1.5.0
 *
 * Dynamic route that hosts plugin-provided admin pages.
 * Route: /admin/plugins/pages/{pluginName}/{...path}
 *
 * Examples:
 * - /admin/plugins/pages/ai-paper-reviewer/history -> renders ReviewHistory component
 * - /admin/plugins/pages/ai-paper-reviewer/personas -> renders PersonasConfig component
 */

import { redirect, notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { PluginAdminPageHost } from '@/components/plugins/plugin-admin-page-host';

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

export default async function PluginAdminPage({ params }: PageProps) {
  const resolvedParams = await params;
  const { pluginName, path = [] } = resolvedParams;

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
    },
  });

  if (!plugin) {
    notFound();
  }

  if (!plugin.enabled) {
    redirect(`/admin/plugins?error=plugin_disabled&plugin=${pluginName}`);
  }

  // Build the page path (e.g., ['history'] -> '/history', [] -> '/')
  const pagePath = '/' + path.join('/');

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <PluginAdminPageHost
        pluginName={plugin.name}
        pluginId={plugin.id}
        pluginDisplayName={plugin.displayName}
        pagePath={pagePath}
      />
    </div>
  );
}
