/**
 * Invitation Acceptance API Route
 * 
 * GET /api/auth/invite?token=xxx - Validate invitation token
 * POST /api/auth/invite - Accept invitation and create account
 * 
 * This endpoint handles invitation-based registration for:
 * - Reviewers
 * - Organizers
 * - Admins
 * - Users/Speakers (when public signup is disabled)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { hashPassword } from '@/lib/auth/auth';
import { encryptPiiFields, decryptPiiFields, USER_PII_FIELDS } from '@/lib/security/encryption';
import { rateLimitMiddleware } from '@/lib/rate-limit';

// Schema for accepting invitation
const acceptInviteSchema = z.object({
  token: z.string().min(1, 'Invitation token is required'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

/**
 * GET - Validate invitation token and return invitation details
 */
export async function GET(request: NextRequest) {
  try {
    const rateLimited = rateLimitMiddleware(request, 'api');
    if (rateLimited) {
      return rateLimited;
    }

    const token = request.nextUrl.searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Invitation token is required' },
        { status: 400 }
      );
    }

    // Find the invitation
    const invitation = await prisma.userInvitation.findUnique({
      where: { token },
      include: {
        inviter: {
          select: { name: true, email: true },
        },
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invalid invitation. The link may have been used or is incorrect.' },
        { status: 404 }
      );
    }

    // Check if already accepted
    if (invitation.acceptedAt) {
      return NextResponse.json(
        { error: 'This invitation has already been used. Please sign in instead.' },
        { status: 400 }
      );
    }

    // Check if expired
    if (invitation.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'This invitation has expired. Please request a new invitation.' },
        { status: 400 }
      );
    }

    // Check if email is already registered
    const existingUser = await prisma.user.findUnique({
      where: { email: invitation.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Please sign in instead.' },
        { status: 400 }
      );
    }

    // Decrypt inviter name for display
    const inviterName = invitation.inviter.name 
      ? (decryptPiiFields({ name: invitation.inviter.name }, USER_PII_FIELDS) as { name: string }).name
      : invitation.inviter.email;

    // Get organization name from site settings
    const siteSettings = await prisma.siteSettings.findUnique({
      where: { id: 'default' },
      select: { name: true },
    });

    return NextResponse.json({
      valid: true,
      email: invitation.email,
      role: invitation.role,
      invitedBy: inviterName,
      expiresAt: invitation.expiresAt,
      organizationName: siteSettings?.name || 'CFP System',
    });
  } catch (error) {
    console.error('Invitation validation error:', error);
    return NextResponse.json(
      { error: 'Failed to validate invitation' },
      { status: 500 }
    );
  }
}

/**
 * POST - Accept invitation and create account
 */
export async function POST(request: NextRequest) {
  try {
    // Apply strict rate limiting
    const rateLimited = rateLimitMiddleware(request, 'authStrict');
    if (rateLimited) {
      return rateLimited;
    }

    const body = await request.json();
    const result = acceptInviteSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: result.error.flatten().fieldErrors 
        },
        { status: 400 }
      );
    }

    const { token, name, password } = result.data;

    // Hash password before transaction
    const passwordHash = await hashPassword(password);

    // Encrypt name
    const encryptedData = encryptPiiFields({ name }, USER_PII_FIELDS);

    // Use serializable transaction
    const user = await prisma.$transaction(async (tx) => {
      // Find and validate invitation
      const invitation = await tx.userInvitation.findUnique({
        where: { token },
      });

      if (!invitation) {
        throw new Error('INVALID_INVITATION');
      }

      if (invitation.acceptedAt) {
        throw new Error('ALREADY_ACCEPTED');
      }

      if (invitation.expiresAt < new Date()) {
        throw new Error('EXPIRED_INVITATION');
      }

      // Check if email is already taken
      const existingUser = await tx.user.findUnique({
        where: { email: invitation.email },
      });

      if (existingUser) {
        throw new Error('EMAIL_ALREADY_EXISTS');
      }

      // Create the user with the invited role
      const newUser = await tx.user.create({
        data: {
          email: invitation.email,
          passwordHash,
          name: encryptedData.name as string,
          role: invitation.role,
          emailVerified: new Date(), // Auto-verify invited users
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
        },
      });

      // Mark invitation as accepted
      await tx.userInvitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      });

      return newUser;
    }, {
      isolationLevel: 'Serializable',
    });

    // Decrypt PII for response
    const decryptedUser = decryptPiiFields(user as Record<string, unknown>, USER_PII_FIELDS);

    // Log in dev only
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEV] User created via invitation: ${user.email} (${user.role})`);
    }

    return NextResponse.json(
      {
        message: 'Account created successfully! You can now sign in.',
        user: decryptedUser,
      },
      { status: 201 }
    );
  } catch (error) {
    // Handle specific error types
    if (error instanceof Error) {
      switch (error.message) {
        case 'INVALID_INVITATION':
          return NextResponse.json(
            { error: 'Invalid invitation. The link may have been used or is incorrect.' },
            { status: 404 }
          );
        case 'ALREADY_ACCEPTED':
          return NextResponse.json(
            { error: 'This invitation has already been used. Please sign in instead.' },
            { status: 400 }
          );
        case 'EXPIRED_INVITATION':
          return NextResponse.json(
            { error: 'This invitation has expired. Please request a new invitation.' },
            { status: 400 }
          );
        case 'EMAIL_ALREADY_EXISTS':
          return NextResponse.json(
            { error: 'An account with this email already exists. Please sign in instead.' },
            { status: 400 }
          );
      }
    }

    console.error('Invitation acceptance error:', error);
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    );
  }
}
