/**
 * User Registration API Route
 * 
 * POST /api/auth/register
 * 
 * Creates a new user account with email/password authentication.
 * The first registered user automatically becomes an admin.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { hashPassword } from '@/lib/auth/auth';

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

export async function POST(request: Request) {
  try {
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
    
    // Check if email is already registered
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }
    
    // Check if this is the first user (will become admin)
    const userCount = await prisma.user.count();
    const isFirstUser = userCount === 0;
    
    // Hash password
    const passwordHash = await hashPassword(password);
    
    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        role: isFirstUser ? 'ADMIN' : 'USER',
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
    
    // Log the registration
    console.log(
      `User registered: ${user.email}${isFirstUser ? ' (First user - granted ADMIN role)' : ''}`
    );
    
    return NextResponse.json(
      { 
        message: isFirstUser 
          ? 'Account created successfully! You have been granted admin access as the first user.'
          : 'Account created successfully!',
        user,
        isFirstUser,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'An error occurred during registration' },
      { status: 500 }
    );
  }
}
