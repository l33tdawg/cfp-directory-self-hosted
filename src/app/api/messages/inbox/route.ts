/**
 * Messages Inbox API
 *
 * GET /api/messages/inbox - Get messages for the current user's inbox (role-aware)
 * PATCH /api/messages/inbox - Mark messages as read
 *
 * Role behavior:
 * - ADMIN/ORGANIZER: All messages across all submissions
 * - REVIEWER: Messages for submissions of events they're on the review team for
 * - SPEAKER/USER: Messages for their own submissions
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { getAuthenticatedUser, isOrganizer, isReviewerRole } from '@/lib/api/auth';
import {
  successResponse,
  unauthorizedResponse,
  handleApiError,
} from '@/lib/api/response';

// ============================================================================
// GET /api/messages/inbox
// ============================================================================

export async function GET() {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (!user) {
      return unauthorizedResponse(error);
    }

    // Build role-specific where clause
    let whereClause: Record<string, unknown> = {};

    if (isOrganizer(user)) {
      // Admin/Organizer: all messages
      whereClause = {};
    } else if (isReviewerRole(user)) {
      // Reviewer: messages for events they're assigned to
      const teamMemberships = await prisma.reviewTeamMember.findMany({
        where: { userId: user.id },
        select: { eventId: true },
      });
      const eventIds = teamMemberships.map(m => m.eventId);
      whereClause = {
        submission: { eventId: { in: eventIds } },
      };
    } else {
      // Speaker/User: only their own submissions
      whereClause = {
        submission: { speakerId: user.id },
      };
    }

    // Get messages with submission/event context
    const messages = await prisma.message.findMany({
      where: whereClause,
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
            id: true,
            title: true,
            status: true,
            isFederated: true,
            federatedSpeakerId: true,
            speakerId: true,
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
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // For federated submissions, get federated speaker names
    const federatedSpeakerIds = [
      ...new Set(
        messages
          .filter(m => m.submission.isFederated && m.submission.federatedSpeakerId)
          .map(m => m.submission.federatedSpeakerId!)
      ),
    ];

    let federatedSpeakerMap = new Map<string, { name: string; avatarUrl: string | null }>();
    if (federatedSpeakerIds.length > 0) {
      const federatedSpeakers = await prisma.federatedSpeaker.findMany({
        where: { id: { in: federatedSpeakerIds } },
        select: { id: true, name: true, avatarUrl: true },
      });
      federatedSpeakerMap = new Map(
        federatedSpeakers.map(s => [s.id, { name: s.name, avatarUrl: s.avatarUrl }])
      );
    }

    // Format messages with context
    const formatted = messages.map(msg => {
      const federatedSpeaker = msg.submission.federatedSpeakerId
        ? federatedSpeakerMap.get(msg.submission.federatedSpeakerId)
        : null;

      return {
        id: msg.id,
        body: msg.body,
        subject: msg.subject,
        senderType: msg.senderType,
        senderId: msg.senderId,
        isRead: msg.isRead,
        readAt: msg.readAt,
        parentId: msg.parentId,
        federatedMessageId: msg.federatedMessageId,
        createdAt: msg.createdAt,
        senderName: msg.sender?.name || msg.sender?.email || null,
        senderImage: msg.sender?.image || null,
        submission: {
          id: msg.submission.id,
          title: msg.submission.title,
          status: msg.submission.status,
          isFederated: msg.submission.isFederated,
          speakerName: msg.submission.isFederated
            ? (federatedSpeaker?.name || 'Federated Speaker')
            : (msg.submission.speaker?.name || msg.submission.speaker?.email || 'Speaker'),
          speakerImage: msg.submission.isFederated
            ? (federatedSpeaker?.avatarUrl || null)
            : (msg.submission.speaker?.image || null),
        },
        event: {
          id: msg.submission.event.id,
          name: msg.submission.event.name,
          slug: msg.submission.event.slug,
        },
      };
    });

    return successResponse({
      messages: formatted,
      role: user.role,
      userId: user.id,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// ============================================================================
// PATCH /api/messages/inbox - Mark messages as read
// ============================================================================

const markReadSchema = z.object({
  messageIds: z.array(z.string().cuid()).min(1).max(100),
});

export async function PATCH(request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (!user) {
      return unauthorizedResponse(error);
    }

    const body = await request.json();
    const data = markReadSchema.parse(body);

    await prisma.message.updateMany({
      where: {
        id: { in: data.messageIds },
        isRead: false,
        // Only mark messages NOT sent by current user as read
        NOT: { senderId: user.id },
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return successResponse({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
