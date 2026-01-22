/**
 * Speaker Onboarding Page
 * 
 * Server component that loads existing profile data and renders
 * the speaker onboarding flow.
 * 
 * SECURITY: Decrypts PII fields before passing to client component
 */

import { redirect } from 'next/navigation';
import { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { SpeakerOnboardingFlow } from '@/components/onboarding/speaker-onboarding-flow';
import { decryptPiiFields, SPEAKER_PROFILE_PII_FIELDS, USER_PII_FIELDS } from '@/lib/security/encryption';

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

  // Decrypt user PII fields (like name)
  const decryptedUser = decryptPiiFields(user as Record<string, unknown>, USER_PII_FIELDS);

  // Get existing profile if any
  const existingProfile = await prisma.speakerProfile.findUnique({
    where: { userId: session.user.id },
  });

  // If onboarding is already completed, redirect to dashboard
  if (existingProfile?.onboardingCompleted) {
    redirect('/dashboard');
  }

  // Decrypt PII fields before passing to client component
  const decryptedProfile = existingProfile
    ? decryptPiiFields(existingProfile as Record<string, unknown>, SPEAKER_PROFILE_PII_FIELDS)
    : null;

  return (
    <div>
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Welcome to CFP Directory Self-Hosted
        </h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Let&apos;s set up your speaker profile. This information will help event organizers
          learn about you and your speaking experience.
        </p>
      </div>

      {/* Onboarding Flow */}
      <SpeakerOnboardingFlow 
        user={decryptedUser as typeof user} 
        existingProfile={decryptedProfile as typeof existingProfile}
      />
    </div>
  );
}
