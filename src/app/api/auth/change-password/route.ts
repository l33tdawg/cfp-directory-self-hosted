/**
 * Change Password API Route
 * 
 * POST /api/auth/change-password
 * 
 * Allows authenticated users to change their password.
 * Requires the current password for verification.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { hashPassword, verifyPassword, changePasswordSchema } from '@/lib/auth';
import { rateLimitMiddleware, getClientIdentifier } from '@/lib/rate-limit';
import { logActivity } from '@/lib/activity-logger';
import { config } from '@/lib/env';

// Minimum response time to prevent timing attacks
const MIN_RESPONSE_TIME_MS = 500;

/**
 * Add artificial delay to ensure consistent response time
 */
async function ensureMinResponseTime<T>(startTime: number, response: T): Promise<T> {
  const elapsed = Date.now() - startTime;
  const remaining = MIN_RESPONSE_TIME_MS - elapsed;
  if (remaining > 0) {
    await new Promise(resolve => setTimeout(resolve, remaining));
  }
  return response;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Apply rate limiting
    const rateLimited = rateLimitMiddleware(request, 'authStrict');
    if (rateLimited) {
      return ensureMinResponseTime(startTime, rateLimited);
    }
    
    // Get authenticated user
    const session = await auth();
    if (!session?.user?.id) {
      return ensureMinResponseTime(startTime, NextResponse.json(
        { error: 'You must be signed in to change your password' },
        { status: 401 }
      ));
    }
    
    const body = await request.json();
    
    // Validate input
    const result = changePasswordSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: result.error.flatten().fieldErrors 
        },
        { status: 400 }
      );
    }
    
    const { currentPassword, newPassword } = result.data;
    
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, passwordHash: true },
    });
    
    if (!user) {
      return ensureMinResponseTime(startTime, NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      ));
    }
    
    // Check if user has a password (might be OAuth-only account)
    if (!user.passwordHash) {
      return ensureMinResponseTime(startTime, NextResponse.json(
        { error: 'Cannot change password for accounts that use social login' },
        { status: 400 }
      ));
    }
    
    // Verify current password
    const isValidPassword = await verifyPassword(currentPassword, user.passwordHash);
    if (!isValidPassword) {
      // Log failed attempt for security audit
      await logActivity({
        userId: user.id,
        action: 'LOGIN_FAILED',
        entityType: 'Security',
        entityId: user.id,
        metadata: { reason: 'Invalid current password during password change' },
        ipAddress: getClientIdentifier(request),
      });
      
      return ensureMinResponseTime(startTime, NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 }
      ));
    }
    
    // Hash the new password
    const newPasswordHash = await hashPassword(newPassword);
    
    // Update password and increment sessionVersion to invalidate other sessions
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        sessionVersion: { increment: 1 },
      },
    });
    
    // Log successful password change
    await logActivity({
      userId: user.id,
      action: 'PASSWORD_CHANGED',
      entityType: 'Security',
      entityId: user.id,
      metadata: { method: 'user_initiated' },
      ipAddress: getClientIdentifier(request),
    });
    
    // SECURITY: Only log in development
    if (config.isDev) {
      console.log(`[DEV] Password changed for user: ${user.email}`);
    }
    
    return ensureMinResponseTime(startTime, NextResponse.json({
      message: 'Your password has been changed successfully. You may need to sign in again on other devices.',
    }));
  } catch (error) {
    console.error('Change password error:', error);
    return ensureMinResponseTime(startTime, NextResponse.json(
      { error: 'An error occurred while changing your password' },
      { status: 500 }
    ));
  }
}
