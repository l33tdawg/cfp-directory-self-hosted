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
import { Prisma, EventStatus } from '@prisma/client';

// ============================================================================
// Helper: Generate slug from name
// ============================================================================

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100);
}

async function getUniqueSlug(baseSlug: string): Promise<string> {
  let slug = baseSlug;
  let counter = 1;
  
  while (true) {
    const existing = await prisma.event.findUnique({
      where: { slug },
      select: { id: true },
    });
    
    if (!existing) {
      return slug;
    }
    
    slug = `${baseSlug}-${counter}`;
    counter++;
    
    if (counter > 100) {
      throw new Error('Could not generate unique slug');
    }
  }
}

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
      where.status = EventStatus.PUBLISHED;
    } else if (filters.isPublished !== undefined) {
      where.status = filters.isPublished ? EventStatus.PUBLISHED : EventStatus.DRAFT;
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
        { venueCity: { contains: filters.search, mode: 'insensitive' } },
        { venueName: { contains: filters.search, mode: 'insensitive' } },
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
              talkFormats: true,
              reviewCriteria: true,
            },
          },
          talkFormats: {
            orderBy: { sortOrder: 'asc' },
          },
          reviewCriteria: {
            orderBy: { sortOrder: 'asc' },
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
    
    // Generate slug if not provided
    const baseSlug = data.slug || generateSlug(data.name);
    const slug = await getUniqueSlug(baseSlug);
    
    // Determine status
    const status = data.status === 'PUBLISHED' ? EventStatus.PUBLISHED : EventStatus.DRAFT;
    
    // Create the event with all fields
    const event = await prisma.event.create({
      data: {
        // Basic Info
        name: data.name,
        slug,
        description: data.description || null,
        websiteUrl: data.websiteUrl || null,
        eventType: data.eventType,
        
        // Location
        location: data.location || null, // Legacy
        venueName: data.venueName || null,
        venueAddress: data.venueAddress || null,
        venueCity: data.venueCity || null,
        country: data.country,
        isVirtual: data.isVirtual,
        virtualUrl: data.virtualUrl || null,
        
        // Event Dates
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        startTime: data.startTime,
        endTime: data.endTime,
        timezone: data.timezone,
        
        // Topics & Audience
        topics: data.topics || [],
        audienceLevel: data.audienceLevel || [],
        
        // CFP Settings
        cfpOpensAt: data.cfpOpensAt ? new Date(data.cfpOpensAt) : null,
        cfpClosesAt: data.cfpClosesAt ? new Date(data.cfpClosesAt) : null,
        cfpStartTime: data.cfpStartTime,
        cfpEndTime: data.cfpEndTime,
        cfpDescription: data.cfpDescription || null, // Legacy
        cfpGuidelines: data.cfpGuidelines || null,
        speakerBenefits: data.speakerBenefits || null,
        
        // Review Settings
        reviewType: data.reviewType,
        minReviewsPerTalk: data.minReviewsPerTalk,
        enableSpeakerFeedback: data.enableSpeakerFeedback,
        
        // Notification Settings
        notifyOnNewSubmission: data.notifyOnNewSubmission,
        notifyOnNewReview: data.notifyOnNewReview,
        
        // Status
        status,
        isPublished: status === EventStatus.PUBLISHED,
        
        // Talk Formats
        talkFormats: data.talkFormats && data.talkFormats.length > 0 ? {
          create: data.talkFormats.map((format, index) => ({
            name: format.name,
            description: format.description || null,
            durationMin: format.durationMin,
            sortOrder: index,
          })),
        } : undefined,
        
        // Review Criteria
        reviewCriteria: data.reviewCriteria && data.reviewCriteria.length > 0 ? {
          create: data.reviewCriteria.map((criteria, index) => ({
            name: criteria.name,
            description: criteria.description || null,
            weight: criteria.weight,
            sortOrder: index,
          })),
        } : undefined,
      },
      include: {
        talkFormats: {
          orderBy: { sortOrder: 'asc' },
        },
        reviewCriteria: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
    
    return createdResponse(event);
  } catch (error) {
    return handleApiError(error);
  }
}
