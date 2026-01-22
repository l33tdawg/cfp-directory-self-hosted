/**
 * Single Event API Routes
 * 
 * GET /api/events/[id] - Get event details
 * PATCH /api/events/[id] - Update event
 * DELETE /api/events/[id] - Delete event
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getAuthenticatedUser, canManageEvent, canViewEvent } from '@/lib/api/auth';
import {
  successResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  noContentResponse,
  handleApiError,
} from '@/lib/api/response';
import { updateEventSchema } from '@/lib/validations/event';
import { EventStatus } from '@prisma/client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ============================================================================
// GET /api/events/[id] - Get event details
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const { user } = await getAuthenticatedUser();
    
    // Support lookup by ID or slug
    const event = await prisma.event.findFirst({
      where: {
        OR: [
          { id },
          { slug: id },
        ],
      },
      include: {
        tracks: {
          orderBy: { name: 'asc' },
        },
        formats: {
          orderBy: { durationMin: 'asc' },
        },
        talkFormats: {
          orderBy: { sortOrder: 'asc' },
        },
        reviewCriteria: {
          orderBy: { sortOrder: 'asc' },
        },
        reviewTeam: true,
        _count: {
          select: {
            submissions: true,
            talkFormats: true,
            reviewCriteria: true,
          },
        },
      },
    });
    
    if (!event) {
      return notFoundResponse('Event');
    }
    
    // Check if user can view this event
    const canView = await canViewEvent(user, event.id);
    if (!canView) {
      return notFoundResponse('Event');
    }
    
    // Add computed fields
    const now = new Date();
    const isCfpOpen = event.cfpOpensAt && event.cfpClosesAt
      ? now >= event.cfpOpensAt && now <= event.cfpClosesAt
      : false;
    
    return successResponse({
      ...event,
      isCfpOpen,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// ============================================================================
// PATCH /api/events/[id] - Update event
// ============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const { user, error } = await getAuthenticatedUser();
    
    if (!user) {
      return unauthorizedResponse(error);
    }
    
    // Check if event exists first
    const existingEvent = await prisma.event.findUnique({
      where: { id },
      select: { id: true },
    });
    
    if (!existingEvent) {
      return notFoundResponse('Event');
    }
    
    // SECURITY: Check permission using event-specific authorization
    // This verifies the user is either an ADMIN or a LEAD on this specific event's review team
    const canManage = await canManageEvent(user, id);
    if (!canManage) {
      return forbiddenResponse('You do not have permission to edit this event');
    }
    
    const body = await request.json();
    const data = updateEventSchema.parse(body);
    
    // Determine status
    const status = data.status === 'PUBLISHED' ? EventStatus.PUBLISHED : 
                   data.status === 'DRAFT' ? EventStatus.DRAFT : undefined;
    
    // Build update data
    const updateData: Record<string, unknown> = {};
    
    // Basic Info
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.websiteUrl !== undefined) updateData.websiteUrl = data.websiteUrl || null;
    if (data.eventType !== undefined) updateData.eventType = data.eventType;
    
    // Location
    if (data.location !== undefined) updateData.location = data.location;
    if (data.venueName !== undefined) updateData.venueName = data.venueName || null;
    if (data.venueAddress !== undefined) updateData.venueAddress = data.venueAddress || null;
    if (data.venueCity !== undefined) updateData.venueCity = data.venueCity || null;
    if (data.country !== undefined) updateData.country = data.country;
    if (data.isVirtual !== undefined) updateData.isVirtual = data.isVirtual;
    if (data.virtualUrl !== undefined) updateData.virtualUrl = data.virtualUrl || null;
    
    // Event Dates
    if (data.startDate !== undefined) updateData.startDate = data.startDate ? new Date(data.startDate) : null;
    if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null;
    if (data.startTime !== undefined) updateData.startTime = data.startTime;
    if (data.endTime !== undefined) updateData.endTime = data.endTime;
    if (data.timezone !== undefined) updateData.timezone = data.timezone;
    
    // Topics & Audience
    if (data.topics !== undefined) updateData.topics = data.topics;
    if (data.audienceLevel !== undefined) updateData.audienceLevel = data.audienceLevel;
    
    // CFP Settings
    if (data.cfpOpensAt !== undefined) updateData.cfpOpensAt = data.cfpOpensAt ? new Date(data.cfpOpensAt) : null;
    if (data.cfpClosesAt !== undefined) updateData.cfpClosesAt = data.cfpClosesAt ? new Date(data.cfpClosesAt) : null;
    if (data.cfpStartTime !== undefined) updateData.cfpStartTime = data.cfpStartTime;
    if (data.cfpEndTime !== undefined) updateData.cfpEndTime = data.cfpEndTime;
    if (data.cfpDescription !== undefined) updateData.cfpDescription = data.cfpDescription;
    if (data.cfpGuidelines !== undefined) updateData.cfpGuidelines = data.cfpGuidelines || null;
    if (data.speakerBenefits !== undefined) updateData.speakerBenefits = data.speakerBenefits || null;
    
    // Review Settings
    if (data.reviewType !== undefined) updateData.reviewType = data.reviewType;
    if (data.minReviewsPerTalk !== undefined) updateData.minReviewsPerTalk = data.minReviewsPerTalk;
    if (data.enableSpeakerFeedback !== undefined) updateData.enableSpeakerFeedback = data.enableSpeakerFeedback;
    
    // Notification Settings
    if (data.notifyOnNewSubmission !== undefined) updateData.notifyOnNewSubmission = data.notifyOnNewSubmission;
    if (data.notifyOnNewReview !== undefined) updateData.notifyOnNewReview = data.notifyOnNewReview;
    
    // Status
    if (status !== undefined) {
      updateData.status = status;
      updateData.isPublished = status === EventStatus.PUBLISHED;
    }
    if (data.isPublished !== undefined && status === undefined) {
      updateData.isPublished = data.isPublished;
      updateData.status = data.isPublished ? EventStatus.PUBLISHED : EventStatus.DRAFT;
    }
    
    // Update event (result not used directly, we fetch fresh data below)
    await prisma.event.update({
      where: { id },
      data: updateData,
      include: {
        talkFormats: { orderBy: { sortOrder: 'asc' } },
        reviewCriteria: { orderBy: { sortOrder: 'asc' } },
      },
    });
    
    // Handle talk formats update (delete and recreate)
    if (data.talkFormats !== undefined) {
      await prisma.eventTalkFormat.deleteMany({
        where: { eventId: id },
      });
      
      if (data.talkFormats.length > 0) {
        await prisma.eventTalkFormat.createMany({
          data: data.talkFormats.map((format, index) => ({
            eventId: id,
            name: format.name,
            description: format.description || null,
            durationMin: format.durationMin,
            sortOrder: index,
          })),
        });
      }
    }
    
    // Handle review criteria update (delete and recreate)
    if (data.reviewCriteria !== undefined) {
      await prisma.eventReviewCriteria.deleteMany({
        where: { eventId: id },
      });
      
      if (data.reviewCriteria.length > 0) {
        await prisma.eventReviewCriteria.createMany({
          data: data.reviewCriteria.map((criteria, index) => ({
            eventId: id,
            name: criteria.name,
            description: criteria.description || null,
            weight: criteria.weight,
            sortOrder: index,
          })),
        });
      }
    }
    
    // Fetch updated event with relations
    const updatedEvent = await prisma.event.findUnique({
      where: { id },
      include: {
        talkFormats: { orderBy: { sortOrder: 'asc' } },
        reviewCriteria: { orderBy: { sortOrder: 'asc' } },
      },
    });
    
    return successResponse(updatedEvent);
  } catch (error) {
    return handleApiError(error);
  }
}

// ============================================================================
// DELETE /api/events/[id] - Delete event
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const { user, error } = await getAuthenticatedUser();
    
    if (!user) {
      return unauthorizedResponse(error);
    }
    
    // Check if event exists first
    const event = await prisma.event.findUnique({
      where: { id },
      select: { id: true },
    });
    
    if (!event) {
      return notFoundResponse('Event');
    }
    
    // SECURITY: Check permission using event-specific authorization
    // This verifies the user is either an ADMIN or a LEAD on this specific event's review team
    const canManage = await canManageEvent(user, id);
    if (!canManage) {
      return forbiddenResponse('You do not have permission to delete this event');
    }
    
    // Delete the event (cascades to tracks, formats, submissions, etc.)
    await prisma.event.delete({
      where: { id },
    });
    
    return noContentResponse();
  } catch (error) {
    return handleApiError(error);
  }
}
