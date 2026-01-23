/**
 * Submission Messages API
 * 
 * GET /api/events/[id]/submissions/[submissionId]/messages - List messages
 * POST /api/events/[id]/submissions/[submissionId]/messages - Send a message
 * PATCH /api/events/[id]/submissions/[submissionId]/messages - Mark messages as read
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getAuthenticatedUser, canManageEvent, canReviewEvent } from '@/lib/api/auth';
import {
  successResponse,
  createdResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  handleApiError,
} from '@/lib/api/response';
import { createMessageSchema, markReadSchema } from '@/lib/validations/message';
import { sendMessageSentWebhook, sendMessageReadWebhook } from '@/lib/federation';

interface RouteParams {
  params: Promise<{ id: string; submissionId: string }>;
}

// ============================================================================
// GET /api/events/[id]/submissions/[submissionId]/messages
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
    
    // Check if submission exists
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
    
    // Check permissions - speaker, event manager, or reviewer
    const isOwner = submission.speakerId === user.id;
    const canManage = await canManageEvent(user, eventId);
    const canReview = await canReviewEvent(user, eventId);
    
    if (!isOwner && !canManage && !canReview) {
      return forbiddenResponse('You do not have access to messages for this submission');
    }
    
    const messages = await prisma.message.findMany({
      where: {
        submissionId,
        parentId: null, // Only get top-level messages
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        replies: {
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    return successResponse(messages);
  } catch (error) {
    return handleApiError(error);
  }
}

// ============================================================================
// POST /api/events/[id]/submissions/[submissionId]/messages
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
    
    // Check if submission exists and get event settings
    const submission = await prisma.submission.findFirst({
      where: {
        id: submissionId,
        eventId,
      },
      select: {
        id: true,
        speakerId: true,
        event: {
          select: {
            allowReviewerMessages: true,
          },
        },
      },
    });
    
    if (!submission) {
      return notFoundResponse('Submission');
    }
    
    // Check permissions - speaker, event manager, or reviewer
    const isOwner = submission.speakerId === user.id;
    const canManage = await canManageEvent(user, eventId);
    const canReview = await canReviewEvent(user, eventId);
    
    // Reviewers can only message if event allows it
    const isReviewerOnly = canReview && !canManage && !isOwner;
    if (isReviewerOnly && !submission.event.allowReviewerMessages) {
      return forbiddenResponse('Reviewers are not allowed to message speakers for this event');
    }
    
    if (!isOwner && !canManage && !canReview) {
      return forbiddenResponse('You do not have permission to send messages');
    }
    
    const body = await request.json();
    const data = createMessageSchema.parse(body);
    
    // Determine sender type
    let senderType: 'SPEAKER' | 'ORGANIZER' | 'REVIEWER' = 'ORGANIZER';
    if (isOwner) {
      senderType = 'SPEAKER';
    } else if (canManage) {
      senderType = 'ORGANIZER';
    } else if (canReview) {
      senderType = 'REVIEWER';
    }
    
    // Validate parent message if replying
    if (data.parentId) {
      const parentMessage = await prisma.message.findFirst({
        where: {
          id: data.parentId,
          submissionId,
        },
      });
      
      if (!parentMessage) {
        return notFoundResponse('Parent message');
      }
    }
    
    const message = await prisma.message.create({
      data: {
        submissionId,
        senderId: user.id,
        senderType,
        subject: data.subject,
        body: data.body,
        parentId: data.parentId,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        submission: {
          select: {
            isFederated: true,
          },
        },
      },
    });
    
    // Send webhook for organizer messages on federated submissions (fire and forget)
    if (message.submission.isFederated && senderType === 'ORGANIZER') {
      sendMessageSentWebhook(message.id).catch(err => {
        console.error('Failed to send submission.message_sent webhook:', err);
      });
    }
    
    return createdResponse(message);
  } catch (error) {
    return handleApiError(error);
  }
}

// ============================================================================
// PATCH /api/events/[id]/submissions/[submissionId]/messages - Mark as read
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
    
    // Check if submission exists
    const submission = await prisma.submission.findFirst({
      where: {
        id: submissionId,
        eventId,
      },
      select: {
        id: true,
        speakerId: true,
        isFederated: true,
      },
    });
    
    if (!submission) {
      return notFoundResponse('Submission');
    }
    
    // Check permissions - speaker, event manager, or reviewer
    const isOwner = submission.speakerId === user.id;
    const canManage = await canManageEvent(user, eventId);
    const canReview = await canReviewEvent(user, eventId);
    
    if (!isOwner && !canManage && !canReview) {
      return forbiddenResponse('You do not have access to messages for this submission');
    }
    
    const body = await request.json();
    const data = markReadSchema.parse(body);
    
    // Mark messages as read
    // Only mark messages not sent by the current user
    const result = await prisma.message.updateMany({
      where: {
        id: { in: data.messageIds },
        submissionId,
        senderId: { not: user.id },
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
    
    // Send webhook for federated submissions if messages were marked as read
    if (result.count > 0 && submission.isFederated) {
      // Send webhook for each message that was marked as read
      for (const messageId of data.messageIds) {
        sendMessageReadWebhook(messageId).catch(err => {
          console.error('Failed to send submission.message_read webhook:', err);
        });
      }
    }
    
    return successResponse({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
