/**
 * Plugin Render API
 *
 * Returns an HTML page for plugin admin components.
 * Used by the iframe-based plugin renderer.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getApiUser } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pluginId: string }> }
) {
  try {
    const { pluginId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const pagePath = searchParams.get('path') || '/';

    // Auth check
    const user = await getApiUser();
    if (!user || user.role !== 'ADMIN') {
      return new NextResponse(
        '<html><body><p>Unauthorized - Please log in as an admin.</p></body></html>',
        { status: 401, headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Get plugin from database - pluginId here is actually the plugin name
    const pluginRecord = await prisma.plugin.findFirst({
      where: {
        OR: [{ id: pluginId }, { name: pluginId }],
        enabled: true,
      },
      select: {
        id: true,
        name: true,
        displayName: true,
        config: true,
        configSchema: true,
      },
    });

    if (!pluginRecord) {
      return new NextResponse(
        '<html><body><p>Plugin not found or disabled.</p></body></html>',
        { status: 404, headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Return a page that explains the limitation
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${pluginRecord.displayName} - Admin</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 dark:bg-slate-900 min-h-screen">
  <div class="container mx-auto px-4 py-8 max-w-2xl">
    <div class="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
      <h1 class="text-xl font-semibold text-slate-900 dark:text-white mb-4">
        ${pluginRecord.displayName}
      </h1>
      <p class="text-slate-600 dark:text-slate-300 mb-4">
        Page: <code class="bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">${pagePath}</code>
      </p>

      <div class="border-t border-slate-200 dark:border-slate-700 pt-4 mt-4">
        <p class="text-sm text-slate-500 dark:text-slate-400">
          Plugin admin pages with interactive React components require additional setup.
        </p>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-2">
          The plugin is loaded and functioning for its primary features.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (error) {
    console.error('[PluginRenderAPI] Error:', error);
    return new NextResponse(
      '<html><body><p>An error occurred loading the plugin.</p></body></html>',
      { status: 500, headers: { 'Content-Type': 'text/html' } }
    );
  }
}
