/**
 * User Registration API Route
 * 
 * POST /api/auth/register
 * 
 * Creates a new SPEAKER account with email/password authentication.
 * This endpoint is for speakers who want to submit talks to events.
 * 
 * SECURITY: This endpoint respects the allowPublicSignup setting in SiteSettings.
 * By default, public signup is DISABLED - users must be invited by an admin.
 * Initial admin should be created via /api/setup/complete with SETUP_TOKEN.
 * 
 * When enabled, registered users are created with SPEAKER role.
 * Other roles (REVIEWER, ORGANIZER, ADMIN) must be invited by an admin.
 * 
 * Users must verify their email before they can sign in.
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { hashPassword } from '@/lib/auth/auth';
import { encryptPiiFields, USER_PII_FIELDS } from '@/lib/security/encryption';
import { rateLimitMiddleware } from '@/lib/rate-limit';
import { config } from '@/lib/env';
import { emailService } from '@/lib/email/email-service';

// Validation schema for registration
const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Apply strict rate limiting to prevent abuse and brute force
    const rateLimited = rateLimitMiddleware(request, 'authStrict');
    if (rateLimited) {
      return rateLimited;
    }
    
    // SECURITY: Check if public signup is allowed from database settings
    // By default, public signup is DISABLED - only invited users can register.
    // Admin accounts should be created via /api/setup/complete with SETUP_TOKEN.
    const settings = await prisma.siteSettings.findUnique({
      where: { id: 'default' },
      select: { allowPublicSignup: true },
    });
    
    if (!settings?.allowPublicSignup) {
      return NextResponse.json(
        { 
          error: 'Speaker registration is currently disabled. Please contact an organizer for an invitation.',
          signupDisabled: true,
        },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    
    // Validate input
    const result = registerSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: result.error.flatten().fieldErrors 
        },
        { status: 400 }
      );
    }
    
    const { email, password, name } = result.data;
    
    // Hash password before transaction (expensive operation)
    const passwordHash = await hashPassword(password);
    
    // Encrypt PII fields before storage
    const encryptedData = encryptPiiFields({ name }, USER_PII_FIELDS);
    
    // Use serializable transaction to prevent race conditions
    const { user, verificationToken } = await prisma.$transaction(async (tx) => {
      // Check if email is already registered
      const existingUser = await tx.user.findUnique({
        where: { email },
      });
      
      if (existingUser) {
        throw new Error('EMAIL_ALREADY_EXISTS');
      }
      
      // SECURITY: Public registration creates SPEAKER accounts only.
      // First admin must be created via /api/setup/complete with SETUP_TOKEN.
      // Other roles (REVIEWER, ORGANIZER, ADMIN) must be invited by an admin.
      // This prevents unauthorized privilege escalation.
      const newUser = await tx.user.create({
        data: {
          email,
          passwordHash,
          name: encryptedData.name as string | undefined,
          role: 'SPEAKER', // Speakers can self-register, others must be invited
          emailVerified: null, // Must verify email before signing in
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
        },
      });
      
      // Create verification token (24 hour expiry)
      const token = randomUUID();
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      await tx.verificationToken.create({
        data: {
          identifier: email,
          token,
          expires,
        },
      });
      
      return { user: newUser, verificationToken: token };
    }, {
      isolationLevel: 'Serializable',
    });
    
    // Send verification email (fire and forget - don't block response)
    const siteSettings = await prisma.siteSettings.findUnique({
      where: { id: 'default' },
      select: { websiteUrl: true, name: true },
    });
    
    const baseUrl = siteSettings?.websiteUrl || config.app.url || 'http://localhost:3000';
    const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${verificationToken}`;
    const userName = name || email.split('@')[0];
    
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
    
    // SECURITY: Only log registration details in development to prevent PII leakage
    if (config.isDev) {
      console.log(`[DEV] User registered: ${user.email}, verification email sent`);
    }
    
    return NextResponse.json(
      { 
        message: 'Account created! Please check your email to verify your account.',
        requiresVerification: true,
        email: user.email,
      },
      { status: 201 }
    );
  } catch (error) {
    // Handle specific error types
    if (error instanceof Error && error.message === 'EMAIL_ALREADY_EXISTS') {
      // SECURITY: Return a generic message to prevent email enumeration
      // Attackers could use different status codes to determine if emails exist
      // Rate limiting helps mitigate this, but a uniform response is better
      return NextResponse.json(
        { 
          message: 'Account created! Please check your email to verify your account.',
          requiresVerification: true,
          // Don't include actual email to prevent enumeration
        },
        { status: 201 } // Same status code as success to prevent enumeration
      );
    }
    
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'An error occurred during registration' },
      { status: 500 }
    );
  }
}
