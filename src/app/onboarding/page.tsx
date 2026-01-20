/**
 * Onboarding Router Page
 * 
 * Redirects users to the appropriate onboarding flow based on their role.
 * For this self-hosted version, all users are speakers by default.
 */

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';

export default async function OnboardingPage() {
  const session = await auth();
  
  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  // Check if user already has a completed speaker profile
  const profile = await prisma.speakerProfile.findUnique({
    where: { userId: session.user.id },
    select: { onboardingCompleted: true },
  });

  if (profile?.onboardingCompleted) {
    // Already completed, go to dashboard
    redirect('/dashboard');
  }

  // Redirect to speaker onboarding
  redirect('/onboarding/speaker');
}
