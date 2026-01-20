/**
 * Individual Talk API Routes
 * 
 * GET: Get a specific talk
 * PATCH: Update a talk
 * DELETE: Delete a talk
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { updateTalkSchema } from '@/lib/validations/talk';
import type { TalkType } from '@prisma/client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/talks/[id]
 * Get a specific talk by ID
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    const talk = await prisma.talk.findUnique({
      where: { id },
      include: {
        submissions: {
          select: {
            id: true,
            eventId: true,
            status: true,
            createdAt: true,
            event: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { submissions: true },
        },
      },
    });

    if (!talk) {
      return NextResponse.json(
        { error: 'Talk not found' },
        { status: 404 }
      );
    }

    // Ensure user owns this talk
    if (talk.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    return NextResponse.json({ talk });
  } catch (error) {
    console.error('Error fetching talk:', error);
    return NextResponse.json(
      { error: 'Failed to fetch talk' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/talks/[id]
 * Update a talk
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Check talk exists and user owns it
    const existingTalk = await prisma.talk.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!existingTalk) {
      return NextResponse.json(
        { error: 'Talk not found' },
        { status: 404 }
      );
    }

    if (existingTalk.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validationResult = updateTalkSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {};
    
    if (data.title !== undefined) updateData.title = data.title;
    if (data.abstract !== undefined) updateData.abstract = data.abstract;
    if (data.description !== undefined) updateData.description = data.description || null;
    if (data.outline !== undefined) updateData.outline = data.outline || null;
    if (data.type !== undefined) updateData.type = data.type as TalkType;
    if (data.durationMin !== undefined) updateData.durationMin = data.durationMin;
    if (data.targetAudience !== undefined) updateData.targetAudience = data.targetAudience;
    if (data.prerequisites !== undefined) updateData.prerequisites = data.prerequisites || null;
    if (data.speakerNotes !== undefined) updateData.speakerNotes = data.speakerNotes || null;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.isArchived !== undefined) updateData.isArchived = data.isArchived;

    const talk = await prisma.talk.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      talk,
      message: 'Talk updated successfully',
    });
  } catch (error) {
    console.error('Error updating talk:', error);
    return NextResponse.json(
      { error: 'Failed to update talk' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/talks/[id]
 * Delete a talk (only if not linked to any submissions)
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Check talk exists and user owns it
    const existingTalk = await prisma.talk.findUnique({
      where: { id },
      select: { 
        userId: true,
        _count: { select: { submissions: true } },
      },
    });

    if (!existingTalk) {
      return NextResponse.json(
        { error: 'Talk not found' },
        { status: 404 }
      );
    }

    if (existingTalk.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Check if talk has submissions
    if (existingTalk._count.submissions > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete talk with submissions',
          message: 'This talk is linked to submissions. Archive it instead.',
          submissionCount: existingTalk._count.submissions,
        },
        { status: 400 }
      );
    }

    await prisma.talk.delete({
      where: { id },
    });

    return NextResponse.json({
      message: 'Talk deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting talk:', error);
    return NextResponse.json(
      { error: 'Failed to delete talk' },
      { status: 500 }
    );
  }
}
