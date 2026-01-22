/**
 * Submissions Management Page
 * 
 * Shows ALL submissions across all events for admin/organizer/reviewer users.
 * Role-based: Admins see all, reviewers see assigned events, speakers see own submissions.
 */

import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth';
import { 
  decryptPiiFields, 
  USER_PII_FIELDS,
  SPEAKER_PROFILE_PII_FIELDS 
} from '@/lib/security/encryption';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { 
  FileText, 
  Calendar, 
  Clock, 
  Filter, 
  ExternalLink,
  Star,
  ChevronRight,
  CheckCircle,
  XCircle,
  Users
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import type { SubmissionStatus } from '@prisma/client';

export const metadata = {
  title: 'Submissions Management',
  description: 'View and manage all submissions across events',
};

export const dynamic = 'force-dynamic';

interface SubmissionsPageProps {
  searchParams: Promise<{ status?: string; event?: string }>;
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  UNDER_REVIEW: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  ACCEPTED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  WAITLISTED: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  WITHDRAWN: 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200',
};

const statusLabels: Record<string, string> = {
  PENDING: 'Pending',
  UNDER_REVIEW: 'Under Review',
  ACCEPTED: 'Accepted',
  REJECTED: 'Not Selected',
  WAITLISTED: 'Waitlisted',
  WITHDRAWN: 'Withdrawn',
};

export default async function SubmissionsPage({ searchParams }: SubmissionsPageProps) {
  const user = await getCurrentUser();
  const params = await searchParams;
  const statusFilter = params.status || 'all';
  const eventFilter = params.event;
  
  const userRole = user.role as string;
  const isAdmin = userRole === 'ADMIN';
  const isOrganizer = userRole === 'ORGANIZER';
  const isReviewer = userRole === 'REVIEWER';
  
  // For speakers (USER role), redirect to a speaker-specific page or show their own submissions
  if (!isAdmin && !isOrganizer && !isReviewer) {
    // Speaker view - show their own submissions
    return <SpeakerSubmissionsView userId={user.id} />;
  }
  
  // Get events the user can access
  const eventsQuery = prisma.event.findMany({
    where: isAdmin ? {} : {
      reviewTeam: {
        some: {
          userId: user.id,
        },
      },
    },
    orderBy: { startDate: 'desc' },
    select: {
      id: true,
      name: true,
      slug: true,
      startDate: true,
      cfpClosesAt: true,
      _count: {
        select: { submissions: true },
      },
    },
  });
  
  const events = await eventsQuery;
  
  if (events.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Submissions Management
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            View and manage all talk submissions
          </p>
        </div>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-10">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No events found</h3>
              <p className="text-muted-foreground mb-4">
                {isAdmin 
                  ? "No events have been created yet."
                  : "You haven't been assigned to any events as a reviewer."}
              </p>
              {isAdmin && (
                <Button asChild>
                  <Link href="/events/new">Create Event</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Get all submissions for accessible events
  const eventIds = events.map(e => e.id);
  
  const whereClause: {
    eventId: { in: string[] };
    status?: SubmissionStatus;
  } = {
    eventId: { in: eventIds },
  };
  
  // Apply status filter
  if (statusFilter && statusFilter !== 'all') {
    const statusMap: Record<string, SubmissionStatus> = {
      pending: 'PENDING',
      under_review: 'UNDER_REVIEW',
      accepted: 'ACCEPTED',
      rejected: 'REJECTED',
      waitlisted: 'WAITLISTED',
    };
    if (statusMap[statusFilter.toLowerCase()]) {
      whereClause.status = statusMap[statusFilter.toLowerCase()];
    }
  }
  
  const submissions = await prisma.submission.findMany({
    where: whereClause,
    include: {
      event: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      speaker: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          speakerProfile: {
            select: {
              fullName: true,
            },
          },
        },
      },
      track: {
        select: {
          name: true,
          color: true,
        },
      },
      format: {
        select: {
          name: true,
          durationMin: true,
        },
      },
      reviews: {
        select: {
          id: true,
          overallScore: true,
          reviewerId: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  
  // Decrypt speaker names and calculate review stats
  const processedSubmissions = submissions.map((submission) => {
    const decryptedUser = decryptPiiFields(
      submission.speaker as unknown as Record<string, unknown>,
      USER_PII_FIELDS
    );
    let speakerName = String(decryptedUser.name || '') || submission.speaker.email;
    if (submission.speaker.speakerProfile) {
      const decryptedProfile = decryptPiiFields(
        submission.speaker.speakerProfile as unknown as Record<string, unknown>,
        SPEAKER_PROFILE_PII_FIELDS
      );
      if (decryptedProfile.fullName) {
        speakerName = String(decryptedProfile.fullName);
      }
    }
    
    const reviewCount = submission.reviews.length;
    const avgScore = reviewCount > 0
      ? submission.reviews.reduce((sum, r) => sum + (r.overallScore || 0), 0) / reviewCount
      : null;
    const userHasReviewed = submission.reviews.some(r => r.reviewerId === user.id);
    
    return {
      ...submission,
      speakerName,
      speakerInitials: speakerName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
      reviewCount,
      avgScore,
      userHasReviewed,
    };
  });
  
  // Calculate stats
  const stats = {
    total: processedSubmissions.length,
    pending: processedSubmissions.filter(s => s.status === 'PENDING' || s.status === 'UNDER_REVIEW').length,
    accepted: processedSubmissions.filter(s => s.status === 'ACCEPTED').length,
    rejected: processedSubmissions.filter(s => s.status === 'REJECTED').length,
  };
  
  // Group submissions by event
  const submissionsByEvent = events.map(event => {
    const eventSubmissions = processedSubmissions.filter(s => s.eventId === event.id);
    return {
      event,
      submissions: eventSubmissions,
    };
  }).filter(group => group.submissions.length > 0 || !eventFilter);
  
  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-slate-400';
    if (score >= 4) return 'text-green-600 dark:text-green-400';
    if (score >= 3) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Submissions Management
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Review and manage all talk submissions
          </p>
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                {statusFilter === 'all' ? 'All Status' : statusLabels[statusFilter.toUpperCase()] || statusFilter}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href="/submissions">All</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/submissions?status=pending">Pending</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/submissions?status=under_review">Under Review</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/submissions?status=accepted">Accepted</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/submissions?status=rejected">Not Selected</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/submissions?status=waitlisted">Waitlisted</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              Across {events.length} event{events.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accepted</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.accepted}</div>
            <p className="text-xs text-muted-foreground">Ready for scheduling</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Not Selected</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            <p className="text-xs text-muted-foreground">Rejected submissions</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Submissions by Event Tabs */}
      {submissionsByEvent.length > 0 ? (
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList className="w-full flex-wrap h-auto p-1">
            {/* All Events Tab - Default */}
            <TabsTrigger 
              value="all"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <FileText className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="truncate">All Events</span>
              <Badge variant="secondary" className="ml-2">
                {processedSubmissions.length}
              </Badge>
            </TabsTrigger>
            {submissionsByEvent.map(({ event, submissions }) => (
              <TabsTrigger 
                key={event.id} 
                value={event.id}
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="truncate">{event.name}</span>
                <Badge variant="secondary" className="ml-2">
                  {submissions.length}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>
          
          {/* All Events Content */}
          <TabsContent value="all" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>All Submissions</CardTitle>
                    <CardDescription>
                      <span className="flex items-center gap-1 mt-2">
                        <Users className="h-4 w-4" />
                        {processedSubmissions.length} submission{processedSubmissions.length !== 1 ? 's' : ''} across {events.length} event{events.length !== 1 ? 's' : ''}
                      </span>
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {processedSubmissions.length === 0 ? (
                  <div className="text-center py-10">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No submissions</h3>
                    <p className="text-muted-foreground">
                      {statusFilter !== 'all' 
                        ? 'No submissions match this filter'
                        : "No submissions have been received yet."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {processedSubmissions.map((submission) => (
                      <Link
                        key={submission.id}
                        href={`/events/${submission.event.slug}/submissions/${submission.id}`}
                        className="block group"
                      >
                        <div className={`flex items-start gap-4 p-4 rounded-lg border transition-all hover:shadow-md hover:-translate-y-0.5 ${
                          submission.userHasReviewed 
                            ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' 
                            : 'bg-white dark:bg-slate-800 hover:border-blue-300'
                        }`}>
                          {/* Speaker Avatar */}
                          <Avatar className="h-10 w-10 flex-shrink-0">
                            <AvatarImage src={submission.speaker.image || undefined} />
                            <AvatarFallback className="bg-slate-100 dark:bg-slate-700 text-sm">
                              {submission.speakerInitials}
                            </AvatarFallback>
                          </Avatar>
                          
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <h3 className="font-semibold text-slate-900 dark:text-white line-clamp-1 group-hover:text-blue-600 transition-colors">
                                    {submission.title}
                                  </h3>
                                  <Badge className={statusColors[submission.status]}>
                                    {statusLabels[submission.status]}
                                  </Badge>
                                  {submission.userHasReviewed && (
                                    <Badge variant="default" className="bg-green-600 text-white text-xs">
                                      Reviewed
                                    </Badge>
                                  )}
                                </div>
                                
                                <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-1 mb-2">
                                  {submission.abstract}
                                </p>
                                
                                <div className="flex items-center gap-4 text-sm text-slate-500 flex-wrap">
                                  <span className="font-medium text-slate-700 dark:text-slate-300">
                                    {submission.speakerName}
                                  </span>
                                  {/* Event name indicator */}
                                  <Badge variant="outline" className="text-xs">
                                    {submission.event.name}
                                  </Badge>
                                  {submission.track && (
                                    <Badge 
                                      variant="outline" 
                                      className="text-xs"
                                      style={{ 
                                        borderColor: submission.track.color || undefined,
                                        backgroundColor: submission.track.color ? `${submission.track.color}20` : undefined,
                                      }}
                                    >
                                      {submission.track.name}
                                    </Badge>
                                  )}
                                  {submission.format && (
                                    <span className="text-xs">{submission.format.name}</span>
                                  )}
                                  <span className="text-xs">
                                    {formatDistanceToNow(submission.createdAt, { addSuffix: true })}
                                  </span>
                                </div>
                              </div>
                              
                              {/* Score & Review Count */}
                              <div className="flex items-center gap-3 flex-shrink-0">
                                <div className="text-right">
                                  <div className={`flex items-center gap-1 ${getScoreColor(submission.avgScore)}`}>
                                    <Star className={`h-4 w-4 ${submission.avgScore !== null && submission.avgScore >= 4 ? 'fill-current' : ''}`} />
                                    <span className="font-semibold">
                                      {submission.avgScore !== null ? submission.avgScore.toFixed(1) : '-'}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-500">
                                    {submission.reviewCount} review{submission.reviewCount !== 1 ? 's' : ''}
                                  </p>
                                </div>
                                <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Individual Event Tabs */}
          {submissionsByEvent.map(({ event, submissions }) => (
            <TabsContent key={event.id} value={event.id} className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{event.name}</CardTitle>
                      <CardDescription>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {event.startDate ? format(event.startDate, 'PP') : 'Date TBD'}
                          </span>
                          {event.cfpClosesAt && new Date(event.cfpClosesAt) > new Date() ? (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              CFP Open until {format(event.cfpClosesAt, 'PP')}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-slate-500">
                              CFP Closed
                            </Badge>
                          )}
                        </div>
                      </CardDescription>
                    </div>
                    <Button asChild variant="outline">
                      <Link href={`/events/${event.slug}`}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Manage Event
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {submissions.length === 0 ? (
                    <div className="text-center py-10">
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">No submissions</h3>
                      <p className="text-muted-foreground">
                        {statusFilter !== 'all' 
                          ? 'No submissions match this filter'
                          : "This event hasn't received any submissions yet."}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {submissions.map((submission) => (
                        <Link
                          key={submission.id}
                          href={`/events/${event.slug}/submissions/${submission.id}`}
                          className="block group"
                        >
                          <div className={`flex items-start gap-4 p-4 rounded-lg border transition-all hover:shadow-md hover:-translate-y-0.5 ${
                            submission.userHasReviewed 
                              ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' 
                              : 'bg-white dark:bg-slate-800 hover:border-blue-300'
                          }`}>
                            {/* Speaker Avatar */}
                            <Avatar className="h-10 w-10 flex-shrink-0">
                              <AvatarImage src={submission.speaker.image || undefined} />
                              <AvatarFallback className="bg-slate-100 dark:bg-slate-700 text-sm">
                                {submission.speakerInitials}
                              </AvatarFallback>
                            </Avatar>
                            
                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <h3 className="font-semibold text-slate-900 dark:text-white line-clamp-1 group-hover:text-blue-600 transition-colors">
                                      {submission.title}
                                    </h3>
                                    <Badge className={statusColors[submission.status]}>
                                      {statusLabels[submission.status]}
                                    </Badge>
                                    {submission.userHasReviewed && (
                                      <Badge variant="default" className="bg-green-600 text-white text-xs">
                                        Reviewed
                                      </Badge>
                                    )}
                                  </div>
                                  
                                  <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-1 mb-2">
                                    {submission.abstract}
                                  </p>
                                  
                                  <div className="flex items-center gap-4 text-sm text-slate-500">
                                    <span className="font-medium text-slate-700 dark:text-slate-300">
                                      {submission.speakerName}
                                    </span>
                                    {submission.track && (
                                      <Badge 
                                        variant="outline" 
                                        className="text-xs"
                                        style={{ 
                                          borderColor: submission.track.color || undefined,
                                          backgroundColor: submission.track.color ? `${submission.track.color}20` : undefined,
                                        }}
                                      >
                                        {submission.track.name}
                                      </Badge>
                                    )}
                                    {submission.format && (
                                      <span className="text-xs">{submission.format.name}</span>
                                    )}
                                    <span className="text-xs">
                                      {formatDistanceToNow(submission.createdAt, { addSuffix: true })}
                                    </span>
                                  </div>
                                </div>
                                
                                {/* Score & Review Count */}
                                <div className="flex items-center gap-3 flex-shrink-0">
                                  <div className="text-right">
                                    <div className={`flex items-center gap-1 ${getScoreColor(submission.avgScore)}`}>
                                      <Star className={`h-4 w-4 ${submission.avgScore !== null && submission.avgScore >= 4 ? 'fill-current' : ''}`} />
                                      <span className="font-semibold">
                                        {submission.avgScore !== null ? submission.avgScore.toFixed(1) : '-'}
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-500">
                                      {submission.reviewCount} review{submission.reviewCount !== 1 ? 's' : ''}
                                    </p>
                                  </div>
                                  <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                                </div>
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-10">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No submissions found</h3>
              <p className="text-muted-foreground">
                {statusFilter !== 'all' 
                  ? 'No submissions match this filter. Try a different filter.'
                  : 'No submissions have been received yet.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Speaker-specific view showing their own submissions
async function SpeakerSubmissionsView({ userId }: { userId: string }) {
  const submissions = await prisma.submission.findMany({
    where: { speakerId: userId },
    include: {
      event: {
        select: {
          id: true,
          name: true,
          slug: true,
          startDate: true,
        },
      },
      track: {
        select: {
          name: true,
          color: true,
        },
      },
      _count: {
        select: {
          reviews: true,
          messages: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  
  const stats = {
    total: submissions.length,
    active: submissions.filter(s => ['PENDING', 'UNDER_REVIEW'].includes(s.status)).length,
    accepted: submissions.filter(s => s.status === 'ACCEPTED').length,
    rejected: submissions.filter(s => s.status === 'REJECTED').length,
  };
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          My Submissions
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Track your talk submissions across all events
        </p>
      </div>
      
      {submissions.length > 0 ? (
        <>
          {/* Stats */}
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4 mb-8">
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-sm text-muted-foreground">Total</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-amber-600">{stats.active}</div>
                <p className="text-sm text-muted-foreground">Active</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-green-600">{stats.accepted}</div>
                <p className="text-sm text-muted-foreground">Accepted</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
                <p className="text-sm text-muted-foreground">Not Selected</p>
              </CardContent>
            </Card>
          </div>
          
          {/* Submissions List */}
          <div className="space-y-3">
            {submissions.map((submission) => (
              <Link
                key={submission.id}
                href={`/events/${submission.event.slug}/submissions/${submission.id}`}
              >
                <Card className="hover:shadow-lg transition-all hover:-translate-y-0.5">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge className={statusColors[submission.status]}>
                            {statusLabels[submission.status]}
                          </Badge>
                          {submission.track && (
                            <Badge 
                              variant="outline" 
                              className="text-xs"
                              style={{ 
                                borderColor: submission.track.color || undefined,
                              }}
                            >
                              {submission.track.name}
                            </Badge>
                          )}
                        </div>
                        
                        <h3 className="font-semibold text-slate-900 dark:text-white line-clamp-1">
                          {submission.title}
                        </h3>
                        
                        <p className="text-sm text-slate-500 mt-0.5">
                          {submission.event.name}
                        </p>
                        
                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                          <span>
                            {formatDistanceToNow(submission.createdAt, { addSuffix: true })}
                          </span>
                          {submission._count.messages > 0 && (
                            <span className="text-blue-600">
                              {submission._count.messages} message{submission._count.messages !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-slate-400 flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-10">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No submissions yet</h3>
              <p className="text-muted-foreground mb-4">
                Find events with open calls for papers and submit your talk ideas!
              </p>
              <Button asChild>
                <Link href="/browse">Browse Events</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
