/**
 * User Registration API Route
 * 
 * POST /api/auth/register
 * 
 * Creates a new user account with email/password authentication.
 * 
 * SECURITY: This endpoint respects ALLOW_PUBLIC_SIGNUP setting.
 * By default, public signup is DISABLED to prevent unauthorized account creation.
 * Initial admin should be created via /api/setup/complete with SETUP_TOKEN.
 * 
 * To enable public signup, set ALLOW_PUBLIC_SIGNUP=true in environment.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { hashPassword } from '@/lib/auth/auth';
import { encryptPiiFields, decryptPiiFields, USER_PII_FIELDS } from '@/lib/security/encryption';
import { rateLimitMiddleware } from '@/lib/rate-limit';
import { config } from '@/lib/env';

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
    
    // SECURITY: Check if public signup is allowed
    // By default, public signup is DISABLED to prevent fresh-install takeover attacks.
    // Admin accounts should be created via /api/setup/complete with SETUP_TOKEN.
    if (!config.allowPublicSignup) {
      return NextResponse.json(
        { error: 'Public registration is disabled. Please contact an administrator for an invitation.' },
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
    const user = await prisma.$transaction(async (tx) => {
      // Check if email is already registered
      const existingUser = await tx.user.findUnique({
        where: { email },
      });
      
      if (existingUser) {
        throw new Error('EMAIL_ALREADY_EXISTS');
      }
      
      // SECURITY: Public registration NEVER creates admin accounts.
      // First admin must be created via /api/setup/complete with SETUP_TOKEN.
      // This prevents fresh-install takeover attacks where an attacker races
      // to register before the legitimate owner.
      const newUser = await tx.user.create({
        data: {
          email,
          passwordHash,
          name: encryptedData.name as string | undefined,
          role: 'USER', // Always USER role for public registration
          emailVerified: null,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
        },
      });
      
      return newUser;
    }, {
      isolationLevel: 'Serializable',
    });
    
    // Decrypt PII for response
    const decryptedUser = decryptPiiFields(user as Record<string, unknown>, USER_PII_FIELDS);
    
    // SECURITY: Only log registration details in development to prevent PII leakage
    if (config.isDev) {
      console.log(`[DEV] User registered: ${user.email}`);
    }
    
    return NextResponse.json(
      { 
        message: 'Account created successfully!',
        user: decryptedUser,
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
          message: 'If this email is available, your account has been created. Please check your email to verify.',
          // Don't include user data or isFirstUser for existing emails
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
