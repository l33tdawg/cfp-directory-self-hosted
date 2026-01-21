/**
 * Reviewer Profile API Routes
 * 
 * GET: Get current user's reviewer profile
 * POST: Create reviewer profile
 * PATCH: Update reviewer profile
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { reviewerProfileSchema } from '@/lib/validations/reviewer-profile';
import { encryptPiiFields, decryptPiiFields, REVIEWER_PROFILE_PII_FIELDS } from '@/lib/security/encryption';

/**
 * GET /api/reviewer-profile
 * Get current user's reviewer profile
 */
export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const profile = await prisma.reviewerProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!profile) {
      return NextResponse.json({ profile: null });
    }

    // Decrypt PII fields before returning
    const decryptedProfile = decryptPiiFields(
      profile as unknown as Record<string, unknown>,
      REVIEWER_PROFILE_PII_FIELDS
    );

    return NextResponse.json({ profile: decryptedProfile });
  } catch (error) {
    console.error('Error fetching reviewer profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/reviewer-profile
 * Create reviewer profile (complete onboarding)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if profile already exists
    const existingProfile = await prisma.reviewerProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (existingProfile) {
      return NextResponse.json(
        { error: 'Reviewer profile already exists' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validationResult = reviewerProfileSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Encrypt PII fields before storage
    const piiData = {
      fullName: data.fullName,
      designation: data.designation || null,
      company: data.company || null,
      bio: data.bio,
      linkedinUrl: data.linkedinUrl || null,
      twitterHandle: data.twitterHandle?.replace('@', '') || null,
      githubUsername: data.githubUsername || null,
      websiteUrl: data.websiteUrl || null,
      conferencesReviewed: data.conferencesReviewed || null,
    };
    const encryptedPii = encryptPiiFields(piiData, REVIEWER_PROFILE_PII_FIELDS);

    const profile = await prisma.reviewerProfile.create({
      data: {
        userId: session.user.id,
        fullName: encryptedPii.fullName as string,
        designation: encryptedPii.designation as string | null,
        company: encryptedPii.company as string | null,
        bio: encryptedPii.bio as string,
        linkedinUrl: encryptedPii.linkedinUrl as string | null,
        twitterHandle: encryptedPii.twitterHandle as string | null,
        githubUsername: encryptedPii.githubUsername as string | null,
        websiteUrl: encryptedPii.websiteUrl as string | null,
        hasReviewedBefore: data.hasReviewedBefore,
        conferencesReviewed: encryptedPii.conferencesReviewed as string | null,
        expertiseAreas: data.expertiseAreas,
        yearsOfExperience: data.yearsOfExperience,
        reviewCriteria: data.reviewCriteria,
        additionalNotes: data.additionalNotes || null,
        hoursPerWeek: data.hoursPerWeek,
        preferredEventSize: data.preferredEventSize,
        onboardingCompleted: true,
        onboardingStep: 4,
      },
    });

    // Update user role to REVIEWER if they're just a USER
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role === 'USER') {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { role: 'REVIEWER' },
      });
    }

    // Decrypt for response
    const decryptedProfile = decryptPiiFields(
      profile as unknown as Record<string, unknown>,
      REVIEWER_PROFILE_PII_FIELDS
    );

    return NextResponse.json({ 
      profile: decryptedProfile,
      message: 'Reviewer profile created successfully' 
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating reviewer profile:', error);
    return NextResponse.json(
      { error: 'Failed to create profile' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/reviewer-profile
 * Update reviewer profile
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const existingProfile = await prisma.reviewerProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!existingProfile) {
      return NextResponse.json(
        { error: 'Reviewer profile not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validationResult = reviewerProfileSchema.partial().safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const data = validationResult.data;
    const updateData: Record<string, unknown> = {};

    if (data.fullName !== undefined) updateData.fullName = data.fullName;
    if (data.designation !== undefined) updateData.designation = data.designation || null;
    if (data.company !== undefined) updateData.company = data.company || null;
    if (data.bio !== undefined) updateData.bio = data.bio;
    if (data.linkedinUrl !== undefined) updateData.linkedinUrl = data.linkedinUrl || null;
    if (data.twitterHandle !== undefined) updateData.twitterHandle = data.twitterHandle?.replace('@', '') || null;
    if (data.githubUsername !== undefined) updateData.githubUsername = data.githubUsername || null;
    if (data.websiteUrl !== undefined) updateData.websiteUrl = data.websiteUrl || null;
    if (data.hasReviewedBefore !== undefined) updateData.hasReviewedBefore = data.hasReviewedBefore;
    if (data.conferencesReviewed !== undefined) updateData.conferencesReviewed = data.conferencesReviewed || null;
    if (data.expertiseAreas !== undefined) updateData.expertiseAreas = data.expertiseAreas;
    if (data.yearsOfExperience !== undefined) updateData.yearsOfExperience = data.yearsOfExperience;
    if (data.reviewCriteria !== undefined) updateData.reviewCriteria = data.reviewCriteria;
    if (data.additionalNotes !== undefined) updateData.additionalNotes = data.additionalNotes || null;
    if (data.hoursPerWeek !== undefined) updateData.hoursPerWeek = data.hoursPerWeek;
    if (data.preferredEventSize !== undefined) updateData.preferredEventSize = data.preferredEventSize;
    
    // Handle showOnTeamPage from body directly (not in validation schema)
    if (body.showOnTeamPage !== undefined) updateData.showOnTeamPage = body.showOnTeamPage;

    // Encrypt PII fields before update
    const encryptedData = encryptPiiFields(updateData, REVIEWER_PROFILE_PII_FIELDS);

    const profile = await prisma.reviewerProfile.update({
      where: { userId: session.user.id },
      data: encryptedData,
    });

    // Decrypt for response
    const decryptedProfile = decryptPiiFields(
      profile as unknown as Record<string, unknown>,
      REVIEWER_PROFILE_PII_FIELDS
    );

    return NextResponse.json({ 
      profile: decryptedProfile,
      message: 'Profile updated successfully' 
    });
  } catch (error) {
    console.error('Error updating reviewer profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
