'use client';

/**
 * Dashboard Client Component
 * 
 * Client-side wrapper with customizable, draggable and resizable sections.
 * Uses react-grid-layout for drag-and-drop and resize functionality.
 * Supports multiple user roles with role-specific widgets.
 */

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Shield,
  Users,
  ClipboardCheck,
  Mic2,
  Plus,
  Calendar,
  BarChart3,
  Settings,
} from 'lucide-react';
import { 
  DashboardGrid, 
  DashboardWidget,
  StatsCard,
  StatsCardGrid,
  QuickActions,
  ActivityFeed,
  StatusDistributionChart,
  type QuickAction,
  type ActivityItem,
} from '@/components/dashboard';
import { 
  AdminStatsCards, 
  SystemHealthCard, 
  PendingItemsCard, 
  RecentActivityFeed,
  QuickActionsCard as AdminQuickActionsCard 
} from '@/components/admin';
import type { 
  AdminStats, 
  SystemHealth, 
  PendingItems, 
  RecentActivity 
} from '@/lib/health-checks';

// Role type
export type UserRole = 'ADMIN' | 'ORGANIZER' | 'REVIEWER' | 'SPEAKER' | 'USER';

// Role configurations
const ROLE_CONFIG: Record<string, {
  label: string;
  icon: React.ReactNode;
  color: string;
  gradient: string;
  storageKey: string;
}> = {
  ADMIN: {
    label: 'Admin',
    icon: <Shield className="h-4 w-4" />,
    color: 'bg-purple-600 hover:bg-purple-700',
    gradient: 'from-purple-600 via-indigo-600 to-pink-600',
    storageKey: 'admin-dashboard-grid-layout',
  },
  ORGANIZER: {
    label: 'Organizer',
    icon: <Users className="h-4 w-4" />,
    color: 'bg-orange-600 hover:bg-orange-700',
    gradient: 'from-orange-600 via-amber-600 to-yellow-600',
    storageKey: 'organizer-dashboard-grid-layout',
  },
  REVIEWER: {
    label: 'Reviewer',
    icon: <ClipboardCheck className="h-4 w-4" />,
    color: 'bg-green-600 hover:bg-green-700',
    gradient: 'from-green-600 via-emerald-600 to-teal-600',
    storageKey: 'reviewer-dashboard-grid-layout',
  },
  SPEAKER: {
    label: 'Speaker',
    icon: <Mic2 className="h-4 w-4" />,
    color: 'bg-blue-600 hover:bg-blue-700',
    gradient: 'from-blue-600 via-cyan-600 to-sky-600',
    storageKey: 'speaker-dashboard-grid-layout',
  },
  USER: {
    label: 'Speaker',
    icon: <Mic2 className="h-4 w-4" />,
    color: 'bg-blue-600 hover:bg-blue-700',
    gradient: 'from-blue-600 via-cyan-600 to-sky-600',
    storageKey: 'speaker-dashboard-grid-layout',
  },
};

// Widget definitions for different roles
const ORGANIZER_WIDGETS: DashboardWidget[] = [
  { id: 'stats', title: 'Statistics', minW: 6, minH: 2, maxH: 3 },
  { id: 'quick-actions', title: 'Quick Actions', minW: 3, minH: 2 },
  { id: 'status-chart', title: 'Status Distribution', minW: 3, minH: 2 },
  { id: 'open-cfps', title: 'Open CFPs', minW: 4, minH: 2 },
  { id: 'pending-reviews', title: 'Pending Reviews', minW: 4, minH: 2 },
  { id: 'recent-activity', title: 'Recent Activity', minW: 4, minH: 2 },
];

const REVIEWER_WIDGETS: DashboardWidget[] = [
  { id: 'stats', title: 'Statistics', minW: 6, minH: 2, maxH: 3 },
  { id: 'quick-actions', title: 'Quick Actions', minW: 3, minH: 2 },
  { id: 'pending-reviews', title: 'Pending Reviews', minW: 4, minH: 2 },
  { id: 'open-cfps', title: 'Active Events', minW: 4, minH: 2 },
];

const SPEAKER_WIDGETS: DashboardWidget[] = [
  { id: 'stats', title: 'My Statistics', minW: 6, minH: 2, maxH: 3 },
  { id: 'quick-actions', title: 'Quick Actions', minW: 3, minH: 2 },
  { id: 'open-cfps', title: 'Open CFPs', minW: 6, minH: 2 },
  { id: 'recent-activity', title: 'My Submissions', minW: 6, minH: 2 },
];

// Admin-specific widgets (added to organizer view for admins)
const ADMIN_WIDGETS: DashboardWidget[] = [
  { id: 'admin-stats', title: 'Platform Stats', minW: 6, minH: 2, maxH: 3 },
  { id: 'admin-quick-actions', title: 'Admin Actions', minW: 3, minH: 2 },
  { id: 'system-health', title: 'System Health', minW: 3, minH: 2 },
  { id: 'pending-items', title: 'Pending Items', minW: 3, minH: 2 },
  { id: 'admin-activity', title: 'Platform Activity', minW: 4, minH: 2 },
  { id: 'status-chart', title: 'Status Distribution', minW: 3, minH: 2 },
];

interface OrganizerStats {
  totalEvents: number;
  totalSubmissions: number;
  pendingSubmissions: number;
}

interface UserStats {
  total: number;
  accepted: number;
  pending: number;
  underReview: number;
}

interface AdminData {
  health: SystemHealth;
  adminStats: AdminStats;
  pendingItems: PendingItems;
  adminActivity: RecentActivity[];
}

interface ReviewerStats {
  completedReviews: number;
  totalSubmissions: number;
}

interface DashboardClientProps {
  userName: string;
  userRole: string;
  userStats: UserStats;
  organizerStats: OrganizerStats | null;
  allSubmissionStats: { status: string; count: number }[];
  openCfpItems: ActivityItem[];
  recentSubmissions: ActivityItem[];
  reviewItems: ActivityItem[];
  hasNoEvents: boolean;
  adminData?: AdminData | null;
  reviewerStats?: ReviewerStats;
}

export function DashboardClient({
  userName,
  userRole,
  userStats,
  organizerStats,
  allSubmissionStats,
  openCfpItems,
  recentSubmissions,
  reviewItems,
  hasNoEvents,
  adminData,
  reviewerStats,
}: DashboardClientProps) {
  const [mounted, setMounted] = useState(false);

  // Handle client-side hydration - this pattern is intentional for SSR
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Determine role config
  const roleConfig = ROLE_CONFIG[userRole] || ROLE_CONFIG.SPEAKER;
  const isOrganizerUser = ['ADMIN', 'ORGANIZER'].includes(userRole);
  const isReviewerUser = ['ADMIN', 'ORGANIZER', 'REVIEWER'].includes(userRole);
  const isAdminUser = userRole === 'ADMIN';

  // Select widgets based on role
  const widgets = useMemo(() => {
    if (isAdminUser) return ADMIN_WIDGETS;
    if (isOrganizerUser) return ORGANIZER_WIDGETS;
    if (isReviewerUser) return REVIEWER_WIDGETS;
    return SPEAKER_WIDGETS;
  }, [isAdminUser, isOrganizerUser, isReviewerUser]);

  // Quick actions based on role - memoized to prevent unnecessary re-renders
  const organizerQuickActions: QuickAction[] = useMemo(() => [
    {
      title: 'Create New Event',
      description: 'Set up a new call for papers',
      href: '/events/new',
      icon: 'plus',
      variant: 'orange',
    },
    {
      title: 'Manage Events',
      description: 'View and edit your events',
      href: '/events',
      icon: 'calendar',
      variant: 'blue',
    },
    {
      title: 'Review Submissions',
      description: `${organizerStats?.pendingSubmissions || 0} pending`,
      href: '/submissions',
      icon: 'clipboard-check',
      variant: 'green',
    },
    ...(isAdminUser ? [{
      title: 'Settings',
      description: 'Configure site and users',
      href: '/settings',
      icon: 'settings' as const,
      variant: 'purple' as const,
    }] : []),
  ], [organizerStats?.pendingSubmissions, isAdminUser]);

  const speakerQuickActions: QuickAction[] = useMemo(() => [
    {
      title: 'Browse Events',
      description: 'Find events with open CFPs',
      href: '/browse',
      icon: 'eye',
      variant: 'blue',
    },
    {
      title: 'My Submissions',
      description: `${userStats.total} total submissions`,
      href: '/submissions',
      icon: 'file-text',
      variant: 'green',
    },
  ], [userStats.total]);

  // Memoize widget content for organizers
  const organizerWidgetContent = useMemo(() => [
    // Stats Widget
    <div key="stats" className="h-full p-4">
      <StatsCardGrid columns={4}>
        <StatsCard
          title="Total Events"
          value={organizerStats?.totalEvents || 0}
          icon="calendar"
          variant="blue"
          href="/events"
        />
        <StatsCard
          title="Total Submissions"
          value={organizerStats?.totalSubmissions || 0}
          icon="file-text"
          variant="default"
          href="/submissions"
        />
        <StatsCard
          title="Pending Review"
          value={organizerStats?.pendingSubmissions || 0}
          icon="clock"
          variant="orange"
          description={organizerStats?.pendingSubmissions && organizerStats.pendingSubmissions > 0 ? 'Needs attention' : 'All caught up'}
          href="/submissions?status=pending"
        />
        <StatsCard
          title="Open CFPs"
          value={openCfpItems.length}
          icon="trending-up"
          variant="green"
        />
      </StatsCardGrid>
    </div>,
    
    // Quick Actions Widget
    <div key="quick-actions" className="h-full p-4">
      <QuickActions
        title=""
        actions={organizerQuickActions}
        columns={2}
      />
    </div>,
    
    // Status Chart Widget
    <div key="status-chart" className="h-full p-2">
      {allSubmissionStats.length > 0 ? (
        <StatusDistributionChart data={allSubmissionStats} className="border-0 shadow-none" />
      ) : (
        <div className="h-full flex items-center justify-center text-slate-500 dark:text-slate-400">
          No submissions yet
        </div>
      )}
    </div>,
    
    // Open CFPs Widget
    <div key="open-cfps" className="h-full overflow-auto">
      <ActivityFeed
        title=""
        items={openCfpItems}
        emptyMessage="No events with open CFPs right now"
        showTimestamps={false}
        className="border-0 shadow-none"
      />
    </div>,
    
    // Pending Reviews Widget
    <div key="pending-reviews" className="h-full overflow-auto">
      <ActivityFeed
        title=""
        items={reviewItems}
        emptyMessage="No pending reviews"
        showTimestamps={false}
        className="border-0 shadow-none"
      />
    </div>,
    
    // Recent Activity Widget
    <div key="recent-activity" className="h-full overflow-auto">
      <ActivityFeed
        title=""
        items={recentSubmissions}
        emptyMessage="No recent activity"
        className="border-0 shadow-none"
      />
    </div>,
  ], [organizerStats, openCfpItems, allSubmissionStats, reviewItems, recentSubmissions, organizerQuickActions]);

  // Quick actions for reviewers
  const reviewerQuickActions: QuickAction[] = useMemo(() => [
    {
      title: 'Review Queue',
      description: `${reviewItems.length} pending reviews`,
      href: '/reviews',
      icon: 'clipboard-check',
      variant: 'green',
    },
    {
      title: 'All Submissions',
      description: 'Browse all submissions',
      href: '/submissions',
      icon: 'file-text',
      variant: 'blue',
    },
    {
      title: 'Browse Events',
      description: 'View all events',
      href: '/events',
      icon: 'calendar',
      variant: 'purple',
    },
  ], [reviewItems.length]);

  // Memoize widget content for reviewers
  const reviewerWidgetContent = useMemo(() => [
    // Stats Widget - Reviewer-specific stats
    <div key="stats" className="h-full p-4">
      <StatsCardGrid columns={4}>
        <StatsCard
          title="Pending Reviews"
          value={reviewItems.length}
          icon="clipboard-check"
          variant="orange"
          description="Awaiting your review"
          href="/reviews"
        />
        <StatsCard
          title="Reviews Completed"
          value={reviewerStats?.completedReviews || 0}
          icon="check-circle"
          variant="green"
          description="Your contributions"
        />
        <StatsCard
          title="Total Submissions"
          value={reviewerStats?.totalSubmissions || 0}
          icon="file-text"
          variant="blue"
          href="/submissions"
        />
        <StatsCard
          title="Active Events"
          value={openCfpItems.length}
          icon="calendar"
          variant="purple"
          href="/events"
        />
      </StatsCardGrid>
    </div>,
    
    // Quick Actions Widget
    <div key="quick-actions" className="h-full p-4">
      <QuickActions
        title="Quick Actions"
        actions={reviewerQuickActions}
        columns={2}
      />
    </div>,
    
    // Pending Reviews Widget
    <div key="pending-reviews" className="h-full overflow-auto">
      <ActivityFeed
        title="Pending Reviews"
        items={reviewItems}
        emptyMessage="No pending reviews"
        showTimestamps={false}
        className="border-0 shadow-none"
      />
    </div>,
    
    // Active Events Widget - Shows events for reviewers (without submit action)
    <div key="open-cfps" className="h-full overflow-auto">
      <ActivityFeed
        title="Active Events"
        items={openCfpItems.map(item => ({
          ...item,
          action: item.href ? {
            label: 'View',
            href: item.href,
          } : undefined,
          badge: {
            ...item.badge,
            label: `${item.badge?.label || ''}`,
          },
        }))}
        emptyMessage="No active events"
        showTimestamps={false}
        className="border-0 shadow-none"
      />
    </div>,
  ], [openCfpItems, reviewItems, reviewerStats?.completedReviews, reviewerStats?.totalSubmissions, reviewerQuickActions]);

  // Memoize widget content for speakers
  const speakerWidgetContent = useMemo(() => [
    // Stats Widget
    <div key="stats" className="h-full p-4">
      <StatsCardGrid columns={4}>
        <StatsCard
          title="My Submissions"
          value={userStats.total}
          icon="file-text"
          variant="blue"
          href="/submissions"
        />
        <StatsCard
          title="Accepted"
          value={userStats.accepted}
          icon="check-circle"
          variant="green"
        />
        <StatsCard
          title="In Progress"
          value={userStats.pending + userStats.underReview}
          icon="clock"
          variant="orange"
        />
        <StatsCard
          title="Open CFPs"
          value={openCfpItems.length}
          icon="calendar"
          variant="purple"
          href="/browse"
        />
      </StatsCardGrid>
    </div>,
    
    // Quick Actions Widget
    <div key="quick-actions" className="h-full p-4">
      <QuickActions
        title=""
        actions={speakerQuickActions}
        columns={2}
      />
    </div>,
    
    // Open CFPs Widget
    <div key="open-cfps" className="h-full overflow-auto">
      <ActivityFeed
        title=""
        description="Events currently accepting submissions"
        items={openCfpItems}
        emptyMessage="No events with open CFPs right now"
        showTimestamps={false}
        className="border-0 shadow-none"
      />
    </div>,
    
    // Recent Activity Widget
    <div key="recent-activity" className="h-full overflow-auto">
      <ActivityFeed
        title=""
        items={recentSubmissions}
        emptyMessage="No submissions yet"
        emptyAction={{
          label: 'Browse Events',
          href: '/browse',
        }}
        className="border-0 shadow-none"
      />
    </div>,
  ], [userStats, openCfpItems, recentSubmissions, speakerQuickActions]);

  // Memoize widget content for admins
  const adminWidgetContent = useMemo(() => {
    if (!adminData) return [];
    return [
      // Admin Stats Widget
      <div key="admin-stats" className="h-full p-4">
        <AdminStatsCards stats={adminData.adminStats} />
      </div>,
      
      // Admin Quick Actions Widget
      <div key="admin-quick-actions" className="h-full">
        <AdminQuickActionsCard />
      </div>,
      
      // System Health Widget
      <div key="system-health" className="h-full">
        <SystemHealthCard health={adminData.health} />
      </div>,
      
      // Pending Items Widget
      <div key="pending-items" className="h-full">
        <PendingItemsCard items={adminData.pendingItems} />
      </div>,
      
      // Admin Activity Widget
      <div key="admin-activity" className="h-full">
        <RecentActivityFeed activities={adminData.adminActivity} />
      </div>,
      
      // Status Distribution Chart Widget
      <div key="status-chart" className="h-full p-2">
        {allSubmissionStats.length > 0 ? (
          <StatusDistributionChart data={allSubmissionStats} className="border-0 shadow-none" />
        ) : (
          <div className="h-full flex items-center justify-center text-slate-500 dark:text-slate-400">
            No submissions yet
          </div>
        )}
      </div>,
    ];
  }, [adminData, allSubmissionStats]);

  // Select appropriate widget content
  const widgetContent = useMemo(() => {
    if (isAdminUser && adminWidgetContent.length > 0) return adminWidgetContent;
    if (isOrganizerUser) return organizerWidgetContent;
    if (isReviewerUser) return reviewerWidgetContent;
    return speakerWidgetContent;
  }, [isAdminUser, isOrganizerUser, isReviewerUser, adminWidgetContent, organizerWidgetContent, reviewerWidgetContent, speakerWidgetContent]);

  // Show loading skeleton during SSR/hydration
  if (!mounted) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl animate-pulse">
        <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-xl mb-8" />
        <div className="h-24 bg-slate-200 dark:bg-slate-800 rounded-xl mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          </div>
          <div className="space-y-6">
            <div className="h-48 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8">
        <div className="space-y-4">
          {/* Badge */}
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r ${
            isAdminUser
              ? 'from-purple-100/80 to-pink-100/80 dark:from-purple-900/30 dark:to-pink-900/30 text-purple-700 dark:text-purple-300 border-purple-200/50 dark:border-purple-800/50'
              : isOrganizerUser 
              ? 'from-orange-100/80 to-amber-100/80 dark:from-orange-900/30 dark:to-amber-900/30 text-orange-700 dark:text-orange-300 border-orange-200/50 dark:border-orange-800/50'
              : isReviewerUser
              ? 'from-green-100/80 to-emerald-100/80 dark:from-green-900/30 dark:to-emerald-900/30 text-green-700 dark:text-green-300 border-green-200/50 dark:border-green-800/50'
              : 'from-blue-100/80 to-cyan-100/80 dark:from-blue-900/30 dark:to-cyan-900/30 text-blue-700 dark:text-blue-300 border-blue-200/50 dark:border-blue-800/50'
          } text-sm font-medium backdrop-blur-sm border`}>
            {roleConfig.icon}
            <span>{roleConfig.label} Dashboard</span>
            <BarChart3 className="h-4 w-4" />
          </div>
          
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">
              <span className={`bg-gradient-to-r ${roleConfig.gradient} bg-clip-text text-transparent`}>
                {isAdminUser ? 'Platform Overview' : isOrganizerUser ? 'Event Overview' : 'My Dashboard'}
              </span>
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
              Welcome back{userName ? `, ${userName}` : ''}! {isAdminUser ? 'Here\'s what\'s happening on your platform.' : isOrganizerUser ? 'Manage your events and submissions.' : 'Track your submissions and discover events.'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge className={roleConfig.color}>
            {roleConfig.icon}
            <span className="ml-1">{roleConfig.label}</span>
          </Badge>
          {isAdminUser && (
            <Button 
              asChild 
              size="lg" 
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Link href="/settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </Link>
            </Button>
          )}
          {isOrganizerUser && !isAdminUser && (
            <Button 
              asChild 
              size="lg" 
              className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Link href="/events/new" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                New Event
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Getting Started (for organizers with no events) */}
      {isOrganizerUser && hasNoEvents && (
        <div className="mb-8 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border border-blue-200 dark:border-blue-800 rounded-xl">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex-shrink-0">
              <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <Calendar className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                Get Started: Create Your First Event
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                You&apos;re all set up! Now create your first event to start accepting talk submissions.
                Configure the CFP dates, tracks, and session formats to match your conference.
              </p>
              <Link
                href="/events/new"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                <Plus className="h-5 w-5" />
                Create Your First Event
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Draggable & Resizable Dashboard Grid */}
      <DashboardGrid 
        widgets={widgets} 
        storageKey={roleConfig.storageKey}
      >
        {widgetContent}
      </DashboardGrid>
    </div>
  );
}
