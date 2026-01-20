/**
 * Events List Page
 * 
 * Lists all events with filtering and search.
 * Organizers see all events, users see published only.
 */

import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth';
import { EventCard, EventCardSkeleton } from '@/components/events/event-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { Plus, Search, Calendar, Filter, LayoutGrid, List } from 'lucide-react';
import { Suspense } from 'react';

export const metadata = {
  title: 'Events',
};

type FilterType = 'all' | 'open' | 'upcoming' | 'closed' | 'draft';

interface EventsPageProps {
  searchParams: Promise<{ 
    q?: string;
    filter?: FilterType;
    view?: 'grid' | 'list';
  }>;
}

export default async function EventsPage({ searchParams }: EventsPageProps) {
  const user = await getCurrentUser();
  const params = await searchParams;
  const searchQuery = params.q || '';
  const filter = (params.filter as FilterType) || 'all';
  const view = params.view || 'grid';
  
  const isOrganizer = ['ADMIN', 'ORGANIZER'].includes(user.role);
  const now = new Date();
  
  // Build query based on filter
  const buildWhereClause = () => {
    const baseWhere: any = {
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

    switch (filter) {
      case 'open':
        return {
          ...baseWhere,
          isPublished: true,
          cfpOpensAt: { lte: now },
          cfpClosesAt: { gte: now },
        };
      case 'upcoming':
        return {
          ...baseWhere,
          isPublished: true,
          cfpOpensAt: { gt: now },
        };
      case 'closed':
        return {
          ...baseWhere,
          isPublished: true,
          cfpClosesAt: { lt: now },
        };
      case 'draft':
        if (isOrganizer) {
          return {
            ...baseWhere,
            isPublished: false,
          };
        }
        return baseWhere;
      default:
        return baseWhere;
    }
  };
  
  const events = await prisma.event.findMany({
    where: buildWhereClause(),
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
      { cfpClosesAt: 'asc' },
      { startDate: 'asc' },
      { createdAt: 'desc' },
    ],
  });

  // Get counts for filter tabs
  const [openCount, upcomingCount, draftCount] = await Promise.all([
    prisma.event.count({
      where: {
        isPublished: true,
        cfpOpensAt: { lte: now },
        cfpClosesAt: { gte: now },
      },
    }),
    prisma.event.count({
      where: {
        isPublished: true,
        cfpOpensAt: { gt: now },
      },
    }),
    isOrganizer ? prisma.event.count({ where: { isPublished: false } }) : Promise.resolve(0),
  ]);

  const buildFilterUrl = (newFilter: FilterType) => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (newFilter !== 'all') params.set('filter', newFilter);
    if (view !== 'grid') params.set('view', view);
    const queryString = params.toString();
    return queryString ? `/events?${queryString}` : '/events';
  };
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Events
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            {isOrganizer ? 'Manage your events and CFPs' : 'Discover events with open calls for papers'}
          </p>
        </div>
        
        {isOrganizer && (
          <Button asChild size="lg" className="gap-2">
            <Link href="/events/new">
              <Plus className="h-5 w-5" />
              Create Event
            </Link>
          </Button>
        )}
      </div>
      
      {/* Filters and Search */}
      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        {/* Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0">
          <Link href={buildFilterUrl('all')}>
            <Badge 
              variant={filter === 'all' ? 'default' : 'outline'} 
              className="cursor-pointer px-3 py-1.5 text-sm hover:bg-primary/10"
            >
              All Events
            </Badge>
          </Link>
          <Link href={buildFilterUrl('open')}>
            <Badge 
              variant={filter === 'open' ? 'default' : 'outline'}
              className="cursor-pointer px-3 py-1.5 text-sm hover:bg-green-100 dark:hover:bg-green-900/30"
            >
              <span className="w-2 h-2 rounded-full bg-green-500 mr-2" />
              CFP Open ({openCount})
            </Badge>
          </Link>
          <Link href={buildFilterUrl('upcoming')}>
            <Badge 
              variant={filter === 'upcoming' ? 'default' : 'outline'}
              className="cursor-pointer px-3 py-1.5 text-sm hover:bg-blue-100 dark:hover:bg-blue-900/30"
            >
              <span className="w-2 h-2 rounded-full bg-blue-500 mr-2" />
              Coming Soon ({upcomingCount})
            </Badge>
          </Link>
          <Link href={buildFilterUrl('closed')}>
            <Badge 
              variant={filter === 'closed' ? 'default' : 'outline'}
              className="cursor-pointer px-3 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              CFP Closed
            </Badge>
          </Link>
          {isOrganizer && draftCount > 0 && (
            <Link href={buildFilterUrl('draft')}>
              <Badge 
                variant={filter === 'draft' ? 'default' : 'outline'}
                className="cursor-pointer px-3 py-1.5 text-sm hover:bg-amber-100 dark:hover:bg-amber-900/30"
              >
                <span className="w-2 h-2 rounded-full bg-amber-500 mr-2" />
                Drafts ({draftCount})
              </Badge>
            </Link>
          )}
        </div>
        
        {/* Search */}
        <div className="flex-1 lg:max-w-md lg:ml-auto">
          <form>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                name="q"
                placeholder="Search events..."
                defaultValue={searchQuery}
                className="pl-10"
              />
              {filter !== 'all' && (
                <input type="hidden" name="filter" value={filter} />
              )}
            </div>
          </form>
        </div>
      </div>
      
      {/* Results count */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {events.length} event{events.length !== 1 ? 's' : ''} found
          {searchQuery && ` for "${searchQuery}"`}
          {filter !== 'all' && ` (${filter})`}
        </p>
      </div>
      
      {/* Events Grid/List */}
      {events.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <EventCard 
              key={event.id} 
              event={event} 
              showSubmitButton={!isOrganizer}
            />
          ))}
        </div>
      ) : (
        <EmptyState 
          searchQuery={searchQuery} 
          filter={filter} 
          isOrganizer={isOrganizer} 
        />
      )}
    </div>
  );
}

function EmptyState({ 
  searchQuery, 
  filter, 
  isOrganizer 
}: { 
  searchQuery: string; 
  filter: FilterType; 
  isOrganizer: boolean;
}) {
  const getMessage = () => {
    if (searchQuery) {
      return {
        title: 'No events found',
        description: 'Try adjusting your search terms or filters',
      };
    }
    
    switch (filter) {
      case 'open':
        return {
          title: 'No open CFPs',
          description: 'There are no events with open calls for papers right now. Check back later!',
        };
      case 'upcoming':
        return {
          title: 'No upcoming CFPs',
          description: 'There are no events with upcoming calls for papers scheduled.',
        };
      case 'draft':
        return {
          title: 'No draft events',
          description: 'All your events are published! Create a new event to get started.',
        };
      default:
        return {
          title: 'No events yet',
          description: isOrganizer 
            ? 'Create your first event to start accepting submissions'
            : 'Check back later for upcoming events',
        };
    }
  };

  const { title, description } = getMessage();

  return (
    <div className="text-center py-16">
      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
        <Calendar className="h-10 w-10 text-slate-400" />
      </div>
      <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
        {title}
      </h3>
      <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md mx-auto">
        {description}
      </p>
      {isOrganizer && !searchQuery && filter !== 'open' && (
        <Button asChild size="lg">
          <Link href="/events/new">
            <Plus className="mr-2 h-5 w-5" />
            Create Event
          </Link>
        </Button>
      )}
    </div>
  );
}
