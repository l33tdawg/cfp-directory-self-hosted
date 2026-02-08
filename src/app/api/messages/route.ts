/**
 * Unified Messages API
 *
 * POST /api/messages - Send a message (accepts `message` field, maps to `body`)
 * GET  /api/messages?submissionId=... - List messages for a submission
 *
 * This endpoint provides a platform-agnostic API that the AI Paper Reviewer
 * plugin uses for "Send Feedback to Speaker". The main platform already has
 * this route; this brings parity to self-hosted.
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { getAuthenticatedUser, canManageEvent, canReviewEvent } from '@/lib/api/auth';
import {
  successResponse,
  createdResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  badRequestResponse,
  handleApiError,
} from '@/lib/api/response';
import { sendMessageSentWebhook } from '@/lib/federation';
import { sendNewMessageEmail } from '@/lib/email/email-service';
import { logActivity } from '@/lib/activity-logger';

// Inline schema — accepts `message` (main platform field name) mapped to DB `body`
const createMessageBodySchema = z.object({
  submissionId: z.string().cuid(),
  subject: z.string().max(200).optional(),
  message: z.string().min(1, 'Message is required').max(10000),
  parentId: z.string().cuid().optional(),
});

// ============================================================================
// POST /api/messages
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (!user) {
      return unauthorizedResponse(error);
    }

    const body = await request.json();
    const data = createMessageBodySchema.parse(body);

    // Look up submission with event details and speaker info
    const submission = await prisma.submission.findUnique({
      where: { id: data.submissionId },
      select: {
        id: true,
        title: true,
        speakerId: true,
        eventId: true,
        isFederated: true,
        event: {
          select: {
            name: true,
            slug: true,
            allowReviewerMessages: true,
          },
        },
      },
    });

    if (!submission) {
      return notFoundResponse('Submission');
    }

    // Check permissions
    const isOwner = submission.speakerId === user.id;
    const canManage = await canManageEvent(user, submission.eventId);
    const canReview = await canReviewEvent(user, submission.eventId);

    // Reviewers gated by allowReviewerMessages
    const isReviewerOnly = canReview && !canManage && !isOwner;
    if (isReviewerOnly && !submission.event.allowReviewerMessages) {
      return forbiddenResponse('Reviewers are not allowed to message speakers for this event');
    }

    if (!isOwner && !canManage && !canReview) {
      return forbiddenResponse('You do not have permission to send messages');
    }

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
          submissionId: data.submissionId,
        },
      });
      if (!parentMessage) {
        return notFoundResponse('Parent message');
      }
    }

    // Create message — map `message` field to `body` column
    const message = await prisma.message.create({
      data: {
        submissionId: data.submissionId,
        senderId: user.id,
        senderType,
        subject: data.subject,
        body: data.message,
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
      },
    });

    // Send webhook for organizer messages on federated submissions (fire and forget)
    if (submission.isFederated && senderType === 'ORGANIZER') {
      sendMessageSentWebhook(message.id).catch(err => {
        console.error('Failed to send submission.message_sent webhook:', err);
      });
    }

    // Email notification (non-fatal)
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
      const messageUrl = `${appUrl}/events/${submission.event.slug}/submissions/${submission.id}`;
      const senderName = user.name || user.email;
      const messagePreview = data.message;

      if (senderType === 'ORGANIZER' || senderType === 'REVIEWER') {
        // Notify the speaker
        const speaker = await prisma.user.findUnique({
          where: { id: submission.speakerId },
          select: { email: true, name: true },
        });
        if (speaker?.email) {
          await sendNewMessageEmail(
            speaker.email,
            speaker.name || 'Speaker',
            senderName,
            submission.event.name,
            submission.title,
            messagePreview,
            messageUrl
          );
        }
      } else if (senderType === 'SPEAKER') {
        // Notify event managers — find the first LEAD on the review team
        const lead = await prisma.reviewTeamMember.findFirst({
          where: { eventId: submission.eventId, role: 'LEAD' },
          include: { user: { select: { email: true, name: true } } },
        });
        if (lead?.user?.email) {
          await sendNewMessageEmail(
            lead.user.email,
            lead.user.name || 'Organizer',
            senderName,
            submission.event.name,
            submission.title,
            messagePreview,
            messageUrl
          );
        }
      }
    } catch (emailErr) {
      console.warn('Failed to send message notification email:', emailErr);
    }

    // Log activity
    logActivity({
      userId: user.id,
      action: 'MESSAGE_SENT',
      entityType: 'Message',
      entityId: message.id,
      metadata: {
        submissionId: data.submissionId,
        senderType,
      },
    });

    return createdResponse({ id: message.id });
  } catch (error) {
    return handleApiError(error);
  }
}

// ============================================================================
// GET /api/messages?submissionId=...
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (!user) {
      return unauthorizedResponse(error);
    }

    const submissionId = request.nextUrl.searchParams.get('submissionId');
    if (!submissionId) {
      return badRequestResponse('submissionId query parameter is required');
    }

    // Look up submission
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      select: {
        id: true,
        speakerId: true,
        eventId: true,
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

    // Check permissions
    const isOwner = submission.speakerId === user.id;
    const canManage = await canManageEvent(user, submission.eventId);
    const canReview = await canReviewEvent(user, submission.eventId);

    if (!isOwner && !canManage && !canReview) {
      return forbiddenResponse('You do not have access to messages for this submission');
    }

    const messages = await prisma.message.findMany({
      where: {
        submissionId,
        parentId: null, // Only top-level messages
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
          orderBy: { createdAt: 'asc' as const },
        },
      },
      orderBy: { createdAt: 'desc' as const },
    });

    return successResponse({ messages });
  } catch (error) {
    return handleApiError(error);
  }
}
