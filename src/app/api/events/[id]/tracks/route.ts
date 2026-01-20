/**
 * Event Tracks API Routes
 * 
 * GET /api/events/[id]/tracks - List tracks for an event
 * POST /api/events/[id]/tracks - Create a new track
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getAuthenticatedUser, canManageEvent, canViewEvent } from '@/lib/api/auth';
import {
  successResponse,
  createdResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  handleApiError,
} from '@/lib/api/response';
import { createTrackSchema } from '@/lib/validations/event';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ============================================================================
// GET /api/events/[id]/tracks - List tracks
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
    
    const tracks = await prisma.eventTrack.findMany({
      where: { eventId: id },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            submissions: true,
          },
        },
      },
    });
    
    return successResponse(tracks);
  } catch (error) {
    return handleApiError(error);
  }
}

// ============================================================================
// POST /api/events/[id]/tracks - Create track
// ============================================================================

export async function POST(
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
    const canManage = await canManageEvent(user, id);
    if (!canManage) {
      return forbiddenResponse('You do not have permission to manage this event');
    }
    
    // Check if event exists
    const event = await prisma.event.findUnique({
      where: { id },
      select: { id: true },
    });
    
    if (!event) {
      return notFoundResponse('Event');
    }
    
    const body = await request.json();
    const data = createTrackSchema.parse(body);
    
    const track = await prisma.eventTrack.create({
      data: {
        eventId: id,
        name: data.name,
        description: data.description,
        color: data.color,
      },
    });
    
    return createdResponse(track);
  } catch (error) {
    return handleApiError(error);
  }
}
