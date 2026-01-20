/**
 * Single Event API Routes
 * 
 * GET /api/events/[id] - Get event details
 * PATCH /api/events/[id] - Update event
 * DELETE /api/events/[id] - Delete event
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getAuthenticatedUser, canManageEvents, canViewEvent } from '@/lib/api/auth';
import {
  successResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  noContentResponse,
  handleApiError,
} from '@/lib/api/response';
import { updateEventSchema } from '@/lib/validations/event';

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
    
    // Check if user can view this event
    const canView = await canViewEvent(user, id);
    if (!canView) {
      return notFoundResponse('Event');
    }
    
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        tracks: {
          orderBy: { name: 'asc' },
        },
        formats: {
          orderBy: { durationMin: 'asc' },
        },
        reviewTeam: true,
        _count: {
          select: {
            submissions: true,
          },
        },
      },
    });
    
    if (!event) {
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
    
    // Check permission
    if (!canManageEvents(user)) {
      return forbiddenResponse('Only organizers can edit events');
    }
    
    const body = await request.json();
    const data = updateEventSchema.parse(body);
    
    // Update the event
    const event = await prisma.event.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.websiteUrl !== undefined && { websiteUrl: data.websiteUrl || null }),
        ...(data.location !== undefined && { location: data.location }),
        ...(data.isVirtual !== undefined && { isVirtual: data.isVirtual }),
        ...(data.startDate !== undefined && { startDate: data.startDate ? new Date(data.startDate) : null }),
        ...(data.endDate !== undefined && { endDate: data.endDate ? new Date(data.endDate) : null }),
        ...(data.timezone !== undefined && { timezone: data.timezone }),
        ...(data.cfpOpensAt !== undefined && { cfpOpensAt: data.cfpOpensAt ? new Date(data.cfpOpensAt) : null }),
        ...(data.cfpClosesAt !== undefined && { cfpClosesAt: data.cfpClosesAt ? new Date(data.cfpClosesAt) : null }),
        ...(data.cfpDescription !== undefined && { cfpDescription: data.cfpDescription }),
        ...(data.isPublished !== undefined && { isPublished: data.isPublished }),
      },
    });
    
    return successResponse(event);
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
    
    // Check permission
    if (!canManageEvents(user)) {
      return forbiddenResponse('Only organizers can delete events');
    }
    
    // Check if event exists
    const event = await prisma.event.findUnique({
      where: { id },
      select: { id: true },
    });
    
    if (!event) {
      return notFoundResponse('Event');
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
