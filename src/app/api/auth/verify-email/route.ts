/**
 * Email Verification API Route
 * 
 * GET /api/auth/verify-email?token=xxx
 * 
 * Handles email verification links clicked from verification emails.
 * Validates the token, marks the user's email as verified, and redirects
 * to the sign-in page.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { rateLimitMiddleware, getClientIdentifier } from '@/lib/rate-limit';
import { logActivity } from '@/lib/activity-logger';

export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimited = rateLimitMiddleware(request, 'api');
    if (rateLimited) {
      return rateLimited;
    }

    const token = request.nextUrl.searchParams.get('token');

    if (!token) {
      return NextResponse.redirect(
        new URL('/auth/error?error=MissingToken', request.url)
      );
    }

    // Find the verification token
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!verificationToken) {
      return NextResponse.redirect(
        new URL('/auth/error?error=InvalidToken', request.url)
      );
    }

    // Check if token has expired
    if (verificationToken.expires < new Date()) {
      // Delete expired token
      await prisma.verificationToken.delete({
        where: { token },
      });

      return NextResponse.redirect(
        new URL('/auth/error?error=TokenExpired', request.url)
      );
    }

    // Find user by email (identifier)
    const user = await prisma.user.findUnique({
      where: { email: verificationToken.identifier },
    });

    if (!user) {
      // User doesn't exist anymore, clean up token
      await prisma.verificationToken.delete({
        where: { token },
      });

      return NextResponse.redirect(
        new URL('/auth/error?error=UserNotFound', request.url)
      );
    }

    // Check if already verified
    if (user.emailVerified) {
      // Already verified, clean up token and redirect to sign in
      await prisma.verificationToken.delete({
        where: { token },
      });

      return NextResponse.redirect(
        new URL('/auth/signin?verified=already', request.url)
      );
    }

    // Mark email as verified and delete the token in a transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
      }),
      prisma.verificationToken.delete({
        where: { token },
      }),
    ]);

    // Log the verification activity
    await logActivity({
      userId: user.id,
      action: 'USER_EMAIL_VERIFIED',
      entityType: 'User',
      entityId: user.id,
      metadata: {
        email: user.email,
      },
      ipAddress: getClientIdentifier(request),
    });

    // Redirect to sign-in page with success message
    return NextResponse.redirect(
      new URL('/auth/signin?verified=true', request.url)
    );
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.redirect(
      new URL('/auth/error?error=VerificationFailed', request.url)
    );
  }
}
