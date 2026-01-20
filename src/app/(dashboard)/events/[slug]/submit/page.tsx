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
  const user = await getCurrentUser();
  
  const event = await prisma.event.findUnique({
    where: { slug },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
        },
      },
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
              <CardDescription>{event.organization.name}</CardDescription>
              <CardTitle className="text-2xl">{event.name}</CardTitle>
            </div>
            <Badge className="bg-green-500">CFP Open</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-400">
            {event.startDate && (
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{format(event.startDate, 'MMM d, yyyy')}</span>
              </div>
            )}
            {event.location && (
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                <span>{event.location}</span>
              </div>
            )}
            {event.isVirtual && (
              <div className="flex items-center gap-1">
                <Globe className="h-4 w-4" />
                <span>Virtual</span>
              </div>
            )}
          </div>
          
          {event.cfpDescription && (
            <div className="pt-4 border-t">
              <h4 className="font-medium mb-2">What we're looking for:</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                {event.cfpDescription}
              </p>
            </div>
          )}
          
          {event.cfpClosesAt && (
            <div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400">
              <Calendar className="h-4 w-4" />
              <span>CFP closes {format(event.cfpClosesAt, 'MMMM d, yyyy')}</span>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Submission Form */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Submit Your Talk
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Fill out the form below to submit your proposal
        </p>
      </div>
      
      <Card>
        <CardContent className="pt-6">
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
