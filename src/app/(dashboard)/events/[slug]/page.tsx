/**
 * Event Detail Page
 * 
 * Shows event details with a rich UI similar to the main CFP Directory platform.
 * Includes hero section, CFP details, management actions, and sidebar.
 */

import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth';
import { notFound } from 'next/navigation';
import { 
  decryptPiiFields, 
  USER_PII_FIELDS,
  SPEAKER_PROFILE_PII_FIELDS 
} from '@/lib/security/encryption';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, 
  MapPin, 
  Globe, 
  Globe2,
  ExternalLink, 
  FileText,
  Users,
  Clock,
  Tag,
  Edit,
  Send,
  ArrowLeft,
  ClipboardCheck,
  Timer,
  ListChecks,
  BarChart3,
  Eye
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { EventTracksSection } from './event-tracks-section';
import { EventFormatsSection } from './event-formats-section';
import { EventReviewTeamSection } from './event-review-team-section';
import { EventFederationSection } from './event-federation-section';

interface EventDetailPageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Generate page metadata
 */
export async function generateMetadata({ params }: EventDetailPageProps) {
  const { slug } = await params;
  const event = await prisma.event.findUnique({
    where: { slug },
    select: { name: true, isPublished: true },
  });
  
  if (event?.isPublished) {
    return { title: event.name };
  }
  
  return { title: 'Event Details' };
}

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { slug } = await params;
  const user = await getCurrentUser();
  
  const event = await prisma.event.findUnique({
    where: { slug },
    include: {
      tracks: {
        orderBy: { name: 'asc' },
        include: {
          _count: { select: { submissions: true } },
        },
      },
      formats: {
        orderBy: { durationMin: 'asc' },
        include: {
          _count: { select: { submissions: true } },
        },
      },
      reviewTeam: {
        orderBy: [{ role: 'asc' }, { addedAt: 'asc' }],
      },
      submissions: {
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          speaker: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              speakerProfile: {
                select: { fullName: true },
              },
            },
          },
        },
      },
      _count: {
        select: {
          submissions: true,
        },
      },
    },
  });
  
  if (!event) {
    notFound();
  }
  
  // Check permissions
  const isAdmin = user.role === 'ADMIN';
  const userReviewTeamRole = event.reviewTeam.find(r => r.userId === user.id)?.role;
  const isLead = userReviewTeamRole === 'LEAD';
  const isReviewer = userReviewTeamRole !== undefined;
  const canManage = isAdmin || isLead;
  const canReview = isAdmin || isReviewer;
  
  // Non-managers can't see unpublished events
  if (!canManage && !event.isPublished) {
    notFound();
  }
  
  const now = new Date();
  const isCfpOpen = event.cfpOpensAt && event.cfpClosesAt 
    ? now >= event.cfpOpensAt && now <= event.cfpClosesAt 
    : false;
  const isCfpUpcoming = event.cfpOpensAt ? now < event.cfpOpensAt : false;
  const isCfpClosed = event.cfpClosesAt ? now > event.cfpClosesAt : false;
  
  // Calculate days until CFP closes
  const daysUntilClose = event.cfpClosesAt && isCfpOpen
    ? Math.ceil((event.cfpClosesAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;
  
  // Get reviewer user info
  const reviewerIds = event.reviewTeam.map(r => r.userId);
  const reviewers = (canManage && reviewerIds.length > 0)
    ? await prisma.user.findMany({
        where: { id: { in: reviewerIds } },
        select: { id: true, name: true, email: canManage, image: true },
      })
    : [];
  
  // Decrypt recent submissions speaker names
  const recentSubmissions = event.submissions.map((submission) => {
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
    return {
      ...submission,
      speakerName,
    };
  });
  
  // Get review count
  const reviewCount = await prisma.review.count({
    where: {
      submission: {
        eventId: event.id,
      },
    },
  });
  
  // Calculate stats
  const stats = {
    submissions: event._count.submissions,
    reviews: reviewCount,
    reviewers: event.reviewTeam.length,
    tracks: event.tracks.length,
    formats: event.formats.length,
    pendingSubmissions: recentSubmissions.filter(s => s.status === 'PENDING' || s.status === 'UNDER_REVIEW').length,
    acceptedSubmissions: recentSubmissions.filter(s => s.status === 'ACCEPTED').length,
  };
  
  const statusColors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    UNDER_REVIEW: 'bg-blue-100 text-blue-800',
    ACCEPTED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
    WAITLISTED: 'bg-purple-100 text-purple-800',
  };
  
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          {/* Back Link */}
          <Link
            href="/events"
            className="inline-flex items-center text-blue-100 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Events
          </Link>

          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex-1">
              {/* Event Title */}
              <h1 className="text-3xl sm:text-4xl font-bold mb-3">
                {event.name}
              </h1>

              {/* Quick Info */}
              <div className="flex flex-wrap gap-4 text-blue-100 mb-4">
                {event.startDate && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {format(event.startDate, "MMM d, yyyy")}
                      {event.endDate && event.endDate !== event.startDate &&
                        <> - {format(event.endDate, "MMM d, yyyy")}</>}
                    </span>
                  </div>
                )}
                {event.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>{event.location}</span>
                  </div>
                )}
                {event.timezone && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>{event.timezone}</span>
                  </div>
                )}
              </div>
              
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2">
                {!event.isPublished && (
                  <Badge variant="outline" className="border-white/50 text-white">
                    Draft
                  </Badge>
                )}
                {isCfpOpen && (
                  <Badge className="bg-emerald-500 text-white hover:bg-emerald-600">
                    CFP Open
                    {daysUntilClose !== null && daysUntilClose <= 14 && (
                      <span className="ml-1">({daysUntilClose} days left)</span>
                    )}
                  </Badge>
                )}
                {isCfpUpcoming && (
                  <Badge className="bg-blue-500 text-white hover:bg-blue-600">
                    CFP Opens Soon
                  </Badge>
                )}
                {isCfpClosed && (
                  <Badge variant="secondary">
                    CFP Closed
                  </Badge>
                )}
                {event.isVirtual && (
                  <Badge variant="outline" className="border-white/50 text-white">
                    <Globe className="h-3 w-3 mr-1" />
                    Virtual
                  </Badge>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-2">
              {isCfpOpen && (
                <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Link href={`/events/${event.slug}/submit`}>
                    <Send className="h-4 w-4 mr-2" />
                    Submit Talk
                  </Link>
                </Button>
              )}
              {event.websiteUrl && (
                <Button asChild variant="outline" size="lg" className="bg-white/10 border-white/30 text-white hover:bg-white/20">
                  <a href={event.websiteUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Event Website
                  </a>
                </Button>
              )}
              {canManage && (
                <Button asChild variant="outline" size="lg" className="bg-white/10 border-white/30 text-white hover:bg-white/20">
                  <Link href={`/events/${event.slug}/edit`}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Event
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content Column - 2/3 width */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats Overview */}
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="h-4 w-4 text-blue-500" />
                    <span className="text-2xl font-bold">{stats.submissions}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Submissions</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-1">
                    <ClipboardCheck className="h-4 w-4 text-green-500" />
                    <span className="text-2xl font-bold">{stats.reviews}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Reviews</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="h-4 w-4 text-purple-500" />
                    <span className="text-2xl font-bold">{stats.reviewers}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Reviewers</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Tag className="h-4 w-4 text-orange-500" />
                    <span className="text-2xl font-bold">{stats.tracks}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Tracks</p>
                </CardContent>
              </Card>
            </div>

            {/* CFP Countdown Banner */}
            {isCfpOpen && event.cfpClosesAt && daysUntilClose !== null && daysUntilClose <= 14 && (
              <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <Timer className="h-5 w-5 text-amber-600" />
                    <div>
                      <p className="font-medium text-amber-800 dark:text-amber-200">
                        CFP closes {formatDistanceToNow(event.cfpClosesAt, { addSuffix: true })}
                      </p>
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        Deadline: {format(event.cfpClosesAt, 'PPP')} at {format(event.cfpClosesAt, 'p')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tabs for Details */}
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="h-auto flex-wrap">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="cfp">CFP Details</TabsTrigger>
                {canManage && (
                  <>
                    <TabsTrigger value="tracks">Tracks ({stats.tracks})</TabsTrigger>
                    <TabsTrigger value="formats">Formats ({stats.formats})</TabsTrigger>
                    <TabsTrigger value="team">Team ({stats.reviewers})</TabsTrigger>
                    <TabsTrigger value="federation" className="flex items-center gap-1">
                      <Globe2 className="h-3 w-3" />
                      Federation
                    </TabsTrigger>
                  </>
                )}
              </TabsList>
              
              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                {/* Event Description */}
                {event.description && (
                  <Card>
                    <CardHeader>
                      <CardTitle>About the Event</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div 
                        className="prose prose-slate dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: event.description }}
                      />
                    </CardContent>
                  </Card>
                )}
                
                {/* Recent Submissions */}
                {canReview && recentSubmissions.length > 0 && (
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle>Recent Submissions</CardTitle>
                        <CardDescription>Latest talk proposals for this event</CardDescription>
                      </div>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/events/${event.slug}/submissions`}>
                          View All
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </Link>
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {recentSubmissions.map((submission) => (
                          <div key={submission.id} className="flex items-center justify-between py-2 border-b last:border-0">
                            <div className="flex-1 min-w-0">
                              <Link 
                                href={`/events/${event.slug}/submissions/${submission.id}`}
                                className="font-medium hover:text-blue-600 transition-colors block truncate"
                              >
                                {submission.title}
                              </Link>
                              <p className="text-sm text-muted-foreground">
                                by {submission.speakerName} • {formatDistanceToNow(submission.createdAt, { addSuffix: true })}
                              </p>
                            </div>
                            <Badge className={statusColors[submission.status]}>
                              {submission.status.replace('_', ' ')}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
              
              {/* CFP Settings Tab */}
              <TabsContent value="cfp" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Call for Papers</CardTitle>
                    <CardDescription>
                      {isCfpOpen 
                        ? 'Currently accepting submissions'
                        : isCfpUpcoming
                        ? 'CFP opens soon'
                        : 'CFP is closed'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* CFP Timeline */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <h4 className="font-semibold">CFP Timeline</h4>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <div className={`w-2 h-2 rounded-full ${isCfpUpcoming ? 'bg-blue-500' : 'bg-slate-400'}`}></div>
                            <span className="text-muted-foreground">
                              Opens: {event.cfpOpensAt ? format(event.cfpOpensAt, 'PPP') : 'Not set'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <div className={`w-2 h-2 rounded-full ${isCfpOpen ? 'bg-emerald-500' : isCfpClosed ? 'bg-red-500' : 'bg-slate-400'}`}></div>
                            <span className="text-muted-foreground">
                              Closes: {event.cfpClosesAt ? format(event.cfpClosesAt, 'PPP') : 'Not set'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <h4 className="font-semibold">Status</h4>
                        <Badge
                          className={
                            isCfpOpen 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : isCfpUpcoming
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-slate-100 text-slate-800'
                          }
                        >
                          {isCfpOpen ? 'Open for Submissions' : 
                           isCfpUpcoming ? 'Opening Soon' : 'Closed'}
                        </Badge>
                      </div>
                    </div>
                    
                    {/* CFP Description */}
                    {event.cfpDescription && (
                      <div>
                        <h4 className="font-semibold mb-2">Submission Guidelines</h4>
                        <div 
                          className="prose prose-sm prose-slate dark:prose-invert max-w-none"
                          dangerouslySetInnerHTML={{ __html: event.cfpDescription }}
                        />
                      </div>
                    )}
                    
                    {/* Available Tracks */}
                    {event.tracks.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Available Tracks</h4>
                        <div className="flex flex-wrap gap-2">
                          {event.tracks.map((track) => (
                            <Badge 
                              key={track.id} 
                              variant="outline"
                              style={{ 
                                borderColor: track.color || undefined,
                                backgroundColor: track.color ? `${track.color}20` : undefined,
                              }}
                            >
                              {track.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Available Formats */}
                    {event.formats.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Session Formats</h4>
                        <div className="flex flex-wrap gap-2">
                          {event.formats.map((fmt) => (
                            <Badge key={fmt.id} variant="secondary">
                              {fmt.name} ({fmt.durationMin} min)
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Tracks Tab */}
              {canManage && (
                <TabsContent value="tracks">
                  <EventTracksSection 
                    eventId={event.id} 
                    tracks={event.tracks} 
                  />
                </TabsContent>
              )}
              
              {/* Formats Tab */}
              {canManage && (
                <TabsContent value="formats">
                  <EventFormatsSection 
                    eventId={event.id} 
                    formats={event.formats} 
                  />
                </TabsContent>
              )}
              
              {/* Review Team Tab */}
              {canManage && (
                <TabsContent value="team">
                  <EventReviewTeamSection 
                    eventId={event.id} 
                    reviewTeam={event.reviewTeam}
                    reviewers={reviewers}
                  />
                </TabsContent>
              )}
              
              {/* Federation Tab */}
              {canManage && (
                <TabsContent value="federation">
                  <EventFederationSection eventId={event.id} />
                </TabsContent>
              )}
            </Tabs>
          </div>

          {/* Sidebar - 1/3 width */}
          <div className="space-y-6">
            {/* Quick Actions */}
            {canManage && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Event Management
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button asChild variant="outline" className="w-full justify-start">
                    <Link href={`/events/${event.slug}/submissions`}>
                      <FileText className="h-4 w-4 mr-2" />
                      Review Submissions
                      {stats.submissions > 0 && (
                        <Badge variant="secondary" className="ml-auto">
                          {stats.submissions}
                        </Badge>
                      )}
                    </Link>
                  </Button>
                  
                  <Button asChild variant="outline" className="w-full justify-start">
                    <Link href={`/events/${event.slug}/edit`}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Event Settings
                    </Link>
                  </Button>
                  
                  <Button asChild variant="outline" className="w-full justify-start">
                    <Link href={`/e/${event.slug}`}>
                      <Eye className="h-4 w-4 mr-2" />
                      View Public Page
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Event Details Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Event Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {event.startDate && (
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium">When</h4>
                      <p className="text-sm text-muted-foreground">
                        {format(event.startDate, "EEEE, MMMM d, yyyy")}
                        {event.endDate && event.endDate !== event.startDate &&
                          <><br />to {format(event.endDate, "EEEE, MMMM d, yyyy")}</>}
                      </p>
                      {event.timezone && (
                        <p className="text-xs text-muted-foreground mt-1">{event.timezone}</p>
                      )}
                    </div>
                  </div>
                )}

                {event.location && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium">Where</h4>
                      <p className="text-sm text-muted-foreground">{event.location}</p>
                      {event.isVirtual && (
                        <Badge variant="outline" className="mt-1 text-xs">
                          <Globe className="h-3 w-3 mr-1" />
                          Virtual
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {event.websiteUrl && (
                  <div className="flex items-start gap-3">
                    <ExternalLink className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium">Website</h4>
                      <a 
                        href={event.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline break-all"
                      >
                        {event.websiteUrl}
                      </a>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Talk Formats */}
            {event.formats.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ListChecks className="h-5 w-5" />
                    Talk Formats
                  </CardTitle>
                  <CardDescription>
                    Accepted presentation types
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {event.formats.map((fmt) => (
                      <div key={fmt.id} className="flex items-center justify-between py-1">
                        <h4 className="font-medium text-sm">{fmt.name}</h4>
                        <Badge variant="outline" className="text-xs">
                          {fmt.durationMin} min
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tracks */}
            {event.tracks.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="h-5 w-5" />
                    Tracks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {event.tracks.map((track) => (
                      <Badge 
                        key={track.id} 
                        variant="outline"
                        style={{ 
                          borderColor: track.color || undefined,
                          backgroundColor: track.color ? `${track.color}20` : undefined,
                        }}
                      >
                        {track.name}
                        {track._count.submissions > 0 && (
                          <span className="ml-1 text-xs">({track._count.submissions})</span>
                        )}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
