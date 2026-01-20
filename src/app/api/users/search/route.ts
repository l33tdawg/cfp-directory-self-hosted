/**
 * User Search API
 * 
 * GET /api/users/search?email=... - Search for a user by email
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getAuthenticatedUser } from '@/lib/api/auth';
import {
  successResponse,
  unauthorizedResponse,
  notFoundResponse,
  errorResponse,
  handleApiError,
} from '@/lib/api/response';

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser();
    
    if (!user) {
      return unauthorizedResponse(error);
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
