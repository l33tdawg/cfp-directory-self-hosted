/**
 * Single Review API
 * 
 * GET /api/events/[id]/submissions/[submissionId]/reviews/[reviewId] - Get review
 * PATCH /api/events/[id]/submissions/[submissionId]/reviews/[reviewId] - Update review
 * DELETE /api/events/[id]/submissions/[submissionId]/reviews/[reviewId] - Delete review
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getAuthenticatedUser, canReviewEvent, canManageEvent } from '@/lib/api/auth';
import {
  successResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  noContentResponse,
  handleApiError,
} from '@/lib/api/response';
import { updateReviewSchema } from '@/lib/validations/review';

interface RouteParams {
  params: Promise<{ id: string; submissionId: string; reviewId: string }>;
}

// ============================================================================
// GET /api/events/[id]/submissions/[submissionId]/reviews/[reviewId]
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
      return forbiddenResponse('You do not have access to reviews for this event');
    }
    
    const review = await prisma.review.findFirst({
      where: {
        id: reviewId,
        submissionId,
        submission: { eventId },
      },
      include: {
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        discussions: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    
    if (!review) {
      return notFoundResponse('Review');
    }
    
    return successResponse(review);
  } catch (error) {
    return handleApiError(error);
  }
}

// ============================================================================
// PATCH /api/events/[id]/submissions/[submissionId]/reviews/[reviewId]
// ============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: eventId, submissionId, reviewId } = await params;
    const { user, error } = await getAuthenticatedUser();
    
    if (!user) {
      return unauthorizedResponse(error);
    }
    
    // Find the review
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
    
    // Only the reviewer or event manager can update
    const canManage = await canManageEvent(user, eventId);
    if (review.reviewerId !== user.id && !canManage) {
      return forbiddenResponse('You can only edit your own reviews');
    }
    
    const body = await request.json();
    const data = updateReviewSchema.parse(body);
    
    const updated = await prisma.review.update({
      where: { id: reviewId },
      data: {
        ...(data.contentScore !== undefined && { contentScore: data.contentScore }),
        ...(data.presentationScore !== undefined && { presentationScore: data.presentationScore }),
        ...(data.relevanceScore !== undefined && { relevanceScore: data.relevanceScore }),
        ...(data.overallScore !== undefined && { overallScore: data.overallScore }),
        ...(data.privateNotes !== undefined && { privateNotes: data.privateNotes }),
        ...(data.publicNotes !== undefined && { publicNotes: data.publicNotes }),
        ...(data.recommendation !== undefined && { recommendation: data.recommendation }),
      },
      include: {
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });
    
    return successResponse(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

// ============================================================================
// DELETE /api/events/[id]/submissions/[submissionId]/reviews/[reviewId]
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: eventId, submissionId, reviewId } = await params;
    const { user, error } = await getAuthenticatedUser();
    
    if (!user) {
      return unauthorizedResponse(error);
    }
    
    // Find the review
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
    
    // Only the reviewer or event manager can delete
    const canManage = await canManageEvent(user, eventId);
    if (review.reviewerId !== user.id && !canManage) {
      return forbiddenResponse('You can only delete your own reviews');
    }
    
    await prisma.review.delete({
      where: { id: reviewId },
    });
    
    return noContentResponse();
  } catch (error) {
    return handleApiError(error);
  }
}
