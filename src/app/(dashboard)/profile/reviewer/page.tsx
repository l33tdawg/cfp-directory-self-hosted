/**
 * Reviewer Profile Page
 * 
 * Allows reviewers to view and edit their profile after onboarding.
 * Redirects to onboarding if profile doesn't exist.
 */

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { ReviewerProfileEditor } from '@/components/profile/reviewer-profile-editor';

export const dynamic = 'force-dynamic';

export default async function ReviewerProfilePage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/signin?callbackUrl=/profile/reviewer');
  }

  // Get the reviewer profile
  const reviewerProfile = await prisma.reviewerProfile.findUnique({
    where: { userId: session.user.id },
  });

  // If no profile or onboarding not complete, redirect to onboarding
  if (!reviewerProfile || !reviewerProfile.onboardingCompleted) {
    redirect('/onboarding/reviewer');
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Reviewer Profile</h1>
        <p className="text-muted-foreground mt-2">
          Manage your reviewer profile and preferences
        </p>
      </div>

      <ReviewerProfileEditor
        profile={{
          id: reviewerProfile.id,
          fullName: reviewerProfile.fullName,
          designation: reviewerProfile.designation,
          company: reviewerProfile.company,
          bio: reviewerProfile.bio,
          photoUrl: reviewerProfile.photoUrl,
          linkedinUrl: reviewerProfile.linkedinUrl,
          twitterHandle: reviewerProfile.twitterHandle,
          githubUsername: reviewerProfile.githubUsername,
          websiteUrl: reviewerProfile.websiteUrl,
          hasReviewedBefore: reviewerProfile.hasReviewedBefore,
          conferencesReviewed: reviewerProfile.conferencesReviewed,
          expertiseAreas: reviewerProfile.expertiseAreas,
          yearsOfExperience: reviewerProfile.yearsOfExperience,
          reviewCriteria: reviewerProfile.reviewCriteria,
          additionalNotes: reviewerProfile.additionalNotes,
          hoursPerWeek: reviewerProfile.hoursPerWeek,
          preferredEventSize: reviewerProfile.preferredEventSize,
          showOnTeamPage: reviewerProfile.showOnTeamPage,
        }}
      />
    </div>
  );
}
