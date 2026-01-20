/**
 * Reviewer Onboarding Progress API
 * 
 * GET: Get current onboarding progress
 * POST: Save onboarding step progress
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { validateReviewerOnboardingStep } from '@/lib/validations/reviewer-profile';
import { Prisma } from '@prisma/client';

/**
 * GET /api/reviewer-profile/onboarding
 * Get current onboarding progress
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
      select: {
        onboardingCompleted: true,
        onboardingStep: true,
        fullName: true,
        designation: true,
        company: true,
        bio: true,
        linkedinUrl: true,
        twitterHandle: true,
        githubUsername: true,
        websiteUrl: true,
        hasReviewedBefore: true,
        conferencesReviewed: true,
        expertiseAreas: true,
        yearsOfExperience: true,
        reviewCriteria: true,
        additionalNotes: true,
        hoursPerWeek: true,
        preferredEventSize: true,
      },
    });

    // If no profile exists, they're at step 1
    if (!profile) {
      return NextResponse.json({
        onboardingCompleted: false,
        onboardingStep: 1,
        savedData: null,
      });
    }

    return NextResponse.json({
      onboardingCompleted: profile.onboardingCompleted,
      onboardingStep: profile.onboardingStep,
      savedData: profile,
    });
  } catch (error) {
    console.error('Error fetching onboarding progress:', error);
    return NextResponse.json(
      { error: 'Failed to fetch progress' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/reviewer-profile/onboarding
 * Save onboarding step progress
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

    const body = await request.json();
    const { step, data, complete } = body;

    if (typeof step !== 'number' || step < 1 || step > 4) {
      return NextResponse.json(
        { error: 'Invalid step number' },
        { status: 400 }
      );
    }

    // Validate step data
    const validationResult = validateReviewerOnboardingStep(step, data);
    if (!validationResult.success && !complete) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error?.issues },
        { status: 400 }
      );
    }

    // Build update data based on step
    const updateData: Prisma.ReviewerProfileUpdateInput = {
      onboardingStep: step,
    };

    switch (step) {
      case 1:
        updateData.fullName = data.fullName;
        updateData.designation = data.designation || null;
        updateData.company = data.company || null;
        updateData.bio = data.bio;
        updateData.linkedinUrl = data.linkedinUrl || null;
        updateData.twitterHandle = data.twitterHandle?.replace('@', '') || null;
        updateData.githubUsername = data.githubUsername || null;
        updateData.websiteUrl = data.websiteUrl || null;
        updateData.hasReviewedBefore = data.hasReviewedBefore;
        updateData.conferencesReviewed = data.conferencesReviewed || null;
        break;
      case 2:
        updateData.expertiseAreas = data.expertiseAreas;
        updateData.yearsOfExperience = data.yearsOfExperience;
        break;
      case 3:
        updateData.reviewCriteria = data.reviewCriteria;
        updateData.additionalNotes = data.additionalNotes || null;
        break;
      case 4:
        updateData.hoursPerWeek = data.hoursPerWeek;
        updateData.preferredEventSize = data.preferredEventSize;
        if (complete) {
          updateData.onboardingCompleted = true;
        }
        break;
    }

    // Check if profile exists
    const existingProfile = await prisma.reviewerProfile.findUnique({
      where: { userId: session.user.id },
    });

    let profile;
    if (existingProfile) {
      // Update existing profile
      profile = await prisma.reviewerProfile.update({
        where: { userId: session.user.id },
        data: updateData,
      });
    } else {
      // Create new profile with required fields
      profile = await prisma.reviewerProfile.create({
        data: {
          userId: session.user.id,
          fullName: data.fullName || session.user.name || 'Unknown',
          bio: data.bio || null,
          designation: data.designation || null,
          company: data.company || null,
          linkedinUrl: data.linkedinUrl || null,
          twitterHandle: data.twitterHandle?.replace('@', '') || null,
          githubUsername: data.githubUsername || null,
          websiteUrl: data.websiteUrl || null,
          hasReviewedBefore: data.hasReviewedBefore || false,
          conferencesReviewed: data.conferencesReviewed || null,
          expertiseAreas: data.expertiseAreas || [],
          yearsOfExperience: data.yearsOfExperience || null,
          reviewCriteria: data.reviewCriteria || [],
          additionalNotes: data.additionalNotes || null,
          hoursPerWeek: data.hoursPerWeek || '2-5',
          preferredEventSize: data.preferredEventSize || 'any',
          onboardingStep: step,
          onboardingCompleted: complete || false,
        },
      });
    }

    // If completing onboarding, update user role to REVIEWER
    if (complete) {
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
    }

    return NextResponse.json({
      success: true,
      profile,
      message: complete ? 'Onboarding completed!' : `Step ${step} saved`,
    });
  } catch (error) {
    console.error('Error saving onboarding progress:', error);
    return NextResponse.json(
      { error: 'Failed to save progress' },
      { status: 500 }
    );
  }
}
