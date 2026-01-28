/**
 * Admin Plugin Detail Page
 *
 * Shows plugin details, configuration, permissions, hooks,
 * job stats, and logs.
 */

import { redirect, notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { PluginDetail } from '@/components/admin/plugin-detail';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const plugin = await prisma.plugin.findUnique({
    where: { id },
    select: { displayName: true },
  });

  return {
    title: plugin ? `${plugin.displayName} - Plugins` : 'Plugin Not Found',
  };
}

export default async function AdminPluginDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const currentUser = await getCurrentUser();
  if (currentUser.role !== 'ADMIN') {
    redirect('/dashboard?error=unauthorized');
  }

  const plugin = await prisma.plugin.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          logs: true,
          jobs: true,
        },
      },
    },
  });

  if (!plugin) {
    notFound();
  }

  // Get job stats
  const jobStats = await prisma.pluginJob.groupBy({
    by: ['status'],
    where: { pluginId: id },
    _count: true,
  });

  const jobStatsMap = jobStats.reduce(
    (acc, stat) => ({ ...acc, [stat.status]: stat._count }),
    {} as Record<string, number>
  );

  // Serialize for client component
  const serializedPlugin = {
    ...plugin,
    createdAt: plugin.createdAt.toISOString(),
    updatedAt: plugin.updatedAt.toISOString(),
    config: plugin.config as Record<string, unknown>,
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <PluginDetail plugin={serializedPlugin} jobStats={jobStatsMap} />
    </div>
  );
}
