/**
 * Events API Routes
 * 
 * GET /api/events - List events
 * POST /api/events - Create a new event
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getAuthenticatedUser, canManageEvents, isOrganizer } from '@/lib/api/auth';
import {
  successResponse,
  createdResponse,
  unauthorizedResponse,
  forbiddenResponse,
  paginatedResponse,
  handleApiError,
} from '@/lib/api/response';
import {
  createEventSchema,
  eventFiltersSchema,
} from '@/lib/validations/event';
import { Prisma } from '@prisma/client';

// ============================================================================
// GET /api/events - List events
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser();
    const searchParams = request.nextUrl.searchParams;
    
    // Parse and validate filters
    const filters = eventFiltersSchema.parse({
      isPublished: searchParams.get('isPublished'),
      cfpOpen: searchParams.get('cfpOpen'),
      search: searchParams.get('search'),
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
    });
    
    // Build where clause
    const where: Prisma.EventWhereInput = {};
    
    // Non-organizers can only see published events
    if (!user || !isOrganizer(user)) {
      where.isPublished = true;
    } else if (filters.isPublished !== undefined) {
      where.isPublished = filters.isPublished;
    }
    
    // CFP open filter
    if (filters.cfpOpen !== undefined) {
      const now = new Date();
      if (filters.cfpOpen) {
        where.cfpOpensAt = { lte: now };
        where.cfpClosesAt = { gte: now };
      }
    }
    
    // Search filter
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { location: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    
    // Get events with count
    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        include: {
          _count: {
            select: {
              submissions: true,
              tracks: true,
              formats: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: filters.limit,
        skip: filters.offset,
      }),
      prisma.event.count({ where }),
    ]);
    
    return paginatedResponse(events, total, filters.limit, filters.offset);
  } catch (error) {
    return handleApiError(error);
  }
}

// ============================================================================
// POST /api/events - Create event
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser();
    
    if (!user) {
      return unauthorizedResponse(error);
    }
    
    // Check permission
    if (!canManageEvents(user)) {
      return forbiddenResponse('Only organizers can create events');
    }
    
    const body = await request.json();
    const data = createEventSchema.parse(body);
    
    // Create the event
    const event = await prisma.event.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        websiteUrl: data.websiteUrl || null,
        location: data.location,
        isVirtual: data.isVirtual,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        timezone: data.timezone,
        cfpOpensAt: data.cfpOpensAt ? new Date(data.cfpOpensAt) : null,
        cfpClosesAt: data.cfpClosesAt ? new Date(data.cfpClosesAt) : null,
        cfpDescription: data.cfpDescription,
        isPublished: data.isPublished,
      },
    });
    
    return createdResponse(event);
  } catch (error) {
    return handleApiError(error);
  }
}
