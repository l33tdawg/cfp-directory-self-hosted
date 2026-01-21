/**
 * Edit Event Page
 * 
 * Comprehensive form to edit an existing event.
 */

import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth';
import { notFound, redirect } from 'next/navigation';
import { EventForm } from '@/components/forms/event-form';
import { format } from 'date-fns';

interface EditEventPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: EditEventPageProps) {
  const { slug } = await params;
  const event = await prisma.event.findUnique({
    where: { slug },
    select: { name: true },
  });
  
  return {
    title: event ? `Edit ${event.name}` : 'Edit Event',
    description: event ? `Edit settings for ${event.name}` : 'Edit event settings',
  };
}

export default async function EditEventPage({ params }: EditEventPageProps) {
  const { slug } = await params;
  const user = await getCurrentUser();
  
  const event = await prisma.event.findUnique({
    where: { slug },
    include: {
      talkFormats: {
        orderBy: { sortOrder: 'asc' },
      },
      reviewCriteria: {
        orderBy: { sortOrder: 'asc' },
      },
      // SECURITY: Fetch review team role to check LEAD status
      reviewTeam: {
        where: { userId: user.id },
        select: { role: true },
      },
    },
  });
  
  if (!event) {
    notFound();
  }
  
  // SECURITY: Check if user can edit this event using event-scoped authorization
  // Admins can edit all events; Organizers must be LEAD on the review team
  const isAdmin = user.role === 'ADMIN';
  const isLead = event.reviewTeam[0]?.role === 'LEAD';
  const canEdit = isAdmin || isLead;
  
  if (!canEdit) {
    redirect(`/events/${slug}`);
  }
  
  // Format dates for the form
  const formatDateForInput = (date: Date | null) => {
    if (!date) return '';
    try {
      return format(new Date(date), 'yyyy-MM-dd');
    } catch {
      return '';
    }
  };
  
  // Prepare event data for the form
  const eventData = {
    id: event.id,
    slug: event.slug,
    status: event.status,
    
    // Basic Info
    name: event.name,
    description: event.description || '',
    websiteUrl: event.websiteUrl || '',
    eventType: event.eventType,
    
    // Location
    venueName: event.venueName || '',
    venueAddress: event.venueAddress || '',
    venueCity: event.venueCity || '',
    country: event.country || 'US',
    isVirtual: event.isVirtual,
    virtualUrl: event.virtualUrl || '',
    
    // Event Dates
    startDate: formatDateForInput(event.startDate),
    endDate: formatDateForInput(event.endDate),
    startTime: event.startTime || '09:00',
    endTime: event.endTime || '17:00',
    timezone: event.timezone,
    
    // Topics & Audience
    topics: event.topics || [],
    audienceLevel: event.audienceLevel || [],
    
    // CFP Settings
    cfpOpensAt: formatDateForInput(event.cfpOpensAt),
    cfpClosesAt: formatDateForInput(event.cfpClosesAt),
    cfpStartTime: event.cfpStartTime || '09:00',
    cfpEndTime: event.cfpEndTime || '23:59',
    cfpGuidelines: event.cfpGuidelines || '',
    speakerBenefits: event.speakerBenefits || '',
    
    // Talk Formats
    talkFormats: event.talkFormats.map(f => ({
      id: f.id,
      name: f.name,
      description: f.description || '',
      durationMin: f.durationMin,
    })),
    
    // Review Settings
    reviewType: event.reviewType,
    minReviewsPerTalk: event.minReviewsPerTalk,
    enableSpeakerFeedback: event.enableSpeakerFeedback,
    reviewCriteria: event.reviewCriteria.map(c => ({
      id: c.id,
      name: c.name,
      description: c.description || '',
      weight: c.weight,
    })),
    
    // Notification Settings
    notifyOnNewSubmission: event.notifyOnNewSubmission,
    notifyOnNewReview: event.notifyOnNewReview,
  };
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          Edit Event
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Update settings for {event.name}
        </p>
      </div>
      
      <EventForm 
        mode="edit"
        event={eventData}
      />
    </div>
  );
}
