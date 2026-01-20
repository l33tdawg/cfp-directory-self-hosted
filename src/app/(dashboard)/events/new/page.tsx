/**
 * Create Event Page
 * 
 * Form to create a new event.
 */

import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { CreateEventForm } from './create-event-form';

export const metadata = {
  title: 'Create Event',
};

export default async function CreateEventPage() {
  const user = await getCurrentUser();
  
  // Only organizers and admins can create events
  if (!['ADMIN', 'ORGANIZER'].includes(user.role)) {
    redirect('/events?error=unauthorized');
  }
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          Create Event
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Set up a new event and start accepting submissions
        </p>
      </div>
      
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
        <CreateEventForm />
      </div>
    </div>
  );
}
