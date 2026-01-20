/**
 * Submission Co-Speakers API
 * 
 * GET /api/events/[id]/submissions/[submissionId]/co-speakers - List co-speakers
 * POST /api/events/[id]/submissions/[submissionId]/co-speakers - Add a co-speaker
 * DELETE /api/events/[id]/submissions/[submissionId]/co-speakers - Remove a co-speaker
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getAuthenticatedUser, canReviewEvent } from '@/lib/api/auth';
import {
  successResponse,
  createdResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  noContentResponse,
  errorResponse,
  handleApiError,
} from '@/lib/api/response';
import { createCoSpeakerSchema } from '@/lib/validations/submission';

interface RouteParams {
  params: Promise<{ id: string; submissionId: string }>;
}

// ============================================================================
// GET /api/events/[id]/submissions/[submissionId]/co-speakers
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: eventId, submissionId } = await params;
    const { user, error } = await getAuthenticatedUser();
    
    if (!user) {
      return unauthorizedResponse(error);
    }
    
    // Check if submission exists and user has access
    const submission = await prisma.submission.findFirst({
      where: {
        id: submissionId,
        eventId,
      },
      select: {
        id: true,
        speakerId: true,
      },
    });
    
    if (!submission) {
      return notFoundResponse('Submission');
    }
    
    const isOwner = submission.speakerId === user.id;
    const canReview = await canReviewEvent(user, eventId);
    
    if (!isOwner && !canReview) {
      return forbiddenResponse('You do not have access to this submission');
    }
    
    const coSpeakers = await prisma.coSpeaker.findMany({
      where: { submissionId },
      orderBy: { createdAt: 'asc' },
    });
    
    return successResponse(coSpeakers);
  } catch (error) {
    return handleApiError(error);
  }
}

// ============================================================================
// POST /api/events/[id]/submissions/[submissionId]/co-speakers
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: eventId, submissionId } = await params;
    const { user, error } = await getAuthenticatedUser();
    
    if (!user) {
      return unauthorizedResponse(error);
    }
    
    // Check if submission exists and user is the owner
    const submission = await prisma.submission.findFirst({
      where: {
        id: submissionId,
        eventId,
      },
      select: {
        id: true,
        speakerId: true,
      },
    });
    
    if (!submission) {
      return notFoundResponse('Submission');
    }
    
    if (submission.speakerId !== user.id) {
      return forbiddenResponse('Only the primary speaker can add co-speakers');
    }
    
    const body = await request.json();
    const data = createCoSpeakerSchema.parse(body);
    
    // Check if this email is already linked to a user
    let linkedUserId: string | undefined;
    if (data.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email },
        select: { id: true },
      });
      if (existingUser) {
        linkedUserId = existingUser.id;
      }
    }
    
    const coSpeaker = await prisma.coSpeaker.create({
      data: {
        submissionId,
        name: data.name,
        email: data.email || null,
        bio: data.bio,
        avatarUrl: data.avatarUrl || null,
        isLinked: !!linkedUserId,
        linkedUserId: linkedUserId || null,
      },
    });
    
    return createdResponse(coSpeaker);
  } catch (error) {
    return handleApiError(error);
  }
}

// ============================================================================
// DELETE /api/events/[id]/submissions/[submissionId]/co-speakers
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: eventId, submissionId } = await params;
    const { user, error } = await getAuthenticatedUser();
    
    if (!user) {
      return unauthorizedResponse(error);
    }
    
    const searchParams = request.nextUrl.searchParams;
    const coSpeakerId = searchParams.get('coSpeakerId');
    
    if (!coSpeakerId) {
      return errorResponse('coSpeakerId query parameter is required', 400);
    }
    
    // Check if submission exists and user is the owner
    const submission = await prisma.submission.findFirst({
      where: {
        id: submissionId,
        eventId,
      },
      select: {
        id: true,
        speakerId: true,
      },
    });
    
    if (!submission) {
      return notFoundResponse('Submission');
    }
    
    if (submission.speakerId !== user.id) {
      return forbiddenResponse('Only the primary speaker can remove co-speakers');
    }
    
    // Check if co-speaker exists
    const coSpeaker = await prisma.coSpeaker.findFirst({
      where: {
        id: coSpeakerId,
        submissionId,
      },
    });
    
    if (!coSpeaker) {
      return notFoundResponse('Co-speaker');
    }
    
    await prisma.coSpeaker.delete({
      where: { id: coSpeakerId },
    });
    
    return noContentResponse();
  } catch (error) {
    return handleApiError(error);
  }
}
