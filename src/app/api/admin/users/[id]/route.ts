/**
 * Admin User Detail API
 * 
 * Get, update, and delete individual users.
 * Supports full profile editing with encryption.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth';
import { logActivity } from '@/lib/activity-logger';
import { getClientIdentifier } from '@/lib/rate-limit';
import { 
  encryptPiiFields, 
  decryptPiiFields,
  USER_PII_FIELDS,
  SPEAKER_PROFILE_PII_FIELDS, 
  REVIEWER_PROFILE_PII_FIELDS 
} from '@/lib/security/encryption';
import { z } from 'zod';

// Schema for updating user basic info
const updateUserSchema = z.object({
  role: z.enum(['USER', 'SPEAKER', 'REVIEWER', 'ORGANIZER', 'ADMIN']).optional(),
  name: z.string().optional(),
  email: z.string().email().optional(),
  
  // Speaker profile fields
  speakerProfile: z.object({
    fullName: z.string().optional(),
    bio: z.string().optional(),
    company: z.string().optional(),
    position: z.string().optional(),
    location: z.string().optional(),
    linkedinUrl: z.string().optional(),
    twitterHandle: z.string().optional(),
    githubUsername: z.string().optional(),
    websiteUrl: z.string().optional(),
    speakingExperience: z.string().optional(),
    expertiseTags: z.array(z.string()).optional(),
  }).optional(),
  
  // Reviewer profile fields
  reviewerProfile: z.object({
    fullName: z.string().optional(),
    designation: z.string().optional(),
    company: z.string().optional(),
    bio: z.string().optional(),
    linkedinUrl: z.string().optional(),
    twitterHandle: z.string().optional(),
    githubUsername: z.string().optional(),
    websiteUrl: z.string().optional(),
    yearsOfExperience: z.number().optional(),
    expertiseAreas: z.array(z.string()).optional(),
    hasReviewedBefore: z.boolean().optional(),
    conferencesReviewed: z.string().optional(),
  }).optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser();
    
    if (currentUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    // SECURITY: Use explicit select to avoid exposing sensitive fields
    // Never return passwordHash, sessionVersion, or other security-related fields
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        // Include related profiles with limited fields
        speakerProfile: {
          select: {
            id: true,
            fullName: true,
            bio: true,
            company: true,
            position: true,
            location: true,
            websiteUrl: true,
            linkedinUrl: true,
            twitterHandle: true,
            githubUsername: true,
            speakingExperience: true,
            expertiseTags: true,
            onboardingCompleted: true,
            createdAt: true,
          },
        },
        reviewerProfile: {
          select: {
            id: true,
            fullName: true,
            designation: true,
            company: true,
            bio: true,
            linkedinUrl: true,
            twitterHandle: true,
            githubUsername: true,
            websiteUrl: true,
            expertiseAreas: true,
            yearsOfExperience: true,
            hasReviewedBefore: true,
            conferencesReviewed: true,
            onboardingCompleted: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            submissions: true,
            reviews: true,
          },
        },
      },
    });
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Decrypt PII fields before returning
    const decryptedUser = decryptPiiFields(
      user as unknown as Record<string, unknown>,
      USER_PII_FIELDS
    );
    
    // Decrypt speaker profile if exists
    const decryptedSpeakerProfile = user.speakerProfile
      ? decryptPiiFields(
          user.speakerProfile as unknown as Record<string, unknown>,
          SPEAKER_PROFILE_PII_FIELDS
        )
      : null;
    
    // Decrypt reviewer profile if exists
    const decryptedReviewerProfile = user.reviewerProfile
      ? decryptPiiFields(
          user.reviewerProfile as unknown as Record<string, unknown>,
          REVIEWER_PROFILE_PII_FIELDS
        )
      : null;
    
    return NextResponse.json({
      ...user,
      name: decryptedUser.name,
      speakerProfile: decryptedSpeakerProfile,
      reviewerProfile: decryptedReviewerProfile,
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser();
    
    if (currentUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const validatedData = updateUserSchema.parse(body);
    
    // Prevent self-demotion from admin
    if (id === currentUser.id && validatedData.role && validatedData.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Cannot remove your own admin role' },
        { status: 400 }
      );
    }
    
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
      include: {
        speakerProfile: true,
        reviewerProfile: true,
      },
    });
    
    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Check if role is being changed - need to invalidate sessions
    const isRoleChange = validatedData.role && validatedData.role !== existingUser.role;
    
    // SECURITY: Prevent demoting the last admin
    if (isRoleChange && existingUser.role === 'ADMIN' && validatedData.role !== 'ADMIN') {
      const adminCount = await prisma.user.count({
        where: { role: 'ADMIN' },
      });
      
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot demote the last administrator. Promote another user to admin first.' },
          { status: 400 }
        );
      }
    }
    
    // Prepare user update data with encryption
    const userUpdateData: Record<string, unknown> = {};
    
    if (validatedData.role) {
      userUpdateData.role = validatedData.role;
    }
    
    if (validatedData.name !== undefined) {
      // Encrypt user name
      const encryptedUserData = encryptPiiFields(
        { name: validatedData.name },
        USER_PII_FIELDS
      );
      userUpdateData.name = encryptedUserData.name;
    }
    
    if (validatedData.email !== undefined) {
      // Check if email is already in use
      const existingEmail = await prisma.user.findFirst({
        where: { 
          email: validatedData.email,
          NOT: { id },
        },
      });
      
      if (existingEmail) {
        return NextResponse.json(
          { error: 'Email already in use' },
          { status: 400 }
        );
      }
      
      userUpdateData.email = validatedData.email;
    }
    
    // Increment sessionVersion on role change to invalidate existing JWT sessions
    if (isRoleChange) {
      userUpdateData.sessionVersion = { increment: 1 };
    }
    
    // Update user with transaction to handle profiles
    const updatedUser = await prisma.$transaction(async (tx) => {
      // Update main user record
      const user = await tx.user.update({
        where: { id },
        data: userUpdateData,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          image: true,
          createdAt: true,
        },
      });
      
      // Update speaker profile if provided
      if (validatedData.speakerProfile) {
        const { expertiseTags, ...speakerPiiData } = validatedData.speakerProfile;
        
        // Encrypt PII fields
        const encryptedSpeakerData = encryptPiiFields(
          speakerPiiData as Record<string, unknown>,
          SPEAKER_PROFILE_PII_FIELDS
        );
        
        // Prepare update data
        const speakerUpdateData: Record<string, unknown> = { ...encryptedSpeakerData };
        if (expertiseTags !== undefined) {
          speakerUpdateData.expertiseTags = expertiseTags;
        }
        
        if (existingUser.speakerProfile) {
          // Update existing profile
          await tx.speakerProfile.update({
            where: { id: existingUser.speakerProfile.id },
            data: speakerUpdateData,
          });
        } else {
          // Create new profile
          await tx.speakerProfile.create({
            data: {
              userId: id,
              ...speakerUpdateData,
              onboardingCompleted: true,
            } as Parameters<typeof tx.speakerProfile.create>[0]['data'],
          });
        }
      }
      
      // Update reviewer profile if provided
      if (validatedData.reviewerProfile) {
        const { expertiseAreas, yearsOfExperience, hasReviewedBefore, ...reviewerPiiData } = validatedData.reviewerProfile;
        
        // Encrypt PII fields
        const encryptedReviewerData = encryptPiiFields(
          reviewerPiiData as Record<string, unknown>,
          REVIEWER_PROFILE_PII_FIELDS
        );
        
        // Prepare update data
        const reviewerUpdateData: Record<string, unknown> = { ...encryptedReviewerData };
        if (expertiseAreas !== undefined) {
          reviewerUpdateData.expertiseAreas = expertiseAreas;
        }
        if (yearsOfExperience !== undefined) {
          reviewerUpdateData.yearsOfExperience = yearsOfExperience;
        }
        if (hasReviewedBefore !== undefined) {
          reviewerUpdateData.hasReviewedBefore = hasReviewedBefore;
        }
        
        if (existingUser.reviewerProfile) {
          // Update existing profile
          await tx.reviewerProfile.update({
            where: { id: existingUser.reviewerProfile.id },
            data: reviewerUpdateData,
          });
        } else {
          // Create new profile
          await tx.reviewerProfile.create({
            data: {
              userId: id,
              ...reviewerUpdateData,
              onboardingCompleted: true,
            } as Parameters<typeof tx.reviewerProfile.create>[0]['data'],
          });
        }
      }
      
      return user;
    });
    
    // Log the update for security audit
    await logActivity({
      userId: currentUser.id,
      action: isRoleChange ? 'USER_ROLE_CHANGED' : 'USER_UPDATED',
      entityType: 'User',
      entityId: id,
      metadata: {
        ...(isRoleChange && {
          previousRole: existingUser.role,
          newRole: validatedData.role,
        }),
        updatedFields: Object.keys(validatedData).join(', '),
        changedBy: currentUser.id,
        viaAdminRoute: true,
      },
      ipAddress: getClientIdentifier(request),
    });
    
    return NextResponse.json(updatedUser);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      );
    }
    
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser();
    
    if (currentUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    // Prevent self-deletion
    if (id === currentUser.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }
    
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });
    
    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // SECURITY: Prevent deleting the last admin
    if (existingUser.role === 'ADMIN') {
      const adminCount = await prisma.user.count({
        where: { role: 'ADMIN' },
      });
      
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot delete the last administrator' },
          { status: 400 }
        );
      }
    }
    
    // SECURITY: Log user deletion BEFORE deleting for audit trail
    // This captures the deletion event even if the database cascade is complex
    await logActivity({
      userId: currentUser.id,
      action: 'USER_DELETED',
      entityType: 'User',
      entityId: id,
      metadata: {
        deletedUserEmail: existingUser.email,
        deletedUserRole: existingUser.role,
        deletedBy: currentUser.id,
      },
      ipAddress: getClientIdentifier(request),
    });
    
    // Delete user (cascades will handle related records)
    await prisma.user.delete({
      where: { id },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
