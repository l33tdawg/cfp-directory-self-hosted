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
import crypto from 'crypto';
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

// Minimum response time to prevent timing oracle attacks
const MIN_RESPONSE_TIME_MS = 500;

/**
 * Add artificial delay to ensure consistent response time
 * This prevents attackers from using response timing to determine token validity
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
    // Apply strict rate limiting to prevent brute force attacks on tokens
    const rateLimited = rateLimitMiddleware(request, 'authStrict');
    if (rateLimited) {
      return ensureMinResponseTime(startTime, rateLimited);
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
    
    // SECURITY: Hash the incoming token to match against stored hash
    // Tokens are stored as SHA-256 hashes to protect against database exposure
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    // Hash the new password before transaction (expensive operation)
    const passwordHash = await hashPassword(password);
    
    // Use transaction to prevent race conditions:
    // Delete token first (atomically claiming it), then update password
    const userEmail = await prisma.$transaction(async (tx) => {
      // First, try to find and delete the token (this atomically claims it)
      // Only unexpired tokens are valid
      // Note: We compare against the hash, not the plaintext token
      const deletedToken = await tx.verificationToken.findFirst({
        where: { 
          token: tokenHash, // Compare hash against stored hash
          expires: { gt: new Date() },
        },
      });
      
      if (!deletedToken) {
        throw new Error('INVALID_OR_EXPIRED_TOKEN');
      }
      
      // Delete the token immediately to prevent reuse
      await tx.verificationToken.delete({
        where: { token: tokenHash },
      });
      
      // Find user by email (identifier)
      const user = await tx.user.findUnique({
        where: { email: deletedToken.identifier },
      });
      
      if (!user) {
        throw new Error('USER_NOT_FOUND');
      }
      
      // Update user password and invalidate existing sessions
      // SECURITY: Increment sessionVersion to force re-authentication
      // This prevents old sessions from remaining valid after password change
      await tx.user.update({
        where: { id: user.id },
        data: { 
          passwordHash,
          sessionVersion: { increment: 1 },
        },
      });
      
      return user.email;
    });
    
    // SECURITY: Only log in development to prevent PII leakage
    if (config.isDev) {
      console.log(`[DEV] Password reset completed for: ${userEmail}`);
    }
    
    return ensureMinResponseTime(startTime, NextResponse.json({
      message: 'Your password has been reset successfully. You can now sign in.',
    }));
  } catch (error) {
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message === 'INVALID_OR_EXPIRED_TOKEN') {
        return ensureMinResponseTime(startTime, NextResponse.json(
          { error: 'Invalid or expired reset link. Please request a new one.' },
          { status: 400 }
        ));
      }
      if (error.message === 'USER_NOT_FOUND') {
        return ensureMinResponseTime(startTime, NextResponse.json(
          { error: 'Invalid or expired reset link. Please request a new one.' },
          { status: 400 }
        ));
      }
    }
    
    console.error('Reset password error:', error);
    return ensureMinResponseTime(startTime, NextResponse.json(
      { error: 'An error occurred while resetting your password' },
      { status: 500 }
    ));
  }
}
