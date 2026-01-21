/**
 * User Registration API Route
 * 
 * POST /api/auth/register
 * 
 * Creates a new user account with email/password authentication.
 * The first registered user automatically becomes an admin.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { hashPassword } from '@/lib/auth/auth';
import { encryptPiiFields, decryptPiiFields, USER_PII_FIELDS } from '@/lib/security/encryption';
import { rateLimitMiddleware } from '@/lib/rate-limit';

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
    // This ensures the "first user check" and "create user" are atomic
    const { user, isFirstUser } = await prisma.$transaction(async (tx) => {
      // Check if email is already registered
      const existingUser = await tx.user.findUnique({
        where: { email },
      });
      
      if (existingUser) {
        throw new Error('EMAIL_ALREADY_EXISTS');
      }
      
      // Check if this is the first user (will become admin)
      const userCount = await tx.user.count();
      const isFirst = userCount === 0;
      
      // Create user
      const newUser = await tx.user.create({
        data: {
          email,
          passwordHash,
          name: encryptedData.name as string | undefined,
          role: isFirst ? 'ADMIN' : 'USER',
          // Email verification would be set here if SMTP is configured
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
      
      return { user: newUser, isFirstUser: isFirst };
    }, {
      isolationLevel: 'Serializable', // Prevents race conditions
    });
    
    // Decrypt PII for response
    const decryptedUser = decryptPiiFields(user as Record<string, unknown>, USER_PII_FIELDS);
    
    // Log the registration
    console.log(
      `User registered: ${user.email}${isFirstUser ? ' (First user - granted ADMIN role)' : ''}`
    );
    
    return NextResponse.json(
      { 
        message: isFirstUser 
          ? 'Account created successfully! You have been granted admin access as the first user.'
          : 'Account created successfully!',
        user: decryptedUser,
        isFirstUser,
      },
      { status: 201 }
    );
  } catch (error) {
    // Handle specific error types
    if (error instanceof Error && error.message === 'EMAIL_ALREADY_EXISTS') {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }
    
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'An error occurred during registration' },
      { status: 500 }
    );
  }
}
