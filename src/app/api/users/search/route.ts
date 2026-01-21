/**
 * User Search API
 * 
 * GET /api/users/search?email=... - Search for a user by email
 * 
 * Security: Restricted to ADMIN and ORGANIZER roles to prevent email enumeration.
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getAuthenticatedUser } from '@/lib/api/auth';
import { rateLimitMiddleware } from '@/lib/rate-limit';
import {
  successResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  errorResponse,
  handleApiError,
} from '@/lib/api/response';

export async function GET(request: NextRequest) {
  try {
    // Apply strict rate limiting to prevent enumeration attacks
    const rateLimited = rateLimitMiddleware(request, 'authStrict');
    if (rateLimited) {
      return rateLimited;
    }
    
    const { user, error } = await getAuthenticatedUser();
    
    if (!user) {
      return unauthorizedResponse(error);
    }
    
    // Restrict to ADMIN and ORGANIZER roles to prevent email enumeration
    if (!['ADMIN', 'ORGANIZER'].includes(user.role)) {
      return forbiddenResponse('Insufficient permissions to search users');
    }
    
    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get('email');
    
    if (!email) {
      return errorResponse('Email parameter is required', 400);
    }
    
    const foundUser = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    });
    
    if (!foundUser) {
      return notFoundResponse('User');
    }
    
    return successResponse(foundUser);
  } catch (error) {
    return handleApiError(error);
  }
}
