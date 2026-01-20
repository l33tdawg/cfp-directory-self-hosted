/**
 * Speaker Onboarding Page
 * 
 * Server component that loads existing profile data and renders
 * the speaker onboarding flow.
 */

import { redirect } from 'next/navigation';
import { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { SpeakerOnboardingFlow } from '@/components/onboarding/speaker-onboarding-flow';

export const metadata: Metadata = {
  title: 'Complete Your Speaker Profile',
  description: 'Set up your speaker profile to start submitting talks to events',
};

export default async function SpeakerOnboardingPage() {
  const session = await auth();
  
  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  // Get user info
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
    },
  });

  if (!user) {
    redirect('/auth/signin');
  }

  // Get existing profile if any
  const existingProfile = await prisma.speakerProfile.findUnique({
    where: { userId: session.user.id },
  });

  // If onboarding is already completed, redirect to dashboard
  if (existingProfile?.onboardingCompleted) {
    redirect('/dashboard');
  }

  return (
    <div>
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Welcome to CFP System
        </h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Let&apos;s set up your speaker profile. This information will help event organizers
          learn about you and your speaking experience.
        </p>
      </div>

      {/* Onboarding Flow */}
      <SpeakerOnboardingFlow 
        user={user} 
        existingProfile={existingProfile}
      />
    </div>
  );
}
