/**
 * Resend Verification Email API Route
 * 
 * POST /api/auth/resend-verification
 * 
 * Resends the email verification link to a user who hasn't verified yet.
 * Rate limited to prevent abuse.
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { rateLimitMiddleware } from '@/lib/rate-limit';
import { config } from '@/lib/env';
import { emailService } from '@/lib/email/email-service';

const resendSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export async function POST(request: NextRequest) {
  try {
    // Apply strict rate limiting to prevent abuse
    const rateLimited = rateLimitMiddleware(request, 'authStrict');
    if (rateLimited) {
      return rateLimited;
    }

    const body = await request.json();
    
    // Validate input
    const result = resendSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Please provide a valid email address' },
        { status: 400 }
      );
    }

    const { email } = result.data;

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
        role: true,
      },
    });

    // SECURITY: Always return success to prevent email enumeration
    // Even if user doesn't exist or is already verified
    if (!user) {
      return NextResponse.json({
        message: 'If an account exists with this email and is unverified, a new verification link has been sent.',
      });
    }

    // Check if already verified
    if (user.emailVerified) {
      return NextResponse.json({
        message: 'If an account exists with this email and is unverified, a new verification link has been sent.',
      });
    }

    // Delete any existing verification tokens for this email
    await prisma.verificationToken.deleteMany({
      where: { identifier: email },
    });

    // Create new verification token (24 hour expiry)
    const token = randomUUID();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires,
      },
    });

    // Send verification email
    const siteSettings = await prisma.siteSettings.findUnique({
      where: { id: 'default' },
      select: { websiteUrl: true, name: true },
    });

    const baseUrl = siteSettings?.websiteUrl || config.app.url || 'http://localhost:3000';
    const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${token}`;
    const userName = user.name || email.split('@')[0];

    // Send email asynchronously
    emailService.sendTemplatedEmail({
      to: email,
      templateType: 'email_verification',
      variables: {
        userName,
        verifyUrl,
        expiresIn: '24 hours',
      },
    }).catch((err) => {
      console.error('Failed to send verification email:', err);
    });

    // SECURITY: Only log in development
    if (config.isDev) {
      console.log(`[DEV] Resent verification email to: ${email}`);
    }

    return NextResponse.json({
      message: 'If an account exists with this email and is unverified, a new verification link has been sent.',
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    return NextResponse.json(
      { error: 'An error occurred while sending the verification email' },
      { status: 500 }
    );
  }
}
