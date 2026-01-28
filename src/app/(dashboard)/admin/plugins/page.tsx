/**
 * Admin Plugins Page
 *
 * Lists all installed plugins with enable/disable controls.
 */

import { redirect } from 'next/navigation';
import { Puzzle } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { PluginList } from '@/components/admin/plugin-list';
import { PluginUploadDialog } from '@/components/admin/plugin-upload-dialog';
import { OfficialPluginsGallery } from '@/components/admin/official-plugins-gallery';

export const metadata = {
  title: 'Plugins',
};

export const dynamic = 'force-dynamic';

export default async function AdminPluginsPage() {
  const currentUser = await getCurrentUser();
  if (currentUser.role !== 'ADMIN') {
    redirect('/dashboard?error=unauthorized');
  }

  const plugins = await prisma.plugin.findMany({
    include: {
      _count: {
        select: {
          logs: true,
          jobs: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  // Serialize dates for client component
  const serializedPlugins = plugins.map((p) => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    config: p.config as Record<string, unknown>,
  }));

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Puzzle className="h-8 w-8 text-purple-600 dark:text-purple-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Plugins
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Manage installed plugins, configure settings, and monitor activity.
            </p>
          </div>
        </div>
        <PluginUploadDialog />
      </div>

      <PluginList initialPlugins={serializedPlugins} />

      <OfficialPluginsGallery />
    </div>
  );
}
