/**
 * Dashboard Page
 * 
 * Main dashboard for authenticated users showing relevant data based on role.
 */

import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getSiteSettings } from '@/lib/api/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { 
  Calendar, 
  FileText, 
  Users, 
  Star,
  Plus,
  ArrowRight,
  Shield,
  CheckCircle,
  Clock,
  Send
} from 'lucide-react';
import { format } from 'date-fns';

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
  let pendingReviews = null;
  
  if (isOrganizerUser) {
    const [totalEvents, totalSubmissions, pendingSubmissions] = await Promise.all([
      prisma.event.count(),
      prisma.submission.count(),
      prisma.submission.count({ where: { status: 'PENDING' } }),
    ]);
    
    organizerStats = {
      totalEvents,
      totalSubmissions,
      pendingSubmissions,
    };
  }
  
  // Reviewer-specific data
  if (isReviewerUser) {
    // Get submissions assigned to this reviewer that haven't been reviewed yet
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
    total: userSubmissions.length,
    accepted: submissionStats.find(s => s.status === 'ACCEPTED')?._count || 0,
    pending: submissionStats.find(s => s.status === 'PENDING')?._count || 0,
    underReview: submissionStats.find(s => s.status === 'UNDER_REVIEW')?._count || 0,
  };
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Welcome back{user.name ? `, ${user.name}` : ''}!
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            {settings.name} - {isOrganizerUser ? 'Manage your events and submissions' : 'Track your submissions'}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {isAdminUser && (
            <Badge className="bg-red-500">
              <Shield className="h-3 w-3 mr-1" />
              Admin
            </Badge>
          )}
          {!isAdminUser && userRole === 'ORGANIZER' && (
            <Badge className="bg-purple-500">Organizer</Badge>
          )}
          {!isAdminUser && userRole === 'REVIEWER' && (
            <Badge className="bg-blue-500">Reviewer</Badge>
          )}
        </div>
      </div>
      
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {isOrganizerUser && organizerStats ? (
          <>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-500" />
                  <span className="text-2xl font-bold">{organizerStats.totalEvents}</span>
                </div>
                <p className="text-sm text-slate-500">Total Events</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-500" />
                  <span className="text-2xl font-bold">{organizerStats.totalSubmissions}</span>
                </div>
                <p className="text-sm text-slate-500">Total Submissions</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-500" />
                  <span className="text-2xl font-bold">{organizerStats.pendingSubmissions}</span>
                </div>
                <p className="text-sm text-slate-500">Pending Review</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-slate-500" />
                  <span className="text-2xl font-bold">{openCfpEvents.length}</span>
                </div>
                <p className="text-sm text-slate-500">Open CFPs</p>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-500" />
                  <span className="text-2xl font-bold">{userStats.total}</span>
                </div>
                <p className="text-sm text-slate-500">My Submissions</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-2xl font-bold">{userStats.accepted}</span>
                </div>
                <p className="text-sm text-slate-500">Accepted</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-500" />
                  <span className="text-2xl font-bold">{userStats.pending + userStats.underReview}</span>
                </div>
                <p className="text-sm text-slate-500">In Progress</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-500" />
                  <span className="text-2xl font-bold">{openCfpEvents.length}</span>
                </div>
                <p className="text-sm text-slate-500">Open CFPs</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
      
      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Open CFPs */}
        <Card>
          <CardHeader>
            <CardTitle>Open CFPs</CardTitle>
            <CardDescription>
              Events currently accepting submissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {openCfpEvents.length > 0 ? (
              <div className="space-y-3">
                {openCfpEvents.map((event) => (
                  <Link
                    key={event.id}
                    href={`/events/${event.slug}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div>
                      <p className="font-medium">{event.name}</p>
                      <p className="text-sm text-slate-500">
                        Closes {event.cfpClosesAt && format(event.cfpClosesAt, 'MMM d, yyyy')}
                      </p>
                    </div>
                    <Button size="sm" variant="outline">
                      <Send className="h-3 w-3 mr-1" />
                      Submit
                    </Button>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-slate-500">No events with open CFPs</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Pending Reviews (for reviewers) */}
        {isReviewerUser && pendingReviews && pendingReviews.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Pending Reviews</CardTitle>
              <CardDescription>
                Submissions waiting for your review
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingReviews.map((submission) => (
                  <Link
                    key={submission.id}
                    href={`/events/${submission.event.slug}/submissions/${submission.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div>
                      <p className="font-medium line-clamp-1">{submission.title}</p>
                      <p className="text-sm text-slate-500">{submission.event.name}</p>
                    </div>
                    <Button size="sm" variant="outline">
                      <Star className="h-3 w-3 mr-1" />
                      Review
                    </Button>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* My Recent Submissions (for speakers) */}
        {!isOrganizerUser && (
          <Card>
            <CardHeader>
              <CardTitle>My Recent Submissions</CardTitle>
              <CardDescription>
                Your latest talk submissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {userSubmissions.length > 0 ? (
                <div className="space-y-3">
                  {userSubmissions.map((submission) => (
                    <Link
                      key={submission.id}
                      href={`/events/${submission.event.slug}/submissions/${submission.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <div>
                        <p className="font-medium line-clamp-1">{submission.title}</p>
                        <p className="text-sm text-slate-500">{submission.event.name}</p>
                      </div>
                      <Badge variant={
                        submission.status === 'ACCEPTED' ? 'default' :
                        submission.status === 'REJECTED' ? 'destructive' :
                        'secondary'
                      }>
                        {submission.status}
                      </Badge>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-slate-500">No submissions yet</p>
                  <Button asChild className="mt-4" size="sm">
                    <Link href="/events">Browse Events</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
        
        {/* Quick Actions for Organizers */}
        {isOrganizerUser && (
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common tasks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild className="w-full justify-start" variant="outline">
                <Link href="/events/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Event
                </Link>
              </Button>
              <Button asChild className="w-full justify-start" variant="outline">
                <Link href="/events">
                  <Calendar className="h-4 w-4 mr-2" />
                  Manage Events
                </Link>
              </Button>
              {isAdminUser && (
                <Button asChild className="w-full justify-start" variant="outline">
                  <Link href="/settings">
                    <Users className="h-4 w-4 mr-2" />
                    Manage Users & Settings
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Quick Links */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link 
          href="/events" 
          className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-slate-500" />
            <span className="font-medium text-slate-900 dark:text-white">
              Browse Events
            </span>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-400" />
        </Link>
        
        <Link 
          href="/submissions" 
          className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-slate-500" />
            <span className="font-medium text-slate-900 dark:text-white">
              My Submissions
            </span>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-400" />
        </Link>
        
        <Link 
          href="/auth/signout" 
          className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-slate-500" />
            <span className="font-medium text-slate-900 dark:text-white">
              Sign Out
            </span>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-400" />
        </Link>
      </div>
    </div>
  );
}
