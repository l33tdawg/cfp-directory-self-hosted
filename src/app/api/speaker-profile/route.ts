/**
 * Speaker Profile API Routes
 * 
 * Handles speaker profile CRUD operations including:
 * - GET: Fetch current user's speaker profile
 * - POST: Create speaker profile (during onboarding)
 * - PATCH: Update speaker profile
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { 
  speakerProfileSchema, 
  updateSpeakerProfileSchema 
} from '@/lib/validations/speaker-profile';
import { encryptPiiFields, decryptPiiFields, SPEAKER_PROFILE_PII_FIELDS } from '@/lib/security/encryption';
import type { ExperienceLevel } from '@prisma/client';

/**
 * GET /api/speaker-profile
 * Fetch current user's speaker profile
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

    if (!profile) {
      return NextResponse.json(
        { 
          profile: null, 
          onboardingRequired: true,
          onboardingStep: 1 
        },
        { status: 200 }
      );
    }

    // Decrypt PII fields before returning
    const decryptedProfile = decryptPiiFields(
      profile as unknown as Record<string, unknown>,
      SPEAKER_PROFILE_PII_FIELDS
    );

    return NextResponse.json({ 
      profile: decryptedProfile,
      onboardingRequired: !profile.onboardingCompleted,
      onboardingStep: profile.onboardingStep
    });
  } catch (error) {
    console.error('Error fetching speaker profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/speaker-profile
 * Create a new speaker profile (typically during onboarding completion)
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
    const existingProfile = await prisma.speakerProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (existingProfile) {
      return NextResponse.json(
        { error: 'Profile already exists. Use PATCH to update.' },
        { status: 409 }
      );
    }

    const body = await request.json();
    const validationResult = speakerProfileSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: validationResult.error.issues 
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Encrypt PII fields before storage
    const piiData = {
      fullName: data.fullName,
      bio: data.bio,
      location: data.location,
      company: data.company || null,
      position: data.position || null,
      websiteUrl: data.websiteUrl || null,
      linkedinUrl: data.linkedinUrl || null,
      twitterHandle: data.twitterHandle?.replace('@', '') || null,
      githubUsername: data.githubUsername || null,
      speakingExperience: data.speakingExperience,
    };
    const encryptedPii = encryptPiiFields(piiData, SPEAKER_PROFILE_PII_FIELDS);

    // Create the profile with encrypted PII
    const profile = await prisma.speakerProfile.create({
      data: {
        userId: session.user.id,
        fullName: encryptedPii.fullName as string,
        bio: encryptedPii.bio as string,
        location: encryptedPii.location as string,
        company: encryptedPii.company as string | null,
        position: encryptedPii.position as string | null,
        websiteUrl: encryptedPii.websiteUrl as string | null,
        linkedinUrl: encryptedPii.linkedinUrl as string | null,
        twitterHandle: encryptedPii.twitterHandle as string | null,
        githubUsername: encryptedPii.githubUsername as string | null,
        expertiseTags: data.expertiseTags,
        speakingExperience: encryptedPii.speakingExperience as string | null,
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

    // Decrypt for response
    const decryptedProfile = decryptPiiFields(
      profile as unknown as Record<string, unknown>,
      SPEAKER_PROFILE_PII_FIELDS
    );

    return NextResponse.json({ 
      profile: decryptedProfile,
      message: 'Profile created successfully' 
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating speaker profile:', error);
    return NextResponse.json(
      { error: 'Failed to create profile' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/speaker-profile
 * Update existing speaker profile
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

    const existingProfile = await prisma.speakerProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!existingProfile) {
      return NextResponse.json(
        { error: 'Profile not found. Use POST to create.' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validationResult = updateSpeakerProfileSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: validationResult.error.issues 
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Build update data, only including provided fields
    const updateData: Record<string, unknown> = {};
    
    if (data.fullName !== undefined) updateData.fullName = data.fullName;
    if (data.bio !== undefined) updateData.bio = data.bio;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.company !== undefined) updateData.company = data.company || null;
    if (data.position !== undefined) updateData.position = data.position || null;
    if (data.websiteUrl !== undefined) updateData.websiteUrl = data.websiteUrl || null;
    if (data.linkedinUrl !== undefined) updateData.linkedinUrl = data.linkedinUrl || null;
    if (data.twitterHandle !== undefined) updateData.twitterHandle = data.twitterHandle?.replace('@', '') || null;
    if (data.githubUsername !== undefined) updateData.githubUsername = data.githubUsername || null;
    if (data.expertiseTags !== undefined) updateData.expertiseTags = data.expertiseTags;
    if (data.speakingExperience !== undefined) updateData.speakingExperience = data.speakingExperience;
    if (data.experienceLevel !== undefined) updateData.experienceLevel = data.experienceLevel;
    if (data.languages !== undefined) updateData.languages = data.languages;
    if (data.presentationTypes !== undefined) updateData.presentationTypes = data.presentationTypes;
    if (data.audienceTypes !== undefined) updateData.audienceTypes = data.audienceTypes;
    if (data.willingToTravel !== undefined) updateData.willingToTravel = data.willingToTravel;
    if (data.travelRequirements !== undefined) updateData.travelRequirements = data.travelRequirements || null;
    if (data.virtualEventExperience !== undefined) updateData.virtualEventExperience = data.virtualEventExperience;
    if (data.techRequirements !== undefined) updateData.techRequirements = data.techRequirements || null;

    // Encrypt PII fields before update
    const encryptedData = encryptPiiFields(updateData, SPEAKER_PROFILE_PII_FIELDS);

    const profile = await prisma.speakerProfile.update({
      where: { userId: session.user.id },
      data: encryptedData,
    });

    // Decrypt for response
    const decryptedProfile = decryptPiiFields(
      profile as unknown as Record<string, unknown>,
      SPEAKER_PROFILE_PII_FIELDS
    );

    return NextResponse.json({ 
      profile: decryptedProfile,
      message: 'Profile updated successfully' 
    });
  } catch (error) {
    console.error('Error updating speaker profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
