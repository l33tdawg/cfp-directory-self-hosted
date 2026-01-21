/**
 * Forgot Password API Route
 * 
 * POST /api/auth/forgot-password
 * 
 * Initiates a password reset flow by sending a reset link to the user's email.
 * Note: This requires SMTP to be configured to actually send emails.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { prisma } from '@/lib/db/prisma';
import { config } from '@/lib/env';
import { rateLimitMiddleware } from '@/lib/rate-limit';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

// Minimum response time to prevent timing oracle attacks
const MIN_RESPONSE_TIME_MS = 500;

/**
 * Add artificial delay to ensure consistent response time
 * This prevents attackers from using response timing to determine if an email exists
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
    // Apply strict rate limiting to prevent abuse
    const rateLimited = rateLimitMiddleware(request, 'authStrict');
    if (rateLimited) {
      return ensureMinResponseTime(startTime, rateLimited);
    }
    
    const body = await request.json();
    
    // Validate input
    const result = forgotPasswordSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }
    
    const { email } = result.data;
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });
    
    // Always return success to prevent email enumeration
    // But only create token and send email if user exists
    if (user) {
      // Generate cryptographically secure reset token (256 bits of entropy)
      // Using crypto.randomBytes instead of UUID for better security
      const token = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + 3600000); // 1 hour
      
      // Create verification token
      await prisma.verificationToken.create({
        data: {
          identifier: email,
          token,
          expires,
        },
      });
      
      const resetUrl = `${config.app.url}/auth/reset-password?token=${token}`;
      
      // Send email if SMTP is configured
      if (config.email.enabled) {
        // TODO: Implement email sending
        // In production, you would send an email here:
        // await sendPasswordResetEmail(email, resetUrl);
        
        // SECURITY: Do not log tokens in production
        if (config.isDev) {
          console.log(`[DEV] Password reset link for ${email}: ${resetUrl}`);
        }
      } else {
        // Only log in development when SMTP isn't configured
        // SECURITY: Never log tokens in production environments
        if (config.isDev) {
          console.log(`[DEV] Password reset link for ${email}: ${resetUrl}`);
        } else {
          console.warn(`Password reset requested for ${email} but SMTP is not configured`);
        }
      }
    }
    
    // Always return success with consistent timing
    return ensureMinResponseTime(startTime, NextResponse.json({
      message: 'If an account exists with this email, a password reset link has been sent.',
    }));
  } catch (error) {
    console.error('Forgot password error:', error);
    return ensureMinResponseTime(startTime, NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    ));
  }
}
