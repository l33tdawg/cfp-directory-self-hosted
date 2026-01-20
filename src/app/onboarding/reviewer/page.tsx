/**
 * Reviewer Onboarding Page
 * 
 * Guides reviewers through setting up their profile.
 */

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { ReviewerOnboardingFlow } from '@/components/onboarding/reviewer-onboarding-flow';

export const dynamic = 'force-dynamic';

export default async function ReviewerOnboardingPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/signin?callbackUrl=/onboarding/reviewer');
  }

  // Check if reviewer profile already exists and onboarding is complete
  const existingProfile = await prisma.reviewerProfile.findUnique({
    where: { userId: session.user.id },
    select: { onboardingCompleted: true },
  });

  if (existingProfile?.onboardingCompleted) {
    redirect('/reviews');
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background">
      <ReviewerOnboardingFlow
        user={{
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
        }}
      />
    </div>
  );
}
