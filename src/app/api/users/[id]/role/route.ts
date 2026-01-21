/**
 * User Role API
 * 
 * PATCH /api/users/[id]/role - Update user role
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getAuthenticatedUser, canManageSettings } from '@/lib/api/auth';
import { logActivity } from '@/lib/activity-logger';
import { getClientIdentifier } from '@/lib/rate-limit';
import {
  successResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  errorResponse,
  handleApiError,
} from '@/lib/api/response';
import { updateUserRoleSchema } from '@/lib/validations/settings';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: userId } = await params;
    const { user, error } = await getAuthenticatedUser();
    
    if (!user) {
      return unauthorizedResponse(error);
    }
    
    // Only admins can change roles
    if (!canManageSettings(user)) {
      return forbiddenResponse('Only administrators can change user roles');
    }
    
    // Can't change own role
    if (userId === user.id) {
      return errorResponse('You cannot change your own role', 400);
    }
    
    // Find the user
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });
    
    if (!targetUser) {
      return notFoundResponse('User');
    }
    
    const body = await request.json();
    const data = updateUserRoleSchema.parse(body);
    
    // Prevent removing the last admin
    if (targetUser.role === 'ADMIN' && data.role !== 'ADMIN') {
      const adminCount = await prisma.user.count({
        where: { role: 'ADMIN' },
      });
      
      if (adminCount <= 1) {
        return errorResponse('Cannot remove the last administrator', 400);
      }
    }
    
    const previousRole = targetUser.role;
    
    // Update the role and increment sessionVersion to invalidate existing JWT sessions
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { 
        role: data.role,
        sessionVersion: { increment: 1 }, // Forces re-authentication
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });
    
    // Log the security event
    await logActivity({
      userId: user.id,
      action: 'USER_ROLE_CHANGED',
      entityType: 'User',
      entityId: userId,
      metadata: {
        previousRole,
        newRole: data.role,
        targetEmail: targetUser.email,
      },
      ipAddress: getClientIdentifier(request),
    });
    
    return successResponse(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
