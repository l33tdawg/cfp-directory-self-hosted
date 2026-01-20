/**
 * Public Events List Component
 * 
 * Displays events in a card grid for the public landing page.
 */

import Link from 'next/link';
import { Calendar, MapPin, Clock, Users, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Event {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  location: string | null;
  startDate: Date | null;
  endDate: Date | null;
  cfpOpensAt: Date | null;
  cfpClosesAt: Date | null;
  _count: {
    submissions: number;
  };
}

interface PublicEventsListProps {
  events: Event[];
  showCfpStatus?: boolean;
  isPast?: boolean;
}

function formatDate(date: Date | null): string {
  if (!date) return '';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));
}

function formatDateRange(start: Date | null, end: Date | null): string {
  if (!start) return '';
  if (!end || start.getTime() === end.getTime()) {
    return formatDate(start);
  }
  const startDate = new Date(start);
  const endDate = new Date(end);
  
  if (startDate.getFullYear() === endDate.getFullYear() && 
      startDate.getMonth() === endDate.getMonth()) {
    return `${new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(startDate)}-${endDate.getDate()}, ${endDate.getFullYear()}`;
  }
  
  return `${formatDate(start)} - ${formatDate(end)}`;
}

function getDaysUntil(date: Date): number {
  const now = new Date();
  const diff = new Date(date).getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function PublicEventsList({ events, showCfpStatus, isPast }: PublicEventsListProps) {
  if (events.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {events.map((event) => {
        const daysUntilCfpClose = event.cfpClosesAt ? getDaysUntil(event.cfpClosesAt) : null;
        const cfpOpen = event.cfpOpensAt && event.cfpClosesAt && 
          new Date() >= new Date(event.cfpOpensAt) && 
          new Date() <= new Date(event.cfpClosesAt);

        return (
          <Link key={event.id} href={`/events/${event.slug}`}>
            <Card className={`h-full hover:shadow-lg transition-shadow cursor-pointer overflow-hidden ${isPast ? 'opacity-75' : ''}`}>
              {/* Banner placeholder */}
              <div className="aspect-[3/1] bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <Calendar className="h-10 w-10 text-white/50" />
              </div>

              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg line-clamp-2">{event.name}</CardTitle>
                  {showCfpStatus && cfpOpen && daysUntilCfpClose !== null && (
                    <Badge 
                      variant={daysUntilCfpClose <= 7 ? 'destructive' : 'default'}
                      className="shrink-0"
                    >
                      {daysUntilCfpClose <= 0 
                        ? 'Last day!' 
                        : `${daysUntilCfpClose}d left`}
                    </Badge>
                  )}
                </div>
                {event.description && (
                  <CardDescription className="line-clamp-2">
                    {event.description}
                  </CardDescription>
                )}
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Event Date */}
                {event.startDate && (
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDateRange(event.startDate, event.endDate)}</span>
                  </div>
                )}

                {/* Location */}
                {event.location && (
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <MapPin className="h-4 w-4" />
                    <span className="truncate">{event.location}</span>
                  </div>
                )}

                {/* CFP Deadline */}
                {showCfpStatus && cfpOpen && event.cfpClosesAt && (
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <Clock className="h-4 w-4" />
                    <span>CFP closes {formatDate(event.cfpClosesAt)}</span>
                  </div>
                )}

                {/* Submission Count */}
                {event._count.submissions > 0 && (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Users className="h-4 w-4" />
                    <span>{event._count.submissions} submission{event._count.submissions !== 1 ? 's' : ''}</span>
                  </div>
                )}

                {/* CTA */}
                <div className="pt-2">
                  <Button variant="outline" className="w-full" asChild>
                    <span>
                      {cfpOpen ? 'Submit a Talk' : 'View Event'}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
