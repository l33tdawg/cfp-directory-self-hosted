/**
 * Speaker Onboarding Status API
 * 
 * GET /api/speaker-profile/onboarding-status
 * 
 * Quick check to determine if the current user needs to complete
 * speaker onboarding. Used after sign-in to redirect appropriately.
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Only speakers need to check for onboarding
    if (user.role !== 'SPEAKER') {
      return NextResponse.json({
        needsOnboarding: false,
        role: user.role,
      });
    }

    // Check if speaker profile exists and onboarding is completed
    const profile = await prisma.speakerProfile.findUnique({
      where: { userId: session.user.id },
      select: { onboardingCompleted: true },
    });

    const needsOnboarding = !profile || !profile.onboardingCompleted;

    return NextResponse.json({
      needsOnboarding,
      role: user.role,
    });
  } catch (error) {
    console.error('Onboarding status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check onboarding status' },
      { status: 500 }
    );
  }
}
