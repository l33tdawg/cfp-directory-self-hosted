/**
 * Single Submission API
 * 
 * GET /api/events/[id]/submissions/[submissionId] - Get submission details
 * PATCH /api/events/[id]/submissions/[submissionId] - Update submission
 * DELETE /api/events/[id]/submissions/[submissionId] - Withdraw/delete submission
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getAuthenticatedUser, canManageEvent, canReviewEvent } from '@/lib/api/auth';
import {
  successResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  noContentResponse,
  errorResponse,
  handleApiError,
} from '@/lib/api/response';
import { updateSubmissionSchema, updateSubmissionStatusSchema } from '@/lib/validations/submission';
import { sendStatusUpdatedWebhook } from '@/lib/federation';
import { logActivity } from '@/lib/activity-logger';
import { getClientIdentifier } from '@/lib/rate-limit';
import { decryptPiiFields, CO_SPEAKER_PII_FIELDS } from '@/lib/security/encryption';

interface RouteParams {
  params: Promise<{ id: string; submissionId: string }>;
}

// Helper to decrypt co-speaker PII in a submission response
function decryptCoSpeakersInSubmission<T extends { coSpeakers?: unknown[] }>(submission: T): T {
  if (!submission.coSpeakers || submission.coSpeakers.length === 0) {
    return submission;
  }
  return {
    ...submission,
    coSpeakers: submission.coSpeakers.map(cs => 
      decryptPiiFields(cs as unknown as Record<string, unknown>, CO_SPEAKER_PII_FIELDS)
    ),
  };
}

// ============================================================================
// GET /api/events/[id]/submissions/[submissionId] - Get submission details
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
    
    const submission = await prisma.submission.findFirst({
      where: {
        id: submissionId,
        eventId,
      },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        speaker: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        track: true,
        format: true,
        materials: true,
        coSpeakers: true,
        reviews: {
          select: {
            id: true,
            overallScore: true,
            recommendation: true,
            publicNotes: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
    });
    
    if (!submission) {
      return notFoundResponse('Submission');
    }
    
    // Check permissions
    const isOwner = submission.speakerId === user.id;
    const canReview = await canReviewEvent(user, eventId);
    
    if (!isOwner && !canReview) {
      return forbiddenResponse('You do not have permission to view this submission');
    }
    
    // Decrypt co-speaker PII
    const decryptedSubmission = decryptCoSpeakersInSubmission(submission);
    
    // Hide private review data from speakers
    if (!canReview) {
      return successResponse({
        ...decryptedSubmission,
        reviews: decryptedSubmission.reviews.map(r => ({
          ...r,
          overallScore: undefined,
          recommendation: undefined,
        })),
      });
    }
    
    return successResponse(decryptedSubmission);
  } catch (error) {
    return handleApiError(error);
  }
}

// ============================================================================
// PATCH /api/events/[id]/submissions/[submissionId] - Update submission
// ============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: eventId, submissionId } = await params;
    const { user, error } = await getAuthenticatedUser();
    
    if (!user) {
      return unauthorizedResponse(error);
    }
    
    const submission = await prisma.submission.findFirst({
      where: {
        id: submissionId,
        eventId,
      },
    });
    
    if (!submission) {
      return notFoundResponse('Submission');
    }
    
    const body = await request.json();
    const isOwner = submission.speakerId === user.id;
    const canManage = await canManageEvent(user, eventId);
    
    // Check if updating status
    if (body.status !== undefined) {
      // Only event managers can change status
      if (!canManage) {
        return forbiddenResponse('Only event organizers can change submission status');
      }
      
      const statusData = updateSubmissionStatusSchema.parse(body);
      
      const previousStatus = submission.status;
      
      const updated = await prisma.submission.update({
        where: { id: submissionId },
        data: {
          status: statusData.status,
          statusUpdatedAt: new Date(),
        },
      });
      
      // Log the status change for audit trail
      await logActivity({
        userId: user.id,
        action: 'SUBMISSION_STATUS_CHANGED',
        entityType: 'Submission',
        entityId: submissionId,
        metadata: {
          eventId,
          previousStatus,
          newStatus: statusData.status,
          changedBy: user.id,
        },
        ipAddress: getClientIdentifier(request),
      });
      
      // Send webhook for federated submissions (fire and forget)
      // Include feedback (public notes) if this is an accept/reject decision
      if (submission.isFederated && ['ACCEPTED', 'REJECTED', 'WAITLISTED'].includes(statusData.status)) {
        // Get the public feedback from reviews if any
        const reviews = await prisma.review.findMany({
          where: { submissionId },
          select: { publicNotes: true },
        });
        const feedback = reviews
          .map(r => r.publicNotes)
          .filter((n): n is string => !!n)
          .join('\n\n');
        
        sendStatusUpdatedWebhook(submissionId, statusData.status, feedback || undefined).catch(err => {
          console.error('Failed to send submission.status_updated webhook:', err);
        });
      }
      
      return successResponse(updated);
    }
    
    // Regular update - owner can edit, managers can also edit
    if (!isOwner && !canManage) {
      return forbiddenResponse('You do not have permission to edit this submission');
    }
    
    // Speakers can only edit pending submissions
    if (isOwner && !canManage && submission.status !== 'PENDING') {
      return errorResponse('You can only edit pending submissions', 400);
    }
    
    const data = updateSubmissionSchema.parse(body);
    
    // Verify track and format belong to this event if specified
    if (data.trackId) {
      const track = await prisma.eventTrack.findFirst({
        where: { id: data.trackId, eventId },
      });
      if (!track) {
        return errorResponse('Invalid track for this event', 400);
      }
    }
    
    if (data.formatId) {
      const format = await prisma.eventFormat.findFirst({
        where: { id: data.formatId, eventId },
      });
      if (!format) {
        return errorResponse('Invalid format for this event', 400);
      }
    }
    
    const updated = await prisma.submission.update({
      where: { id: submissionId },
      data: {
        ...(data.trackId !== undefined && { trackId: data.trackId }),
        ...(data.formatId !== undefined && { formatId: data.formatId }),
        ...(data.title !== undefined && { title: data.title }),
        ...(data.abstract !== undefined && { abstract: data.abstract }),
        ...(data.outline !== undefined && { outline: data.outline }),
        ...(data.targetAudience !== undefined && { targetAudience: data.targetAudience }),
        ...(data.prerequisites !== undefined && { prerequisites: data.prerequisites }),
      },
      include: {
        track: true,
        format: true,
        coSpeakers: true,
      },
    });
    
    // Decrypt co-speaker PII before returning
    return successResponse(decryptCoSpeakersInSubmission(updated));
  } catch (error) {
    return handleApiError(error);
  }
}

// ============================================================================
// DELETE /api/events/[id]/submissions/[submissionId] - Delete/withdraw submission
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
    
    const submission = await prisma.submission.findFirst({
      where: {
        id: submissionId,
        eventId,
      },
    });
    
    if (!submission) {
      return notFoundResponse('Submission');
    }
    
    const isOwner = submission.speakerId === user.id;
    const canManage = await canManageEvent(user, eventId);
    
    if (!isOwner && !canManage) {
      return forbiddenResponse('You do not have permission to delete this submission');
    }
    
    // Speakers withdraw (status change), managers can delete
    if (isOwner && !canManage) {
      // Withdraw the submission
      await prisma.submission.update({
        where: { id: submissionId },
        data: {
          status: 'WITHDRAWN',
          statusUpdatedAt: new Date(),
        },
      });
    } else {
      // Actually delete
      await prisma.submission.delete({
        where: { id: submissionId },
      });
    }
    
    return noContentResponse();
  } catch (error) {
    return handleApiError(error);
  }
}
