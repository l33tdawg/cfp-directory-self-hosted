/**
 * Events List Page
 * 
 * Lists all events (organizers see all, users see published only).
 */

import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth';
import { EventCard } from '@/components/events/event-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { Plus, Search } from 'lucide-react';

export const metadata = {
  title: 'Events',
};

interface EventsPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function EventsPage({ searchParams }: EventsPageProps) {
  const user = await getCurrentUser();
  const { q: searchQuery } = await searchParams;
  
  const isOrganizer = ['ADMIN', 'ORGANIZER'].includes(user.role);
  
  // Build query
  const where = {
    // Non-organizers only see published events
    ...(isOrganizer ? {} : { isPublished: true }),
    // Search filter
    ...(searchQuery ? {
      OR: [
        { name: { contains: searchQuery, mode: 'insensitive' as const } },
        { description: { contains: searchQuery, mode: 'insensitive' as const } },
        { location: { contains: searchQuery, mode: 'insensitive' as const } },
      ],
    } : {}),
  };
  
  const events = await prisma.event.findMany({
    where,
    include: {
      _count: {
        select: {
          submissions: true,
          tracks: true,
          formats: true,
        },
      },
    },
    orderBy: [
      { startDate: 'desc' },
      { createdAt: 'desc' },
    ],
  });
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Events
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            {isOrganizer ? 'Manage your events and CFPs' : 'Browse events with open CFPs'}
          </p>
        </div>
        
        {isOrganizer && (
          <Button asChild>
            <Link href="/events/new">
              <Plus className="mr-2 h-4 w-4" />
              New Event
            </Link>
          </Button>
        )}
      </div>
      
      {/* Search */}
      <form className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            name="q"
            placeholder="Search events..."
            defaultValue={searchQuery}
            className="pl-10"
          />
        </div>
      </form>
      
      {/* Events Grid */}
      {events.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <EventCard key={event.id} event={event} showOrganization={false} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <Search className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
            {searchQuery ? 'No events found' : 'No events yet'}
          </h3>
          <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
            {searchQuery
              ? 'Try adjusting your search terms'
              : isOrganizer
              ? 'Create your first event to start accepting submissions'
              : 'Check back later for upcoming events'}
          </p>
          {!searchQuery && isOrganizer && (
            <Button asChild>
              <Link href="/events/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Event
              </Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
