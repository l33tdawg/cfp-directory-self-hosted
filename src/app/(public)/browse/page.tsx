/**
 * Public Events Listing Page
 * 
 * Displays all published events with open CFPs.
 * Accessible without authentication.
 */

// Force dynamic rendering since this page requires database access
export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/db/prisma';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Calendar, MapPin, Globe, Clock, ArrowRight } from 'lucide-react';

// Helper to format dates
function formatDate(date: Date | null): string {
  if (!date) return 'TBD';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Helper to calculate days remaining
function getDaysRemaining(date: Date | null): number | null {
  if (!date) return null;
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// Check if CFP is open
function isCfpOpen(event: { cfpOpensAt: Date | null; cfpClosesAt: Date | null }): boolean {
  const now = new Date();
  if (!event.cfpOpensAt || !event.cfpClosesAt) return false;
  return now >= event.cfpOpensAt && now <= event.cfpClosesAt;
}

export default async function PublicEventsPage() {
  // Fetch all published events with CFPs
  const events = await prisma.event.findMany({
    where: {
      isPublished: true,
    },
    orderBy: [
      { cfpClosesAt: 'asc' }, // Soonest closing first
      { startDate: 'asc' },
    ],
    include: {
      _count: {
        select: {
          submissions: true,
        },
      },
    },
  });

  // Separate events by CFP status
  const openCfpEvents = events.filter(e => isCfpOpen(e));
  const upcomingCfpEvents = events.filter(e => {
    if (!e.cfpOpensAt) return false;
    return e.cfpOpensAt > new Date();
  });
  const closedCfpEvents = events.filter(e => {
    if (!e.cfpClosesAt) return false;
    return e.cfpClosesAt < new Date();
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold">Call for Papers</h1>
          <p className="text-muted-foreground mt-2">
            Browse open CFPs and submit your talks
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Open CFPs */}
        {openCfpEvents.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <h2 className="text-2xl font-semibold">Open CFPs</h2>
              <Badge variant="default" className="bg-green-500">
                {openCfpEvents.length} Open
              </Badge>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {openCfpEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </section>
        )}

        {/* Upcoming CFPs */}
        {upcomingCfpEvents.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <h2 className="text-2xl font-semibold">Upcoming CFPs</h2>
              <Badge variant="secondary">
                {upcomingCfpEvents.length} Coming Soon
              </Badge>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {upcomingCfpEvents.map((event) => (
                <EventCard key={event.id} event={event} isUpcoming />
              ))}
            </div>
          </section>
        )}

        {/* Recently Closed */}
        {closedCfpEvents.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-6">
              <h2 className="text-2xl font-semibold">Recently Closed</h2>
              <Badge variant="outline">Closed</Badge>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 opacity-75">
              {closedCfpEvents.slice(0, 6).map((event) => (
                <EventCard key={event.id} event={event} isClosed />
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {events.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Events Yet</h2>
            <p className="text-muted-foreground">
              Check back soon for upcoming events and CFPs.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

// Event Card Component
interface EventCardProps {
  event: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    location: string | null;
    isVirtual: boolean;
    startDate: Date | null;
    endDate: Date | null;
    cfpOpensAt: Date | null;
    cfpClosesAt: Date | null;
    _count: {
      submissions: number;
    };
  };
  isUpcoming?: boolean;
  isClosed?: boolean;
}

function EventCard({ event, isUpcoming = false, isClosed = false }: EventCardProps) {
  const daysRemaining = getDaysRemaining(event.cfpClosesAt);
  const isOpen = isCfpOpen(event);

  return (
    <Card className="flex flex-col h-full hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg line-clamp-2">{event.name}</CardTitle>
          {isOpen && daysRemaining !== null && daysRemaining <= 7 && (
            <Badge variant="destructive" className="shrink-0">
              {daysRemaining} days left
            </Badge>
          )}
          {isUpcoming && (
            <Badge variant="secondary" className="shrink-0">Coming Soon</Badge>
          )}
          {isClosed && (
            <Badge variant="outline" className="shrink-0">Closed</Badge>
          )}
        </div>
        <CardDescription className="line-clamp-2">
          {event.description || 'No description available'}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex-1">
        <div className="space-y-2 text-sm">
          {/* Location */}
          <div className="flex items-center gap-2 text-muted-foreground">
            {event.isVirtual ? (
              <>
                <Globe className="w-4 h-4" />
                <span>Virtual Event</span>
              </>
            ) : event.location ? (
              <>
                <MapPin className="w-4 h-4" />
                <span>{event.location}</span>
              </>
            ) : null}
          </div>

          {/* Event Dates */}
          {event.startDate && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>
                {formatDate(event.startDate)}
                {event.endDate && ` - ${formatDate(event.endDate)}`}
              </span>
            </div>
          )}

          {/* CFP Deadline */}
          {event.cfpClosesAt && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>
                {isClosed ? 'Closed' : isUpcoming ? `Opens ${formatDate(event.cfpOpensAt)}` : `Deadline: ${formatDate(event.cfpClosesAt)}`}
              </span>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter>
        {isOpen ? (
          <Button asChild className="w-full">
            <Link href={`/events/${event.slug}/submit`}>
              Submit a Talk
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        ) : (
          <Button variant="outline" asChild className="w-full">
            <Link href={`/events/${event.slug}`}>
              View Details
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
