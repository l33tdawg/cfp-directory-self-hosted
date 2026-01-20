/**
 * Create Event Page
 * 
 * Comprehensive form to create a new event with 6 tabs.
 */

import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { EventForm } from '@/components/forms/event-form';

export const metadata = {
  title: 'Create Event',
  description: 'Create a new event and start accepting submissions',
};

export default async function CreateEventPage() {
  const user = await getCurrentUser();
  
  // Only organizers and admins can create events
  if (!['ADMIN', 'ORGANIZER'].includes(user.role)) {
    redirect('/events?error=unauthorized');
  }
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          Create Event
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Set up a new event and configure your Call for Papers
        </p>
      </div>
      
      <EventForm mode="create" />
    </div>
  );
}
