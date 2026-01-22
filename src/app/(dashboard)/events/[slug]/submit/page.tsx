/**
 * Submit Talk Page
 * 
 * Form to submit a talk to an event's CFP.
 * Access restricted to USER and SPEAKER roles only.
 * ADMIN can access with a testing banner.
 * ORGANIZER and REVIEWER roles are redirected.
 */

import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth';
import { notFound, redirect } from 'next/navigation';
import { SubmitTalkForm } from './submit-talk-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, MapPin, Globe, ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';

interface SubmitTalkPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: SubmitTalkPageProps) {
  const { slug } = await params;
  const event = await prisma.event.findUnique({
    where: { slug },
    select: { name: true },
  });
  
  return {
    title: event ? `Submit to ${event.name}` : 'Submit Talk',
  };
}

export default async function SubmitTalkPage({ params }: SubmitTalkPageProps) {
  const { slug } = await params;
  const user = await getCurrentUser();
  
  // Redirect unauthenticated users
  if (!user) {
    redirect(`/auth/signin?callbackUrl=/events/${slug}/submit`);
  }
  
  // Role-based access control
  // Only USER, SPEAKER, and ADMIN can access this page
  // ORGANIZER and REVIEWER should use event management pages, not submit talks here
  const allowedRoles = ['USER', 'SPEAKER', 'ADMIN'];
  if (!allowedRoles.includes(user.role)) {
    // Redirect ORGANIZER and REVIEWER to the event page
    redirect(`/events/${slug}?error=role-not-allowed`);
  }
  
  const isAdminTesting = user.role === 'ADMIN';
  
  const event = await prisma.event.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      startDate: true,
      location: true,
      isVirtual: true,
      cfpOpensAt: true,
      cfpClosesAt: true,
      cfpDescription: true,
      topics: true,
      audienceLevel: true,
      tracks: {
        orderBy: { name: 'asc' },
      },
      formats: {
        orderBy: { durationMin: 'asc' },
      },
    },
  });
  
  if (!event) {
    notFound();
  }
  
  // Check if CFP is open
  const now = new Date();
  const cfpOpen = event.cfpOpensAt && event.cfpClosesAt
    ? now >= event.cfpOpensAt && now <= event.cfpClosesAt
    : false;
  
  if (!cfpOpen) {
    redirect(`/events/${slug}?error=cfp-closed`);
  }
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Admin Testing Banner */}
      {isAdminTesting && (
        <Alert className="mb-6 border-amber-500 bg-amber-50 dark:bg-amber-950/20">
          <ShieldAlert className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            <strong>Admin Testing Mode:</strong> You&apos;re viewing this page as an admin to test the submission flow. 
            Any submissions you create will be real submissions.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Event Header */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{event.name}</CardTitle>
            </div>
            <Badge className="bg-green-500">CFP Open</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-400">
            {event.startDate && (
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {format(event.startDate, 'MMMM d, yyyy')}
              </span>
            )}
            {event.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {event.location}
              </span>
            )}
            {event.isVirtual && (
              <span className="flex items-center gap-1">
                <Globe className="h-4 w-4" />
                Virtual Event
              </span>
            )}
            {event.cfpClosesAt && (
              <span className="text-orange-600 dark:text-orange-400">
                Deadline: {format(event.cfpClosesAt, 'MMMM d, yyyy')}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* CFP Description */}
      {event.cfpDescription && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Submission Guidelines</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose dark:prose-invert max-w-none">
              <pre className="whitespace-pre-wrap font-sans text-sm">
                {event.cfpDescription}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Submission Form */}
      <Card>
        <CardHeader>
          <CardTitle>Submit Your Talk</CardTitle>
          <CardDescription>
            Fill out the form below to submit your talk proposal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SubmitTalkForm 
            eventId={event.id}
            eventSlug={event.slug}
            tracks={event.tracks}
            formats={event.formats}
            topics={event.topics}
            audienceLevels={event.audienceLevel}
          />
        </CardContent>
      </Card>
    </div>
  );
}
