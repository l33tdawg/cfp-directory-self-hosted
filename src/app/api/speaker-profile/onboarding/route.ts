/**
 * Speaker Onboarding API Routes
 * 
 * Handles onboarding progress tracking and step-by-step data saving:
 * - GET: Get current onboarding progress
 * - POST: Save onboarding progress (per step)
 * - PUT: Complete onboarding
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { 
  validateOnboardingStep,
  speakerProfileSchema,
  validateSocialLinks,
} from '@/lib/validations/speaker-profile';
import type { ExperienceLevel } from '@prisma/client';

/**
 * GET /api/speaker-profile/onboarding
 * Get current onboarding status and saved data
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

    const profile = await prisma.speakerProfile.findUnique({
      where: { userId: session.user.id },
    });

    // Also get user info for pre-population
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true, image: true },
    });

    return NextResponse.json({
      profile,
      user,
      onboardingCompleted: profile?.onboardingCompleted ?? false,
      currentStep: profile?.onboardingStep ?? 1,
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
 * POST /api/speaker-profile/onboarding
 * Save progress for a specific step (creates or updates profile)
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
    const { step, data } = body;

    if (!step || typeof step !== 'number' || step < 1 || step > 4) {
      return NextResponse.json(
        { error: 'Invalid step number' },
        { status: 400 }
      );
    }

    // Validate step data
    const validation = validateOnboardingStep(step, data);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    // Check for existing profile
    const existingProfile = await prisma.speakerProfile.findUnique({
      where: { userId: session.user.id },
    });

    // Build update data based on step
    const stepData = buildStepData(step, data);
    
    let profile;
    if (existingProfile) {
      // Update existing profile
      profile = await prisma.speakerProfile.update({
        where: { userId: session.user.id },
        data: {
          ...stepData,
          onboardingStep: Math.max(existingProfile.onboardingStep, step),
        },
      });
    } else {
      // Create new profile with step data
      profile = await prisma.speakerProfile.create({
        data: {
          userId: session.user.id,
          ...stepData,
          onboardingStep: step,
        },
      });
    }

    return NextResponse.json({
      success: true,
      profile,
      nextStep: step < 4 ? step + 1 : null,
    });
  } catch (error) {
    console.error('Error saving onboarding progress:', error);
    return NextResponse.json(
      { error: 'Failed to save progress' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/speaker-profile/onboarding
 * Complete onboarding with all data
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { termsAccepted, photoUrl, ...profileData } = body;

    if (!termsAccepted) {
      return NextResponse.json(
        { error: 'You must accept the terms and conditions' },
        { status: 400 }
      );
    }

    // Validate complete profile
    const validation = speakerProfileSchema.safeParse(profileData);
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: validation.error.issues.map(i => i.message) 
        },
        { status: 400 }
      );
    }

    // Validate social links
    if (!validateSocialLinks(validation.data)) {
      return NextResponse.json(
        { error: 'Please provide at least one social link' },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Upsert the profile
    const profile = await prisma.speakerProfile.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        fullName: data.fullName,
        bio: data.bio,
        location: data.location,
        company: data.company || null,
        position: data.position || null,
        photoUrl: photoUrl || null,
        websiteUrl: data.websiteUrl || null,
        linkedinUrl: data.linkedinUrl || null,
        twitterHandle: data.twitterHandle?.replace('@', '') || null,
        githubUsername: data.githubUsername || null,
        expertiseTags: data.expertiseTags,
        speakingExperience: data.speakingExperience,
        experienceLevel: data.experienceLevel as ExperienceLevel | undefined,
        languages: data.languages,
        presentationTypes: data.presentationTypes,
        audienceTypes: data.audienceTypes,
        willingToTravel: data.willingToTravel,
        travelRequirements: data.travelRequirements || null,
        virtualEventExperience: data.virtualEventExperience,
        techRequirements: data.techRequirements || null,
        onboardingCompleted: true,
        onboardingStep: 4,
      },
      update: {
        fullName: data.fullName,
        bio: data.bio,
        location: data.location,
        company: data.company || null,
        position: data.position || null,
        photoUrl: photoUrl || null,
        websiteUrl: data.websiteUrl || null,
        linkedinUrl: data.linkedinUrl || null,
        twitterHandle: data.twitterHandle?.replace('@', '') || null,
        githubUsername: data.githubUsername || null,
        expertiseTags: data.expertiseTags,
        speakingExperience: data.speakingExperience,
        experienceLevel: data.experienceLevel as ExperienceLevel | undefined,
        languages: data.languages,
        presentationTypes: data.presentationTypes,
        audienceTypes: data.audienceTypes,
        willingToTravel: data.willingToTravel,
        travelRequirements: data.travelRequirements || null,
        virtualEventExperience: data.virtualEventExperience,
        techRequirements: data.techRequirements || null,
        onboardingCompleted: true,
        onboardingStep: 4,
      },
    });

    return NextResponse.json({
      success: true,
      profile,
      message: 'Onboarding completed successfully',
    });
  } catch (error) {
    console.error('Error completing onboarding:', error);
    return NextResponse.json(
      { error: 'Failed to complete onboarding' },
      { status: 500 }
    );
  }
}

/**
 * Build data object for a specific onboarding step
 */
function buildStepData(step: number, data: Record<string, unknown>): Record<string, unknown> {
  switch (step) {
    case 1:
      return {
        fullName: data.fullName,
        bio: data.bio,
        location: data.location,
        company: data.company || null,
        position: data.position || null,
        photoUrl: data.photoUrl || null,
        websiteUrl: data.websiteUrl || null,
        linkedinUrl: data.linkedinUrl || null,
        twitterHandle: typeof data.twitterHandle === 'string' 
          ? data.twitterHandle.replace('@', '') 
          : null,
        githubUsername: data.githubUsername || null,
      };
    
    case 2:
      return {
        expertiseTags: data.expertiseTags || [],
        speakingExperience: data.speakingExperience,
        experienceLevel: data.experienceLevel || null,
        languages: data.languages || ['English'],
      };
    
    case 3:
      return {
        presentationTypes: data.presentationTypes || [],
        audienceTypes: data.audienceTypes || [],
        willingToTravel: data.willingToTravel || false,
        travelRequirements: data.travelRequirements || null,
        virtualEventExperience: data.virtualEventExperience || false,
        techRequirements: data.techRequirements || null,
      };
    
    case 4:
      // Terms acceptance - no additional profile data
      return {};
    
    default:
      return {};
  }
}
