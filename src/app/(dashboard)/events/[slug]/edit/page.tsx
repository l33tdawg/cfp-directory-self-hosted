/**
 * Edit Event Page
 * 
 * Form to edit an existing event.
 */

import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth';
import { notFound, redirect } from 'next/navigation';
import { EditEventForm } from './edit-event-form';

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
  };
}

export default async function EditEventPage({ params }: EditEventPageProps) {
  const { slug } = await params;
  const user = await getCurrentUser();
  const userRole = user.role as string;
  
  const event = await prisma.event.findUnique({
    where: { slug },
  });
  
  if (!event) {
    notFound();
  }
  
  // Check if user can edit this event - only organizers and admins
  const canEdit = ['ADMIN', 'ORGANIZER'].includes(userRole);
  
  if (!canEdit) {
    redirect(`/events/${slug}`);
  }
  
  // Format dates for the form
  const formatDateForInput = (date: Date | null) => {
    if (!date) return '';
    return new Date(date).toISOString().slice(0, 16);
  };
  
  const defaultValues = {
    name: event.name,
    slug: event.slug,
    description: event.description || '',
    websiteUrl: event.websiteUrl || '',
    location: event.location || '',
    isVirtual: event.isVirtual,
    startDate: formatDateForInput(event.startDate),
    endDate: formatDateForInput(event.endDate),
    timezone: event.timezone,
    cfpOpensAt: formatDateForInput(event.cfpOpensAt),
    cfpClosesAt: formatDateForInput(event.cfpClosesAt),
    cfpDescription: event.cfpDescription || '',
    isPublished: event.isPublished,
  };
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          Edit Event
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Update event details and CFP settings
        </p>
      </div>
      
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
        <EditEventForm 
          eventId={event.id}
          eventSlug={event.slug}
          defaultValues={defaultValues}
        />
      </div>
    </div>
  );
}
