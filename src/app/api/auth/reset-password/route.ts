/**
 * Reset Password API Route
 * 
 * POST /api/auth/reset-password
 * 
 * Completes the password reset flow by validating the token
 * and updating the user's password.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { hashPassword } from '@/lib/auth/auth';
import { rateLimitMiddleware } from '@/lib/rate-limit';
import { config } from '@/lib/env';

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export async function POST(request: NextRequest) {
  try {
    // Apply strict rate limiting to prevent brute force attacks on tokens
    const rateLimited = rateLimitMiddleware(request, 'authStrict');
    if (rateLimited) {
      return rateLimited;
    }
    
    const body = await request.json();
    
    // Validate input
    const result = resetPasswordSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: result.error.flatten().fieldErrors 
        },
        { status: 400 }
      );
    }
    
    const { token, password } = result.data;
    
    // Hash the new password before transaction (expensive operation)
    const passwordHash = await hashPassword(password);
    
    // Use transaction to prevent race conditions:
    // Delete token first (atomically claiming it), then update password
    const userEmail = await prisma.$transaction(async (tx) => {
      // First, try to delete the token (this atomically claims it)
      // Only unexpired tokens are valid
      const deletedToken = await tx.verificationToken.findFirst({
        where: { 
          token,
          expires: { gt: new Date() },
        },
      });
      
      if (!deletedToken) {
        throw new Error('INVALID_OR_EXPIRED_TOKEN');
      }
      
      // Delete the token immediately to prevent reuse
      await tx.verificationToken.delete({
        where: { token },
      });
      
      // Find user by email (identifier)
      const user = await tx.user.findUnique({
        where: { email: deletedToken.identifier },
      });
      
      if (!user) {
        throw new Error('USER_NOT_FOUND');
      }
      
      // Update user password
      await tx.user.update({
        where: { id: user.id },
        data: { passwordHash },
      });
      
      return user.email;
    });
    
    // SECURITY: Only log in development to prevent PII leakage
    if (config.isDev) {
      console.log(`[DEV] Password reset completed for: ${userEmail}`);
    }
    
    return NextResponse.json({
      message: 'Your password has been reset successfully. You can now sign in.',
    });
  } catch (error) {
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message === 'INVALID_OR_EXPIRED_TOKEN') {
        return NextResponse.json(
          { error: 'Invalid or expired reset link. Please request a new one.' },
          { status: 400 }
        );
      }
      if (error.message === 'USER_NOT_FOUND') {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 400 }
        );
      }
    }
    
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'An error occurred while resetting your password' },
      { status: 500 }
    );
  }
}
