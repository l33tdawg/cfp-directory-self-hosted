/**
 * Submit Talk Page
 * 
 * Form to submit a talk to an event's CFP.
 */

import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth';
import { notFound, redirect } from 'next/navigation';
import { SubmitTalkForm } from './submit-talk-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Globe } from 'lucide-react';
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
  const _user = await getCurrentUser(); // User available for auth checks
  
  const event = await prisma.event.findUnique({
    where: { slug },
    include: {
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
          />
        </CardContent>
      </Card>
    </div>
  );
}
