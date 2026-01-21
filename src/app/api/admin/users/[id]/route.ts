/**
 * Admin User Detail API
 * 
 * Get and update individual user.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth';
import { logActivity } from '@/lib/activity-logger';
import { getClientIdentifier } from '@/lib/rate-limit';
import { z } from 'zod';

const updateUserSchema = z.object({
  role: z.enum(['USER', 'SPEAKER', 'REVIEWER', 'ORGANIZER', 'ADMIN']).optional(),
  name: z.string().optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser();
    
    if (currentUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        speakerProfile: true,
        reviewerProfile: true,
        _count: {
          select: {
            submissions: true,
            reviews: true,
          },
        },
      },
    });
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser();
    
    if (currentUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const validatedData = updateUserSchema.parse(body);
    
    // Prevent self-demotion from admin
    if (id === currentUser.id && validatedData.role && validatedData.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Cannot remove your own admin role' },
        { status: 400 }
      );
    }
    
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });
    
    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Check if role is being changed - need to invalidate sessions
    const isRoleChange = validatedData.role && validatedData.role !== existingUser.role;
    
    // Update user - increment sessionVersion if role changes to invalidate JWT sessions
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...validatedData,
        // Increment sessionVersion on role change to invalidate existing JWT sessions
        ...(isRoleChange && { sessionVersion: { increment: 1 } }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        createdAt: true,
      },
    });
    
    // Log the role change for security audit
    if (isRoleChange && validatedData.role) {
      await logActivity({
        userId: currentUser.id,
        action: 'USER_ROLE_CHANGED',
        entityType: 'User',
        entityId: id,
        metadata: {
          previousRole: existingUser.role,
          newRole: validatedData.role,
          changedBy: currentUser.id,
          viaAdminRoute: true,
        },
        ipAddress: getClientIdentifier(request),
      });
    }
    
    return NextResponse.json(updatedUser);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      );
    }
    
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser();
    
    if (currentUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    // Prevent self-deletion
    if (id === currentUser.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }
    
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });
    
    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Delete user (cascades will handle related records)
    await prisma.user.delete({
      where: { id },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
