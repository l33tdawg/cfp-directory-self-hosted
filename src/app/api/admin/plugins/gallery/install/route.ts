/**
 * Admin Plugin Gallery Install API
 *
 * Installs a plugin from the official gallery registry.
 * Client sends only pluginName — the download URL is resolved server-side
 * from the cached registry for security.
 */

import { NextResponse } from 'next/server';
import { getApiUser } from '@/lib/auth';
import { fetchGalleryRegistry } from '@/lib/plugins/gallery';
import { validateArchive, extractPlugin } from '@/lib/plugins/archive';
import { syncPluginWithDatabase, loadSinglePlugin } from '@/lib/plugins/loader';

export async function POST(request: Request) {
  try {
    const user = await getApiUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { pluginName } = body;

    if (!pluginName || typeof pluginName !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: pluginName' },
        { status: 400 }
      );
    }

    // Look up the plugin in the registry (use cache)
    const registry = await fetchGalleryRegistry();

    const galleryPlugin = registry.plugins.find((p) => p.name === pluginName);
    if (!galleryPlugin) {
      return NextResponse.json(
        { error: `Plugin "${pluginName}" not found in registry` },
        { status: 404 }
      );
    }

    // Download the archive from the server-resolved URL
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);

    let archiveBuffer: Buffer;
    try {
      const downloadResponse = await fetch(galleryPlugin.downloadUrl, {
        signal: controller.signal,
      });

      if (!downloadResponse.ok) {
        return NextResponse.json(
          { error: `Failed to download plugin: HTTP ${downloadResponse.status}` },
          { status: 502 }
        );
      }

      const arrayBuffer = await downloadResponse.arrayBuffer();
      archiveBuffer = Buffer.from(arrayBuffer);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Plugin download timed out' },
          { status: 504 }
        );
      }
      return NextResponse.json(
        { error: `Failed to download plugin: ${err instanceof Error ? err.message : String(err)}` },
        { status: 502 }
      );
    } finally {
      clearTimeout(timeout);
    }

    // Validate the archive
    const validation = await validateArchive(archiveBuffer);
    if (!validation.valid) {
      return NextResponse.json(
        { error: `Invalid plugin archive: ${validation.error}` },
        { status: 400 }
      );
    }

    // Extract with force=true for safe overwrite during updates
    const result = await extractPlugin(archiveBuffer, { force: true });
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    // Sync with database
    const pluginRecord = await syncPluginWithDatabase(
      validation.manifest!,
      result.pluginPath!
    );

    // Load the plugin into the registry so it's available immediately
    await loadSinglePlugin(validation.manifest!.name);

    return NextResponse.json({
      success: true,
      plugin: pluginRecord,
    });
  } catch (error) {
    console.error('Error installing gallery plugin:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
