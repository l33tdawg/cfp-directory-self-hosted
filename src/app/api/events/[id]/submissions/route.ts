/**
 * Event Submissions API
 * 
 * GET /api/events/[id]/submissions - List submissions for an event
 * POST /api/events/[id]/submissions - Create a new submission
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getAuthenticatedUser, canReviewEvent, canViewEvent } from '@/lib/api/auth';
import {
  createdResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  errorResponse,
  paginatedResponse,
  handleApiError,
} from '@/lib/api/response';
import { createSubmissionSchema, submissionFiltersSchema } from '@/lib/validations/submission';
import { Prisma } from '@prisma/client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ============================================================================
// GET /api/events/[id]/submissions - List submissions
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: eventId } = await params;
    const { user, error } = await getAuthenticatedUser();
    
    if (!user) {
      return unauthorizedResponse(error);
    }
    
    // Check if user can view event submissions
    const canReview = await canReviewEvent(user, eventId);
    
    const searchParams = request.nextUrl.searchParams;
    const filters = submissionFiltersSchema.parse({
      status: searchParams.get('status'),
      trackId: searchParams.get('trackId'),
      formatId: searchParams.get('formatId'),
      search: searchParams.get('search'),
      speakerId: searchParams.get('speakerId'),
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
    });
    
    // Build where clause
    const where: Prisma.SubmissionWhereInput = {
      eventId,
    };
    
    // Non-reviewers can only see their own submissions
    if (!canReview) {
      where.speakerId = user.id;
    } else {
      // Reviewers can filter by speaker
      if (filters.speakerId) {
        where.speakerId = filters.speakerId;
      }
    }
    
    if (filters.status) where.status = filters.status;
    if (filters.trackId) where.trackId = filters.trackId;
    if (filters.formatId) where.formatId = filters.formatId;
    
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { abstract: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    
    const [submissions, total] = await Promise.all([
      prisma.submission.findMany({
        where,
        include: {
          speaker: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          track: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
          format: {
            select: {
              id: true,
              name: true,
              durationMin: true,
            },
          },
          coSpeakers: true,
          _count: {
            select: {
              reviews: true,
              messages: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: filters.limit,
        skip: filters.offset,
      }),
      prisma.submission.count({ where }),
    ]);
    
    return paginatedResponse(submissions, total, filters.limit, filters.offset);
  } catch (error) {
    return handleApiError(error);
  }
}

// ============================================================================
// POST /api/events/[id]/submissions - Create submission
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: eventId } = await params;
    const { user, error } = await getAuthenticatedUser();
    
    if (!user) {
      return unauthorizedResponse(error);
    }
    
    // Check if event exists and CFP is open
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        isPublished: true,
        cfpOpensAt: true,
        cfpClosesAt: true,
      },
    });
    
    if (!event) {
      return notFoundResponse('Event');
    }
    
    // Check if CFP is open
    const now = new Date();
    const cfpOpen = event.cfpOpensAt && event.cfpClosesAt
      ? now >= event.cfpOpensAt && now <= event.cfpClosesAt
      : false;
    
    if (!cfpOpen && !event.isPublished) {
      return errorResponse('CFP is not currently open for this event', 400);
    }
    
    const body = await request.json();
    const data = createSubmissionSchema.parse({ ...body, eventId });
    
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
    
    const submission = await prisma.submission.create({
      data: {
        eventId,
        speakerId: user.id,
        trackId: data.trackId,
        formatId: data.formatId,
        title: data.title,
        abstract: data.abstract,
        outline: data.outline,
        targetAudience: data.targetAudience,
        prerequisites: data.prerequisites,
        status: 'PENDING',
      },
      include: {
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
      },
    });
    
    return createdResponse(submission);
  } catch (error) {
    return handleApiError(error);
  }
}
