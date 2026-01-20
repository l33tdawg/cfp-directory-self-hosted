/**
 * Talks Library API Routes
 * 
 * GET: List user's talks with filtering
 * POST: Create a new talk
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { 
  createTalkSchema, 
  talkFiltersSchema 
} from '@/lib/validations/talk';
import type { TalkType } from '@prisma/client';

/**
 * GET /api/talks
 * List user's talks with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const filtersResult = talkFiltersSchema.safeParse({
      search: searchParams.get('search') ?? undefined,
      type: searchParams.get('type') ?? undefined,
      includeArchived: searchParams.get('includeArchived') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
      offset: searchParams.get('offset') ?? undefined,
    });

    if (!filtersResult.success) {
      return NextResponse.json(
        { error: 'Invalid filters', details: filtersResult.error.issues },
        { status: 400 }
      );
    }

    const filters = filtersResult.data;

    // Build where clause
    const where: {
      userId: string;
      isArchived?: boolean;
      type?: TalkType;
      OR?: Array<{ title: { contains: string; mode: 'insensitive' } } | { abstract: { contains: string; mode: 'insensitive' } }>;
    } = {
      userId: session.user.id,
    };

    if (!filters.includeArchived) {
      where.isArchived = false;
    }

    if (filters.type) {
      where.type = filters.type as TalkType;
    }

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { abstract: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    // Get talks with count
    const [talks, total] = await Promise.all([
      prisma.talk.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: filters.limit,
        skip: filters.offset,
        include: {
          _count: {
            select: { submissions: true },
          },
        },
      }),
      prisma.talk.count({ where }),
    ]);

    return NextResponse.json({
      talks,
      pagination: {
        total,
        limit: filters.limit,
        offset: filters.offset,
        hasMore: filters.offset + talks.length < total,
      },
    });
  } catch (error) {
    console.error('Error fetching talks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch talks' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/talks
 * Create a new talk
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validationResult = createTalkSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    const talk = await prisma.talk.create({
      data: {
        userId: session.user.id,
        title: data.title,
        abstract: data.abstract,
        description: data.description || null,
        outline: data.outline || null,
        type: data.type as TalkType,
        durationMin: data.durationMin,
        targetAudience: data.targetAudience,
        prerequisites: data.prerequisites || null,
        speakerNotes: data.speakerNotes || null,
        tags: data.tags,
      },
    });

    return NextResponse.json(
      { talk, message: 'Talk created successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating talk:', error);
    return NextResponse.json(
      { error: 'Failed to create talk' },
      { status: 500 }
    );
  }
}
