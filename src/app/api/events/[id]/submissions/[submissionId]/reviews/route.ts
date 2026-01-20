/**
 * Submission Reviews API
 * 
 * GET /api/events/[id]/submissions/[submissionId]/reviews - List reviews
 * POST /api/events/[id]/submissions/[submissionId]/reviews - Create a review
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getAuthenticatedUser, canReviewEvent, isEventReviewer } from '@/lib/api/auth';
import {
  successResponse,
  createdResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  errorResponse,
  handleApiError,
} from '@/lib/api/response';
import { createReviewSchema } from '@/lib/validations/review';

interface RouteParams {
  params: Promise<{ id: string; submissionId: string }>;
}

// ============================================================================
// GET /api/events/[id]/submissions/[submissionId]/reviews
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
    
    // Check if user can review this event
    const canReview = await canReviewEvent(user, eventId);
    if (!canReview) {
      return forbiddenResponse('You do not have access to reviews for this event');
    }
    
    // Check if submission exists
    const submission = await prisma.submission.findFirst({
      where: {
        id: submissionId,
        eventId,
      },
    });
    
    if (!submission) {
      return notFoundResponse('Submission');
    }
    
    const reviews = await prisma.review.findMany({
      where: { submissionId },
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
      orderBy: { createdAt: 'asc' },
    });
    
    return successResponse(reviews);
  } catch (error) {
    return handleApiError(error);
  }
}

// ============================================================================
// POST /api/events/[id]/submissions/[submissionId]/reviews
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
    
    // Check if user can review this event
    const canReview = await canReviewEvent(user, eventId);
    if (!canReview) {
      return forbiddenResponse('You are not on the review team for this event');
    }
    
    // Check if submission exists
    const submission = await prisma.submission.findFirst({
      where: {
        id: submissionId,
        eventId,
      },
    });
    
    if (!submission) {
      return notFoundResponse('Submission');
    }
    
    // Check if user already reviewed this submission
    const existingReview = await prisma.review.findUnique({
      where: {
        submissionId_reviewerId: {
          submissionId,
          reviewerId: user.id,
        },
      },
    });
    
    if (existingReview) {
      return errorResponse('You have already reviewed this submission', 409);
    }
    
    const body = await request.json();
    const data = createReviewSchema.parse(body);
    
    const review = await prisma.review.create({
      data: {
        submissionId,
        reviewerId: user.id,
        contentScore: data.contentScore,
        presentationScore: data.presentationScore,
        relevanceScore: data.relevanceScore,
        overallScore: data.overallScore,
        privateNotes: data.privateNotes,
        publicNotes: data.publicNotes,
        recommendation: data.recommendation,
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
    
    // Update submission status to UNDER_REVIEW if it's still PENDING
    if (submission.status === 'PENDING') {
      await prisma.submission.update({
        where: { id: submissionId },
        data: {
          status: 'UNDER_REVIEW',
          statusUpdatedAt: new Date(),
        },
      });
    }
    
    return createdResponse(review);
  } catch (error) {
    return handleApiError(error);
  }
}
