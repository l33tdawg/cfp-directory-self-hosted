/**
 * Review Discussions API
 * 
 * GET /api/events/[id]/submissions/[submissionId]/reviews/[reviewId]/discussions - List discussions
 * POST /api/events/[id]/submissions/[submissionId]/reviews/[reviewId]/discussions - Add comment
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
  handleApiError,
} from '@/lib/api/response';
import { createDiscussionSchema } from '@/lib/validations/review';

interface RouteParams {
  params: Promise<{ id: string; submissionId: string; reviewId: string }>;
}

// ============================================================================
// GET /api/events/[id]/submissions/[submissionId]/reviews/[reviewId]/discussions
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: eventId, submissionId, reviewId } = await params;
    const { user, error } = await getAuthenticatedUser();
    
    if (!user) {
      return unauthorizedResponse(error);
    }
    
    // Check if user can review this event
    const canReview = await canReviewEvent(user, eventId);
    if (!canReview) {
      return forbiddenResponse('You do not have access to review discussions');
    }
    
    // Check if review exists
    const review = await prisma.review.findFirst({
      where: {
        id: reviewId,
        submissionId,
        submission: { eventId },
      },
    });
    
    if (!review) {
      return notFoundResponse('Review');
    }
    
    const discussions = await prisma.reviewDiscussion.findMany({
      where: { reviewId },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    
    return successResponse(discussions);
  } catch (error) {
    return handleApiError(error);
  }
}

// ============================================================================
// POST /api/events/[id]/submissions/[submissionId]/reviews/[reviewId]/discussions
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: eventId, submissionId, reviewId } = await params;
    const { user, error } = await getAuthenticatedUser();
    
    if (!user) {
      return unauthorizedResponse(error);
    }
    
    // Check if user can review this event
    const canReview = await canReviewEvent(user, eventId);
    if (!canReview) {
      return forbiddenResponse('You must be on the review team to participate in discussions');
    }
    
    // Check if review exists
    const review = await prisma.review.findFirst({
      where: {
        id: reviewId,
        submissionId,
        submission: { eventId },
      },
    });
    
    if (!review) {
      return notFoundResponse('Review');
    }
    
    const body = await request.json();
    const data = createDiscussionSchema.parse(body);
    
    const discussion = await prisma.reviewDiscussion.create({
      data: {
        reviewId,
        authorId: user.id,
        content: data.content,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });
    
    return createdResponse(discussion);
  } catch (error) {
    return handleApiError(error);
  }
}
