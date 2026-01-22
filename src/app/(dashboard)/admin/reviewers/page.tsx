/**
 * Admin Reviewers Page
 * 
 * Reviewer management and workload overview.
 */

import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { UserCheck, TrendingUp } from 'lucide-react';
import { ReviewerWorkload } from '@/components/admin/reviewer-workload';
import { 
  decryptPiiFields, 
  USER_PII_FIELDS,
  REVIEWER_PROFILE_PII_FIELDS 
} from '@/lib/security/encryption';

export const metadata = {
  title: 'Reviewer Management',
};

export const dynamic = 'force-dynamic';

export default async function AdminReviewersPage() {
  const user = await getCurrentUser();
  
  if (user.role !== 'ADMIN' && user.role !== 'ORGANIZER') {
    redirect('/dashboard?error=unauthorized');
  }
  
  // Fetch all reviewers with their stats
  const reviewers = await prisma.user.findMany({
    where: {
      OR: [
        { role: 'REVIEWER' },
        { reviewerProfile: { isNot: null } },
        { reviewTeamEvents: { some: {} } },
      ],
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      reviewerProfile: {
        select: {
          fullName: true,
          expertiseAreas: true,
          onboardingCompleted: true,
        },
      },
      reviews: {
        select: { id: true },
      },
      reviewTeamEvents: {
        select: { eventId: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  
  // Calculate stats for each reviewer
  const reviewersWithStats = await Promise.all(
    reviewers.map(async (reviewer) => {
      // Count pending reviews (submissions assigned to them that need review)
      const eventsAssigned = reviewer.reviewTeamEvents.length;
      const eventIds = reviewer.reviewTeamEvents.map(e => e.eventId);
      
      // Get total submissions in assigned events
      const pendingReviews = eventIds.length > 0 ? await prisma.submission.count({
        where: {
          eventId: { in: eventIds },
          status: { in: ['PENDING', 'UNDER_REVIEW'] },
          reviews: {
            none: { reviewerId: reviewer.id },
          },
        },
      }) : 0;
      
      // Calculate average score
      const avgScoreResult = await prisma.review.aggregate({
        where: { reviewerId: reviewer.id },
        _avg: { overallScore: true },
      });
      
      // Decrypt user PII fields
      const decryptedUser = decryptPiiFields(
        reviewer as unknown as Record<string, unknown>,
        USER_PII_FIELDS
      );
      
      // Decrypt reviewer profile PII fields if exists
      const decryptedReviewerProfile = reviewer.reviewerProfile
        ? decryptPiiFields(
            reviewer.reviewerProfile as unknown as Record<string, unknown>,
            REVIEWER_PROFILE_PII_FIELDS
          )
        : null;
      
      return {
        id: reviewer.id,
        name: decryptedUser.name as string | null,
        email: reviewer.email,
        image: reviewer.image,
        reviewerProfile: decryptedReviewerProfile ? {
          fullName: decryptedReviewerProfile.fullName as string,
          expertiseAreas: reviewer.reviewerProfile?.expertiseAreas || [],
          onboardingCompleted: reviewer.reviewerProfile?.onboardingCompleted || false,
        } : null,
        reviewCount: reviewer.reviews.length,
        eventsAssigned,
        avgScore: avgScoreResult._avg.overallScore,
        pendingReviews,
      };
    })
  );
  
  // Sort by review count descending
  reviewersWithStats.sort((a, b) => b.reviewCount - a.reviewCount);
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header Section */}
      <div className="mb-8">
        <div className="space-y-4">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100/80 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm font-medium backdrop-blur-sm border border-purple-200/50 dark:border-purple-800/50">
            <UserCheck className="h-4 w-4" />
            <span>Review Team</span>
            <TrendingUp className="h-4 w-4" />
          </div>
          
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">
              <span className="bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 bg-clip-text text-transparent">
                Reviewers
              </span>
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
              Manage your review team and track workload distribution
            </p>
          </div>
        </div>
      </div>
      
      {/* Reviewer Workload */}
      <ReviewerWorkload reviewers={reviewersWithStats} />
    </div>
  );
}
