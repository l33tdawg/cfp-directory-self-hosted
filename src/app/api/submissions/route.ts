/**
 * User Submissions API
 * 
 * GET /api/submissions - List current user's submissions across all events
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getAuthenticatedUser } from '@/lib/api/auth';
import {
  paginatedResponse,
  unauthorizedResponse,
  handleApiError,
} from '@/lib/api/response';
import { decryptPiiFields, CO_SPEAKER_PII_FIELDS } from '@/lib/security/encryption';
import { z } from 'zod';

const filtersSchema = z.object({
  status: z.enum(['PENDING', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED', 'WAITLISTED', 'WITHDRAWN']).optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser();
    
    if (!user) {
      return unauthorizedResponse(error);
    }
    
    const searchParams = request.nextUrl.searchParams;
    const filters = filtersSchema.parse({
      status: searchParams.get('status'),
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
    });
    
    const where = {
      speakerId: user.id,
      ...(filters.status && { status: filters.status }),
    };
    
    const [submissions, total] = await Promise.all([
      prisma.submission.findMany({
        where,
        include: {
          event: {
            select: {
              id: true,
              name: true,
              slug: true,
              startDate: true,
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
    
    // Decrypt co-speaker PII in each submission
    const decryptedSubmissions = submissions.map(submission => ({
      ...submission,
      coSpeakers: submission.coSpeakers.map(cs =>
        decryptPiiFields(cs as unknown as Record<string, unknown>, CO_SPEAKER_PII_FIELDS)
      ),
    }));
    
    return paginatedResponse(decryptedSubmissions, total, filters.limit, filters.offset);
  } catch (error) {
    return handleApiError(error);
  }
}
