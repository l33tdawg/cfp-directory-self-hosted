/**
 * Edit Event Form (Client Component)
 * 
 * Handles the form submission for editing events.
 */

'use client';

import { useRouter } from 'next/navigation';
import { EventForm } from '@/components/events/event-form';
import { useApi } from '@/hooks/use-api';
import { toast } from 'sonner';

interface Organization {
  id: string;
  name: string;
}

interface EditEventFormProps {
  eventId: string;
  eventSlug: string;
  organization: Organization;
  defaultValues: Record<string, unknown>;
}

export function EditEventForm({ eventId, eventSlug, organization, defaultValues }: EditEventFormProps) {
  const router = useRouter();
  const api = useApi();
  
  const handleSubmit = async (data: Record<string, unknown>) => {
    // Format dates to ISO strings, only include changed fields
    const formattedData: Record<string, unknown> = {};
    
    if (data.name !== defaultValues.name) formattedData.name = data.name;
    if (data.description !== defaultValues.description) formattedData.description = data.description;
    if (data.websiteUrl !== defaultValues.websiteUrl) formattedData.websiteUrl = data.websiteUrl;
    if (data.location !== defaultValues.location) formattedData.location = data.location;
    if (data.isVirtual !== defaultValues.isVirtual) formattedData.isVirtual = data.isVirtual;
    if (data.timezone !== defaultValues.timezone) formattedData.timezone = data.timezone;
    if (data.cfpDescription !== defaultValues.cfpDescription) formattedData.cfpDescription = data.cfpDescription;
    if (data.isPublished !== defaultValues.isPublished) formattedData.isPublished = data.isPublished;
    
    // Handle dates
    if (data.startDate !== defaultValues.startDate) {
      formattedData.startDate = data.startDate ? new Date(data.startDate as string).toISOString() : null;
    }
    if (data.endDate !== defaultValues.endDate) {
      formattedData.endDate = data.endDate ? new Date(data.endDate as string).toISOString() : null;
    }
    if (data.cfpOpensAt !== defaultValues.cfpOpensAt) {
      formattedData.cfpOpensAt = data.cfpOpensAt ? new Date(data.cfpOpensAt as string).toISOString() : null;
    }
    if (data.cfpClosesAt !== defaultValues.cfpClosesAt) {
      formattedData.cfpClosesAt = data.cfpClosesAt ? new Date(data.cfpClosesAt as string).toISOString() : null;
    }
    
    // Skip if nothing changed
    if (Object.keys(formattedData).length === 0) {
      toast.info('No changes to save');
      return;
    }
    
    const { error } = await api.patch(`/api/events/${eventId}`, formattedData);
    
    if (error) {
      return;
    }
    
    toast.success('Event updated successfully!');
    router.push(`/events/${eventSlug}`);
    router.refresh();
  };
  
  return (
    <EventForm
      organizations={[organization]}
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      isLoading={api.isLoading}
      isEdit
    />
  );
}
