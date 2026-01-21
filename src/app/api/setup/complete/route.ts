/**
 * Complete Setup API
 * 
 * POST /api/setup/complete - Complete initial setup
 * 
 * Creates the first admin user and configures site settings.
 * Only works if no admin exists yet.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { hash } from 'bcryptjs';
import { z } from 'zod';
import { encryptPiiFields, USER_PII_FIELDS } from '@/lib/security/encryption';

const setupSchema = z.object({
  // Admin user
  adminName: z.string().min(2, 'Name must be at least 2 characters'),
  adminEmail: z.string().email('Invalid email address'),
  adminPassword: z.string().min(8, 'Password must be at least 8 characters'),
  
  // Site settings
  siteName: z.string().min(2, 'Site name must be at least 2 characters'),
  siteDescription: z.string().max(500).optional(),
  siteWebsite: z.string().url().optional().or(z.literal('')),
});

export async function POST(request: NextRequest) {
  try {
    // Check if setup is already complete
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
    });

    if (existingAdmin) {
      return NextResponse.json(
        { error: 'Setup already complete. An admin account exists.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validationResult = setupSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Check if email is already taken
    const existingUser = await prisma.user.findUnique({
      where: { email: data.adminEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await hash(data.adminPassword, 12);

    // Encrypt admin name
    const encryptedAdminData = encryptPiiFields({ name: data.adminName }, USER_PII_FIELDS);
    
    // Create admin user and update site settings in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create admin user
      const admin = await tx.user.create({
        data: {
          name: encryptedAdminData.name as string,
          email: data.adminEmail,
          passwordHash,
          role: 'ADMIN',
          emailVerified: new Date(), // Auto-verify first admin
        },
      });

      // Update or create site settings
      const settings = await tx.siteSettings.upsert({
        where: { id: 'default' },
        create: {
          id: 'default',
          name: data.siteName,
          description: data.siteDescription || null,
          websiteUrl: data.siteWebsite || null,
        },
        update: {
          name: data.siteName,
          description: data.siteDescription || null,
          websiteUrl: data.siteWebsite || null,
        },
      });

      return { admin, settings };
    });

    return NextResponse.json({
      success: true,
      message: 'Setup complete! You can now sign in.',
      adminEmail: result.admin.email,
      siteName: result.settings.name,
    }, { status: 201 });
  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json(
      { error: 'Failed to complete setup' },
      { status: 500 }
    );
  }
}
