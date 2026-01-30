/**
 * Admin Plugin Gallery Install API
 *
 * Installs a plugin from the official gallery registry.
 * Client sends only pluginName — the download URL is resolved server-side
 * from the cached registry for security.
 * 
 * SECURITY:
 * - Download URLs are validated against an allowlist of trusted hosts
 * - Downloads are size-limited to prevent memory exhaustion
 * - Redirects are disabled to prevent SSRF via redirect chains
 * - Only HTTPS URLs are allowed
 */

import { NextResponse } from 'next/server';
import { getApiUser } from '@/lib/auth';
import { fetchGalleryRegistry } from '@/lib/plugins/gallery';
import { validateArchive, extractPlugin } from '@/lib/plugins/archive';
import { syncPluginWithDatabase, reloadPlugin } from '@/lib/plugins/loader';

// =============================================================================
// SECURITY: Trusted download hosts
// =============================================================================

/**
 * Allowlist of trusted hosts for plugin downloads.
 * SECURITY: Only download from these trusted sources to prevent SSRF.
 */
const TRUSTED_DOWNLOAD_HOSTS = [
  'github.com',
  'raw.githubusercontent.com',
  'objects.githubusercontent.com',
  'codeload.github.com',
];

/**
 * Maximum allowed download size (50MB)
 * SECURITY: Prevents memory exhaustion from malicious large responses
 */
const MAX_DOWNLOAD_SIZE = 50 * 1024 * 1024;

/**
 * Validate that a download URL is safe to fetch.
 * SECURITY: Prevents SSRF and unsafe downloads.
 */
function validateDownloadUrl(urlString: string): { valid: boolean; error?: string } {
  try {
    const url = new URL(urlString);
    
    // SECURITY: Only allow HTTPS
    if (url.protocol !== 'https:') {
      return { valid: false, error: 'Download URL must use HTTPS' };
    }
    
    // SECURITY: Check against allowlist
    if (!TRUSTED_DOWNLOAD_HOSTS.includes(url.hostname)) {
      return { 
        valid: false, 
        error: `Download host "${url.hostname}" is not in the trusted hosts list` 
      };
    }
    
    // SECURITY: Prevent IP addresses (could be internal network)
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /^\[.*\]$/;
    if (ipv4Regex.test(url.hostname) || ipv6Regex.test(url.hostname)) {
      return { valid: false, error: 'IP addresses are not allowed in download URLs' };
    }
    
    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid download URL format' };
  }
}

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
    const { pluginName, acknowledgeCodeExecution } = body;

    if (!pluginName || typeof pluginName !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: pluginName' },
        { status: 400 }
      );
    }

    // SECURITY: Require explicit acknowledgement of arbitrary code execution risk
    if (acknowledgeCodeExecution !== true) {
      return NextResponse.json(
        { 
          error: 'Plugin installation requires acknowledgement of security risk',
          requiresAcknowledgement: true,
          securityWarning: 'Installing this plugin will allow it to execute arbitrary code ' +
            'within your server. Even gallery plugins have full access to the database, ' +
            'environment variables, and file system. The permission system is for UX guidance only. ' +
            'Set acknowledgeCodeExecution=true in request body to proceed.',
        },
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

    // SECURITY: Validate download URL before fetching
    const urlValidation = validateDownloadUrl(galleryPlugin.downloadUrl);
    if (!urlValidation.valid) {
      console.error('[PluginInstall] Invalid download URL:', galleryPlugin.downloadUrl, urlValidation.error);
      return NextResponse.json(
        { error: `Plugin download URL is not allowed: ${urlValidation.error}` },
        { status: 400 }
      );
    }

    // Download the archive from the server-resolved URL
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);

    let archiveBuffer: Buffer;
    try {
      const downloadResponse = await fetch(galleryPlugin.downloadUrl, {
        signal: controller.signal,
        // SECURITY: Disable redirects to prevent SSRF via redirect chains
        redirect: 'error',
      });

      if (!downloadResponse.ok) {
        return NextResponse.json(
          { error: `Failed to download plugin: HTTP ${downloadResponse.status}` },
          { status: 502 }
        );
      }

      // SECURITY: Check Content-Length before downloading
      const contentLength = downloadResponse.headers.get('content-length');
      if (contentLength && parseInt(contentLength, 10) > MAX_DOWNLOAD_SIZE) {
        return NextResponse.json(
          { error: `Plugin archive exceeds maximum size (${Math.round(MAX_DOWNLOAD_SIZE / 1024 / 1024)}MB)` },
          { status: 400 }
        );
      }

      // SECURITY: Stream and limit download size to prevent memory exhaustion
      const reader = downloadResponse.body?.getReader();
      if (!reader) {
        return NextResponse.json(
          { error: 'Failed to read plugin download stream' },
          { status: 502 }
        );
      }

      const chunks: Uint8Array[] = [];
      let totalSize = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        totalSize += value.length;
        if (totalSize > MAX_DOWNLOAD_SIZE) {
          reader.cancel();
          return NextResponse.json(
            { error: `Plugin archive exceeds maximum size (${Math.round(MAX_DOWNLOAD_SIZE / 1024 / 1024)}MB)` },
            { status: 400 }
          );
        }
        
        chunks.push(value);
      }

      archiveBuffer = Buffer.concat(chunks);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Plugin download timed out' },
          { status: 504 }
        );
      }
      // SECURITY: Handle redirect errors specifically
      if (err instanceof TypeError && err.message.includes('redirect')) {
        return NextResponse.json(
          { error: 'Plugin download URL redirected (not allowed for security)' },
          { status: 400 }
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

    // Load or reload the plugin into the registry so it's available immediately
    // reloadPlugin handles both new installs and updates
    await reloadPlugin(validation.manifest!.name);

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
