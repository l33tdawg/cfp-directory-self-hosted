/**
 * Public Events List Component
 * 
 * Displays events in a card grid for the public landing page.
 */

import Link from 'next/link';
import { Calendar, MapPin, Clock, ArrowRight, Globe } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Event {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  location: string | null;
  isVirtual?: boolean;
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
  if (!start) return 'Date TBD';
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

// Strip HTML tags and decode entities for plain text display
function stripHtml(html: string | null): string {
  if (!html) return '';
  // Remove HTML tags
  let text = html.replace(/<[^>]*>/g, ' ');
  // Decode common HTML entities
  text = text.replace(/&nbsp;/g, ' ')
             .replace(/&amp;/g, '&')
             .replace(/&lt;/g, '<')
             .replace(/&gt;/g, '>')
             .replace(/&quot;/g, '"')
             .replace(/&#39;/g, "'");
  // Collapse multiple spaces
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

export function PublicEventsList({ events, showCfpStatus, isPast }: PublicEventsListProps) {
  if (events.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {events.map((event) => {
        const daysUntilCfpClose = event.cfpClosesAt ? getDaysUntil(event.cfpClosesAt) : null;
        const cfpOpen = event.cfpOpensAt && event.cfpClosesAt && 
          new Date() >= new Date(event.cfpOpensAt) && 
          new Date() <= new Date(event.cfpClosesAt);
        const isClosingSoon = daysUntilCfpClose !== null && daysUntilCfpClose <= 7;
        const plainDescription = stripHtml(event.description);

        return (
          <Link key={event.id} href={`/e/${event.slug}`} className="block group">
            <Card className={`h-full overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-0 shadow-md ${isPast ? 'opacity-70' : ''}`}>
              {/* Status Bar */}
              <div className={`h-1.5 ${
                cfpOpen 
                  ? isClosingSoon 
                    ? 'bg-gradient-to-r from-orange-500 to-red-500' 
                    : 'bg-gradient-to-r from-green-500 to-emerald-500'
                  : isPast 
                    ? 'bg-gradient-to-r from-slate-400 to-slate-500'
                    : 'bg-gradient-to-r from-blue-500 to-indigo-500'
              }`} />

              <CardContent className="p-6">
                <div className="flex gap-4">
                  {/* Event Icon */}
                  <div className={`flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center ${
                    cfpOpen 
                      ? 'bg-gradient-to-br from-green-500 to-emerald-500' 
                      : isPast 
                        ? 'bg-gradient-to-br from-slate-400 to-slate-500'
                        : 'bg-gradient-to-br from-blue-500 to-indigo-500'
                  }`}>
                    <Calendar className="h-7 w-7 text-white" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Badges */}
                    <div className="flex flex-wrap gap-2 mb-2">
                      {showCfpStatus && cfpOpen && (
                        <Badge className={`text-xs ${
                          isClosingSoon 
                            ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' 
                            : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        } border-0`}>
                          {daysUntilCfpClose !== null && daysUntilCfpClose <= 0 
                            ? '🔥 Last day!' 
                            : daysUntilCfpClose !== null && daysUntilCfpClose <= 7
                              ? `⏰ ${daysUntilCfpClose}d left`
                              : '✅ CFP Open'}
                        </Badge>
                      )}
                      {event.isVirtual && (
                        <Badge variant="secondary" className="text-xs">
                          <Globe className="h-3 w-3 mr-1" />
                          Virtual
                        </Badge>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="font-semibold text-lg text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 mb-2">
                      {event.name}
                    </h3>

                    {/* Description */}
                    {plainDescription && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-3">
                        {plainDescription}
                      </p>
                    )}

                    {/* Meta Info */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDateRange(event.startDate, event.endDate)}</span>
                      </div>
                      {(event.location || event.isVirtual) && (
                        <div className="flex items-center gap-1.5">
                          {event.isVirtual ? (
                            <Globe className="h-4 w-4" />
                          ) : (
                            <MapPin className="h-4 w-4" />
                          )}
                          <span className="truncate max-w-[150px]">
                            {event.isVirtual ? 'Online' : event.location}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* CFP Deadline */}
                    {showCfpStatus && cfpOpen && event.cfpClosesAt && (
                      <div className={`mt-3 inline-flex items-center gap-1.5 text-sm font-medium px-2.5 py-1 rounded-md ${
                        isClosingSoon 
                          ? 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400'
                          : 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                      }`}>
                        <Clock className="h-3.5 w-3.5" />
                        <span>CFP closes {formatDate(event.cfpClosesAt)}</span>
                      </div>
                    )}
                  </div>

                  {/* Arrow */}
                  <div className="flex-shrink-0 self-center">
                    <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
