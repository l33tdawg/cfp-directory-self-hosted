/**
 * Event Detail Page
 * 
 * Shows event details, CFP settings, and management options.
 */

import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth';
import { notFound } from 'next/navigation';
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
  Send
} from 'lucide-react';
import { format } from 'date-fns';
import { EventTracksSection } from './event-tracks-section';
import { EventFormatsSection } from './event-formats-section';
import { EventReviewTeamSection } from './event-review-team-section';
import { EventFederationSection } from './event-federation-section';

interface EventDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: EventDetailPageProps) {
  const { slug } = await params;
  const event = await prisma.event.findUnique({
    where: { slug },
    select: { name: true },
  });
  
  return {
    title: event?.name || 'Event',
  };
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
  const isOrganizer = ['ADMIN', 'ORGANIZER'].includes(user.role);
  const canManage = isOrganizer;
  
  // Non-organizers can't see unpublished events
  if (!canManage && !event.isPublished) {
    notFound();
  }
  
  const now = new Date();
  const isCfpOpen = event.cfpOpensAt && event.cfpClosesAt 
    ? now >= event.cfpOpensAt && now <= event.cfpClosesAt 
    : false;
  const isCfpUpcoming = event.cfpOpensAt ? now < event.cfpOpensAt : false;
  
  // Get reviewer user info
  const reviewerIds = event.reviewTeam.map(r => r.userId);
  const reviewers = reviewerIds.length > 0 
    ? await prisma.user.findMany({
        where: { id: { in: reviewerIds } },
        select: { id: true, name: true, email: true, image: true },
      })
    : [];
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <Link 
            href="/events"
            className="text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white mb-2 inline-block"
          >
            ← Back to Events
          </Link>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            {event.name}
          </h1>
          <div className="flex items-center gap-2 mt-2">
            {!event.isPublished && (
              <Badge variant="outline">Draft</Badge>
            )}
            {isCfpOpen && (
              <Badge className="bg-green-500">CFP Open</Badge>
            )}
            {isCfpUpcoming && (
              <Badge variant="secondary">CFP Opens Soon</Badge>
            )}
            {event.isVirtual && (
              <Badge variant="outline">
                <Globe className="h-3 w-3 mr-1" />
                Virtual
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex gap-2">
          {isCfpOpen && (
            <Button asChild>
              <Link href={`/events/${event.slug}/submit`}>
                <Send className="h-4 w-4 mr-2" />
                Submit Talk
              </Link>
            </Button>
          )}
          {canManage && (
            <>
              <Button variant="outline" asChild>
                <Link href={`/events/${event.slug}/edit`}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href={`/events/${event.slug}/submissions`}>
                  <FileText className="h-4 w-4 mr-2" />
                  Submissions
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
      
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-slate-500" />
              <span className="text-2xl font-bold">{event._count.submissions}</span>
            </div>
            <p className="text-sm text-slate-500">Submissions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-slate-500" />
              <span className="text-2xl font-bold">{event.tracks.length}</span>
            </div>
            <p className="text-sm text-slate-500">Tracks</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-500" />
              <span className="text-2xl font-bold">{event.formats.length}</span>
            </div>
            <p className="text-sm text-slate-500">Formats</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-500" />
              <span className="text-2xl font-bold">{event.reviewTeam.length}</span>
            </div>
            <p className="text-sm text-slate-500">Reviewers</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="cfp">CFP Settings</TabsTrigger>
          {canManage && (
            <>
              <TabsTrigger value="tracks">Tracks</TabsTrigger>
              <TabsTrigger value="formats">Formats</TabsTrigger>
              <TabsTrigger value="team">Review Team</TabsTrigger>
              <TabsTrigger value="federation" className="flex items-center gap-1">
                <Globe2 className="h-3 w-3" />
                Federation
              </TabsTrigger>
            </>
          )}
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Event Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {event.description && (
                <div>
                  <h4 className="text-sm font-medium text-slate-500 mb-1">Description</h4>
                  <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                    {event.description}
                  </p>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {event.startDate && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-500" />
                    <div>
                      <p className="text-sm font-medium">
                        {format(event.startDate, 'MMM d, yyyy')}
                        {event.endDate && ` - ${format(event.endDate, 'MMM d, yyyy')}`}
                      </p>
                      <p className="text-xs text-slate-500">{event.timezone}</p>
                    </div>
                  </div>
                )}
                
                {event.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-slate-500" />
                    <p className="text-sm">{event.location}</p>
                  </div>
                )}
                
                {event.websiteUrl && (
                  <div className="flex items-center gap-2">
                    <ExternalLink className="h-4 w-4 text-slate-500" />
                    <a 
                      href={event.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {event.websiteUrl}
                    </a>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
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
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-slate-500 mb-1">Opens</h4>
                  <p className="text-slate-700 dark:text-slate-300">
                    {event.cfpOpensAt 
                      ? format(event.cfpOpensAt, 'PPp')
                      : 'Not set'}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-slate-500 mb-1">Closes</h4>
                  <p className="text-slate-700 dark:text-slate-300">
                    {event.cfpClosesAt 
                      ? format(event.cfpClosesAt, 'PPp')
                      : 'Not set'}
                  </p>
                </div>
              </div>
              
              {event.cfpDescription && (
                <div>
                  <h4 className="text-sm font-medium text-slate-500 mb-1">Description</h4>
                  <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                    {event.cfpDescription}
                  </p>
                </div>
              )}
              
              {/* Available Tracks */}
              {event.tracks.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-slate-500 mb-2">Available Tracks</h4>
                  <div className="flex flex-wrap gap-2">
                    {event.tracks.map((track) => (
                      <Badge 
                        key={track.id} 
                        variant="secondary"
                        style={{ backgroundColor: track.color || undefined }}
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
                  <h4 className="text-sm font-medium text-slate-500 mb-2">Session Formats</h4>
                  <div className="flex flex-wrap gap-2">
                    {event.formats.map((format) => (
                      <Badge key={format.id} variant="outline">
                        {format.name} ({format.durationMin} min)
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
  );
}
