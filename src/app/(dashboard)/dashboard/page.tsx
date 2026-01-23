/**
 * Dashboard Page
 * 
 * Main dashboard for authenticated users showing relevant data based on role.
 * Uses a draggable, resizable grid layout with role-specific widgets.
 * Admins see additional system health and platform management widgets.
 */

import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getSiteSettings } from '@/lib/api/auth';
import { format } from 'date-fns';
import { type ActivityItem } from '@/components/dashboard';
import { DashboardClient } from './dashboard-client';
import { 
  getSystemHealth, 
  getAdminStats, 
  getPendingItems, 
  getRecentActivity 
} from '@/lib/health-checks';

export const metadata = {
  title: 'Dashboard',
};

export default async function DashboardPage() {
  const user = await getCurrentUser();
  // Settings loaded but not currently used - available for future features
  await getSiteSettings();
  const userRole = user.role as string;
  const isAdminUser = userRole === 'ADMIN';
  const isOrganizerUser = ['ADMIN', 'ORGANIZER'].includes(userRole);
  const isReviewerUser = ['ADMIN', 'ORGANIZER', 'REVIEWER'].includes(userRole);
  
  // Get user's submissions
  const userSubmissions = await prisma.submission.findMany({
    where: { speakerId: user.id },
    include: {
      event: {
        select: { name: true, slug: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });
  
  // Get submission stats for user
  const submissionStats = await prisma.submission.groupBy({
    by: ['status'],
    where: { speakerId: user.id },
    _count: true,
  });
  
  // Get events with open CFPs
  const now = new Date();
  const openCfpEvents = await prisma.event.findMany({
    where: {
      isPublished: true,
      cfpOpensAt: { lte: now },
      cfpClosesAt: { gte: now },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      cfpClosesAt: true,
      _count: { select: { submissions: true } },
    },
    orderBy: { cfpClosesAt: 'asc' },
    take: 5,
  });
  
  // Organizer-specific data
  let organizerStats = null;
  let allSubmissionStats: { status: string; count: number }[] = [];
  let pendingReviews: Array<{ id: string; title: string; event: { name: string; slug: string } }> = [];
  
  if (isOrganizerUser) {
    const [totalEvents, totalSubmissions, pendingSubmissions, allStats] = await Promise.all([
      prisma.event.count(),
      prisma.submission.count(),
      prisma.submission.count({ where: { status: 'PENDING' } }),
      prisma.submission.groupBy({
        by: ['status'],
        _count: true,
      }),
    ]);
    
    organizerStats = {
      totalEvents,
      totalSubmissions,
      pendingSubmissions,
    };
    
    allSubmissionStats = allStats.map(s => ({
      status: s.status,
      count: s._count,
    }));
  }
  
  // Reviewer-specific data
  let reviewerStats = { completedReviews: 0, totalSubmissions: 0 };
  if (isReviewerUser) {
    // In single-org architecture, all reviewers can access all submissions
    const [submissionsToReview, completedReviewsCount, totalSubmissionsCount] = await Promise.all([
      prisma.submission.findMany({
        where: {
          reviews: {
            none: { reviewerId: user.id },
          },
          status: { in: ['PENDING', 'UNDER_REVIEW'] },
        },
        include: {
          event: { select: { name: true, slug: true } },
        },
        orderBy: { createdAt: 'asc' },
        take: 5,
      }),
      prisma.review.count({
        where: { reviewerId: user.id },
      }),
      prisma.submission.count(),
    ]);
    
    pendingReviews = submissionsToReview;
    reviewerStats = {
      completedReviews: completedReviewsCount,
      totalSubmissions: totalSubmissionsCount,
    };
  }
  
  // Calculate user stats
  const userStats = {
    total: submissionStats.reduce((sum, s) => sum + s._count, 0),
    accepted: submissionStats.find(s => s.status === 'ACCEPTED')?._count || 0,
    pending: submissionStats.find(s => s.status === 'PENDING')?._count || 0,
    underReview: submissionStats.find(s => s.status === 'UNDER_REVIEW')?._count || 0,
  };

  // Prepare activity items from submissions
  const recentSubmissions: ActivityItem[] = userSubmissions.map(sub => ({
    id: sub.id,
    title: sub.title,
    subtitle: sub.event.name,
    href: `/events/${sub.event.slug}/submissions/${sub.id}`,
    icon: 'file-text',
    badge: {
      label: sub.status.replace('_', ' '),
      variant: sub.status === 'ACCEPTED' ? 'default' as const : 
               sub.status === 'REJECTED' ? 'destructive' as const : 
               'secondary' as const,
    },
    timestamp: sub.createdAt.toISOString(),
  }));

  // Prepare open CFP items
  const openCfpItems: ActivityItem[] = openCfpEvents.map(event => ({
    id: event.id,
    title: event.name,
    subtitle: `Closes ${event.cfpClosesAt && format(event.cfpClosesAt, 'MMM d, yyyy')}`,
    href: `/events/${event.slug}`,
    icon: 'calendar',
    badge: {
      label: `${event._count.submissions} submissions`,
      variant: 'secondary' as const,
    },
    action: {
      label: 'Submit',
      href: `/events/${event.slug}/submit`,
    },
  }));

  // Prepare review items
  const reviewItems: ActivityItem[] = pendingReviews.map(sub => ({
    id: sub.id,
    title: sub.title,
    subtitle: sub.event.name,
    href: `/events/${sub.event.slug}/submissions/${sub.id}`,
    icon: 'clipboard-check',
    action: {
      label: 'Review',
      href: `/events/${sub.event.slug}/submissions/${sub.id}`,
    },
  }));
  
  // Check if this is a fresh setup with no events
  const hasNoEvents = organizerStats?.totalEvents === 0;
  
  // Admin-specific data
  let adminData = null;
  if (isAdminUser) {
    const [health, adminStats, pendingItems, adminActivity] = await Promise.all([
      getSystemHealth(),
      getAdminStats(),
      getPendingItems(),
      getRecentActivity(10),
    ]);
    adminData = {
      health,
      adminStats,
      pendingItems,
      adminActivity,
    };
  }
  
  return (
    <DashboardClient
      userName={user.name || ''}
      userRole={userRole}
      userStats={userStats}
      organizerStats={organizerStats}
      allSubmissionStats={allSubmissionStats}
      openCfpItems={openCfpItems}
      recentSubmissions={recentSubmissions}
      reviewItems={reviewItems}
      hasNoEvents={hasNoEvents}
      adminData={adminData}
      reviewerStats={reviewerStats}
    />
  );
}
