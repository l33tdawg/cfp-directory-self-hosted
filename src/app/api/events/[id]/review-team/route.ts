/**
 * Event Review Team API Routes
 * 
 * GET /api/events/[id]/review-team - List review team members
 * POST /api/events/[id]/review-team - Add a reviewer to the team
 * DELETE /api/events/[id]/review-team - Remove a reviewer from the team
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
  noContentResponse,
  errorResponse,
  handleApiError,
} from '@/lib/api/response';
import { addReviewerSchema } from '@/lib/validations/event';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ============================================================================
// GET /api/events/[id]/review-team - List review team
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const { user, error } = await getAuthenticatedUser();
    
    if (!user) {
      return unauthorizedResponse(error);
    }
    
    // Check permission (only event managers can see review team)
    const canManage = await canManageEvent(user, id);
    if (!canManage) {
      return forbiddenResponse('You do not have permission to view the review team');
    }
    
    const reviewTeam = await prisma.reviewTeamMember.findMany({
      where: { eventId: id },
      orderBy: [
        { role: 'asc' }, // LEAD first
        { addedAt: 'asc' },
      ],
    });
    
    // Fetch user details for each member
    const userIds = reviewTeam.map((m) => m.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    });
    
    const usersMap = new Map(users.map((u) => [u.id, u]));
    
    const teamWithUsers = reviewTeam.map((member) => ({
      ...member,
      user: usersMap.get(member.userId) || null,
    }));
    
    return successResponse(teamWithUsers);
  } catch (error) {
    return handleApiError(error);
  }
}

// ============================================================================
// POST /api/events/[id]/review-team - Add reviewer
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
      return forbiddenResponse('You do not have permission to manage the review team');
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
    const data = addReviewerSchema.parse(body);
    
    // Check if user exists
    const reviewerUser = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { id: true, name: true, email: true, image: true },
    });
    
    if (!reviewerUser) {
      return notFoundResponse('User');
    }
    
    // Check if already on team
    const existing = await prisma.reviewTeamMember.findUnique({
      where: {
        eventId_userId: {
          eventId: id,
          userId: data.userId,
        },
      },
    });
    
    if (existing) {
      return errorResponse('User is already on the review team', 409);
    }
    
    const member = await prisma.reviewTeamMember.create({
      data: {
        eventId: id,
        userId: data.userId,
        role: data.role,
      },
    });
    
    return createdResponse({
      ...member,
      user: reviewerUser,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// ============================================================================
// DELETE /api/events/[id]/review-team - Remove reviewer
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
    const canManage = await canManageEvent(user, id);
    if (!canManage) {
      return forbiddenResponse('You do not have permission to manage the review team');
    }
    
    // Get userId from query params
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return errorResponse('userId query parameter is required', 400);
    }
    
    // Check if member exists
    const member = await prisma.reviewTeamMember.findUnique({
      where: {
        eventId_userId: {
          eventId: id,
          userId,
        },
      },
    });
    
    if (!member) {
      return notFoundResponse('Review team member');
    }
    
    // Delete the member
    await prisma.reviewTeamMember.delete({
      where: {
        eventId_userId: {
          eventId: id,
          userId,
        },
      },
    });
    
    return noContentResponse();
  } catch (error) {
    return handleApiError(error);
  }
}
