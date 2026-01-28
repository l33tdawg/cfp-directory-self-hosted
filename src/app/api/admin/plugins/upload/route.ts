/**
 * Admin Plugin Upload API
 *
 * Upload and install a plugin from a .zip or .tar.gz archive.
 */

import { NextResponse } from 'next/server';
import { getApiUser } from '@/lib/auth';
import { validateArchive, extractPlugin, MAX_ARCHIVE_SIZE } from '@/lib/plugins/archive';
import { syncPluginWithDatabase } from '@/lib/plugins/loader';

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

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const force = formData.get('force') === 'true';

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Check file size
    if (file.size > MAX_ARCHIVE_SIZE) {
      return NextResponse.json(
        { error: `File exceeds maximum size of ${MAX_ARCHIVE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Read the file into a buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate the archive
    const validation = await validateArchive(buffer);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Extract the plugin
    const result = await extractPlugin(buffer, { force });

    if (!result.success) {
      if (result.conflict) {
        return NextResponse.json(
          {
            error: result.error,
            exists: true,
            existingPlugin: result.pluginName,
          },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    // Sync with database (creates record, disabled by default)
    const pluginRecord = await syncPluginWithDatabase(
      validation.manifest!,
      result.pluginPath!
    );

    return NextResponse.json({
      success: true,
      plugin: pluginRecord,
    });
  } catch (error) {
    console.error('Error uploading plugin:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
