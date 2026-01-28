/**
 * Admin Plugin Gallery API
 *
 * Returns the list of official plugins from the configured registry
 * with install status for each.
 */

import { NextResponse } from 'next/server';
import { getApiUser } from '@/lib/auth';
import { getGalleryWithStatus } from '@/lib/plugins/gallery';

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('refresh') === 'true';

    const result = await getGalleryWithStatus(forceRefresh);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching plugin gallery:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch plugin registry',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 502 }
    );
  }
}
