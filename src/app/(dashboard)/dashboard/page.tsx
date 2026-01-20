/**
 * Dashboard Page
 * 
 * Main dashboard for authenticated users showing relevant data based on role.
 * Uses enhanced components for statistics, charts, and activity feeds.
 */

import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getSiteSettings } from '@/lib/api/auth';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { 
  Calendar, 
  FileText, 
  Users, 
  Plus,
  Shield,
  CheckCircle,
  Clock,
  Send,
  Star,
  Settings,
  ClipboardCheck,
  TrendingUp,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { 
  StatsCard, 
  StatsCardGrid,
  QuickActions,
  ActivityFeed,
  StatusDistributionChart,
  type QuickAction,
  type ActivityItem 
} from '@/components/dashboard';

export const metadata = {
  title: 'Dashboard',
};

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const settings = await getSiteSettings();
  const userRole = user.role as string;
  const isOrganizerUser = ['ADMIN', 'ORGANIZER'].includes(userRole);
  const isReviewerUser = ['ADMIN', 'ORGANIZER', 'REVIEWER'].includes(userRole);
  const isAdminUser = userRole === 'ADMIN';
  
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
  let pendingReviews: any[] = [];
  
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
  if (isReviewerUser) {
    const reviewTeamAssignments = await prisma.reviewTeamMember.findMany({
      where: { userId: user.id },
      select: { eventId: true },
    });
    
    if (reviewTeamAssignments.length > 0 || isOrganizerUser) {
      const eventIds = reviewTeamAssignments.map(a => a.eventId);
      
      const submissionsToReview = await prisma.submission.findMany({
        where: {
          ...(isOrganizerUser ? {} : { eventId: { in: eventIds } }),
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
      });
      
      pendingReviews = submissionsToReview;
    }
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
    icon: FileText,
    badge: {
      label: sub.status.replace('_', ' '),
      variant: sub.status === 'ACCEPTED' ? 'default' as const : 
               sub.status === 'REJECTED' ? 'destructive' as const : 
               'secondary' as const,
    },
    timestamp: sub.createdAt,
  }));

  // Prepare open CFP items
  const openCfpItems: ActivityItem[] = openCfpEvents.map(event => ({
    id: event.id,
    title: event.name,
    subtitle: `Closes ${event.cfpClosesAt && format(event.cfpClosesAt, 'MMM d, yyyy')}`,
    href: `/events/${event.slug}`,
    icon: Calendar,
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
    icon: ClipboardCheck,
    action: {
      label: 'Review',
      href: `/events/${sub.event.slug}/submissions/${sub.id}`,
    },
  }));

  // Quick actions based on role
  const organizerQuickActions: QuickAction[] = [
    {
      title: 'Create New Event',
      description: 'Set up a new call for papers',
      href: '/events/new',
      icon: Plus,
      variant: 'orange',
    },
    {
      title: 'Manage Events',
      description: 'View and edit your events',
      href: '/events',
      icon: Calendar,
      variant: 'blue',
    },
    {
      title: 'Review Submissions',
      description: `${organizerStats?.pendingSubmissions || 0} pending`,
      href: '/submissions',
      icon: ClipboardCheck,
      variant: 'green',
    },
    ...(isAdminUser ? [{
      title: 'Settings',
      description: 'Configure site and users',
      href: '/settings',
      icon: Settings,
      variant: 'purple' as const,
    }] : []),
  ];

  const speakerQuickActions: QuickAction[] = [
    {
      title: 'Browse Events',
      description: 'Find events with open CFPs',
      href: '/browse',
      icon: Eye,
      variant: 'blue',
    },
    {
      title: 'My Submissions',
      description: `${userStats.total} total submissions`,
      href: '/submissions',
      icon: FileText,
      variant: 'green',
    },
  ];
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Welcome back{user.name ? `, ${user.name}` : ''}!
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            {isOrganizerUser ? 'Manage your events and submissions' : 'Track your submissions and discover events'}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {isAdminUser && (
            <Badge className="bg-purple-600 hover:bg-purple-700">
              <Shield className="h-3 w-3 mr-1" />
              Admin
            </Badge>
          )}
          {!isAdminUser && userRole === 'ORGANIZER' && (
            <Badge className="bg-orange-600 hover:bg-orange-700">Organizer</Badge>
          )}
          {!isAdminUser && userRole === 'REVIEWER' && (
            <Badge className="bg-green-600 hover:bg-green-700">Reviewer</Badge>
          )}
          {userRole === 'SPEAKER' && (
            <Badge className="bg-blue-600 hover:bg-blue-700">Speaker</Badge>
          )}
        </div>
      </div>
      
      {/* Quick Stats */}
      <StatsCardGrid columns={4} className="mb-8">
        {isOrganizerUser && organizerStats ? (
          <>
            <StatsCard
              title="Total Events"
              value={organizerStats.totalEvents}
              icon={Calendar}
              variant="blue"
              href="/events"
            />
            <StatsCard
              title="Total Submissions"
              value={organizerStats.totalSubmissions}
              icon={FileText}
              variant="default"
              href="/submissions"
            />
            <StatsCard
              title="Pending Review"
              value={organizerStats.pendingSubmissions}
              icon={Clock}
              variant="orange"
              description={organizerStats.pendingSubmissions > 0 ? 'Needs attention' : 'All caught up'}
              href="/submissions?status=pending"
            />
            <StatsCard
              title="Open CFPs"
              value={openCfpEvents.length}
              icon={TrendingUp}
              variant="green"
            />
          </>
        ) : (
          <>
            <StatsCard
              title="My Submissions"
              value={userStats.total}
              icon={FileText}
              variant="blue"
              href="/submissions"
            />
            <StatsCard
              title="Accepted"
              value={userStats.accepted}
              icon={CheckCircle}
              variant="green"
            />
            <StatsCard
              title="In Progress"
              value={userStats.pending + userStats.underReview}
              icon={Clock}
              variant="orange"
            />
            <StatsCard
              title="Open CFPs"
              value={openCfpEvents.length}
              icon={Calendar}
              variant="purple"
              href="/browse"
            />
          </>
        )}
      </StatsCardGrid>
      
      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - 2/3 width on large screens */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Actions */}
          <QuickActions
            title="Quick Actions"
            description="Common tasks to get things done"
            actions={isOrganizerUser ? organizerQuickActions : speakerQuickActions}
            columns={2}
          />
          
          {/* Open CFPs */}
          <ActivityFeed
            title="Open CFPs"
            description="Events currently accepting submissions"
            items={openCfpItems}
            emptyMessage="No events with open CFPs right now"
            showTimestamps={false}
          />
          
          {/* Pending Reviews (for reviewers) */}
          {isReviewerUser && reviewItems.length > 0 && (
            <ActivityFeed
              title="Pending Reviews"
              description="Submissions waiting for your review"
              items={reviewItems}
              showTimestamps={false}
            />
          )}
        </div>
        
        {/* Right Column - 1/3 width on large screens */}
        <div className="space-y-6">
          {/* Status Distribution Chart (for organizers) */}
          {isOrganizerUser && allSubmissionStats.length > 0 && (
            <StatusDistributionChart data={allSubmissionStats} />
          )}
          
          {/* Recent Submissions */}
          <ActivityFeed
            title={isOrganizerUser ? "Recent Activity" : "My Recent Submissions"}
            description={isOrganizerUser ? "Latest submissions across events" : "Your latest talk submissions"}
            items={recentSubmissions}
            emptyMessage="No submissions yet"
            emptyAction={{
              label: 'Browse Events',
              href: '/browse',
            }}
            maxHeight={350}
          />
        </div>
      </div>
    </div>
  );
}
