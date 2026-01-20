/**
 * Submission Messages API
 * 
 * GET /api/events/[id]/submissions/[submissionId]/messages - List messages
 * POST /api/events/[id]/submissions/[submissionId]/messages - Send a message
 * PATCH /api/events/[id]/submissions/[submissionId]/messages - Mark messages as read
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getAuthenticatedUser, canManageEvent } from '@/lib/api/auth';
import {
  successResponse,
  createdResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  handleApiError,
} from '@/lib/api/response';
import { createMessageSchema, markReadSchema } from '@/lib/validations/message';

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
    
    // Check permissions - speaker or event manager
    const isOwner = submission.speakerId === user.id;
    const canManage = await canManageEvent(user, eventId);
    
    if (!isOwner && !canManage) {
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
    
    // Check permissions - speaker or event manager
    const isOwner = submission.speakerId === user.id;
    const canManage = await canManageEvent(user, eventId);
    
    if (!isOwner && !canManage) {
      return forbiddenResponse('You do not have permission to send messages');
    }
    
    const body = await request.json();
    const data = createMessageSchema.parse(body);
    
    // Determine sender type
    const senderType = isOwner ? 'SPEAKER' : 'ORGANIZER';
    
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
      },
    });
    
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
      },
    });
    
    if (!submission) {
      return notFoundResponse('Submission');
    }
    
    // Check permissions
    const isOwner = submission.speakerId === user.id;
    const canManage = await canManageEvent(user, eventId);
    
    if (!isOwner && !canManage) {
      return forbiddenResponse('You do not have access to messages for this submission');
    }
    
    const body = await request.json();
    const data = markReadSchema.parse(body);
    
    // Mark messages as read
    // Only mark messages not sent by the current user
    await prisma.message.updateMany({
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
    
    return successResponse({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
