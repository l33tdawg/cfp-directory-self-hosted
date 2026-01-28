/**
 * Admin Plugins API
 *
 * List all plugins with optional filtering.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getApiUser } from '@/lib/auth';

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
    const search = searchParams.get('search');
    const enabled = searchParams.get('enabled');

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { displayName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (enabled === 'true') {
      where.enabled = true;
    } else if (enabled === 'false') {
      where.enabled = false;
    }

    const plugins = await prisma.plugin.findMany({
      where,
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

    return NextResponse.json({ plugins });
  } catch (error) {
    console.error('Error fetching plugins:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
