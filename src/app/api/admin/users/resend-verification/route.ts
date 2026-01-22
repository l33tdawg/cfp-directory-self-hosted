/**
 * Admin Resend Verification Email API Route
 * 
 * POST /api/admin/users/resend-verification
 * 
 * Allows admins to resend verification emails to unverified users.
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { config } from '@/lib/env';
import { emailService } from '@/lib/email/email-service';
import { logActivity } from '@/lib/activity-logger';
import { getClientIdentifier } from '@/lib/rate-limit';
import { decryptPiiFields, USER_PII_FIELDS } from '@/lib/security/encryption';

const resendSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  email: z.string().email('Valid email is required'),
});

export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify admin role
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (currentUser?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    // Validate input
    const result = resendSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }

    const { userId, email } = result.data;

    // Find the user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if already verified
    if (user.emailVerified) {
      return NextResponse.json(
        { error: 'User email is already verified' },
        { status: 400 }
      );
    }

    // Delete any existing verification tokens for this user
    await prisma.verificationToken.deleteMany({
      where: { identifier: user.email },
    });

    // Create new verification token (24 hour expiry)
    const token = randomUUID();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.verificationToken.create({
      data: {
        identifier: user.email,
        token,
        expires,
      },
    });

    // Decrypt user name for email
    const decryptedUser = decryptPiiFields(
      user as unknown as Record<string, unknown>,
      USER_PII_FIELDS
    );

    // Get site settings for base URL
    const siteSettings = await prisma.siteSettings.findUnique({
      where: { id: 'default' },
      select: { websiteUrl: true, name: true },
    });

    const baseUrl = siteSettings?.websiteUrl || config.app.url || 'http://localhost:3000';
    const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${token}`;
    const userName = (decryptedUser.name as string) || email.split('@')[0];

    // Send verification email
    await emailService.sendTemplatedEmail({
      to: email,
      templateType: 'email_verification',
      variables: {
        userName,
        verifyUrl,
        expiresIn: '24 hours',
      },
    });

    // Log the activity
    await logActivity({
      userId: session.user.id,
      action: 'USER_VERIFICATION_RESENT',
      entityType: 'User',
      entityId: userId,
      metadata: {
        targetEmail: email,
        sentByAdmin: true,
      },
      ipAddress: getClientIdentifier(request),
    });

    return NextResponse.json({
      message: 'Verification email sent successfully',
    });
  } catch (error) {
    console.error('Admin resend verification error:', error);
    return NextResponse.json(
      { error: 'Failed to send verification email' },
      { status: 500 }
    );
  }
}
