'use client';

/**
 * Enhanced Event Card Component
 * 
 * Display card for events matching cfp.directory's design.
 * Features gradient status bar, hover effects, and rich metadata.
 */

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  MapPin, 
  Globe, 
  FileText, 
  CalendarClock,
  Send,
  ChevronRight
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';

interface EventCardProps {
  event: {
    id: string;
    slug: string;
    name: string;
    description?: string | null;
    location?: string | null;
    isVirtual: boolean;
    startDate?: Date | string | null;
    endDate?: Date | string | null;
    cfpOpensAt?: Date | string | null;
    cfpClosesAt?: Date | string | null;
    isPublished: boolean;
    _count?: {
      submissions: number;
      tracks?: number;
      formats?: number;
    };
  };
  showSubmitButton?: boolean;
  variant?: 'default' | 'compact';
}

export function EventCard({ event, showSubmitButton = false, variant = 'default' }: EventCardProps) {
  const now = new Date();
  const cfpOpensAt = event.cfpOpensAt ? new Date(event.cfpOpensAt) : null;
  const cfpClosesAt = event.cfpClosesAt ? new Date(event.cfpClosesAt) : null;
  const startDate = event.startDate ? new Date(event.startDate) : null;
  const endDate = event.endDate ? new Date(event.endDate) : null;
  
  const isCfpOpen = cfpOpensAt && cfpClosesAt && now >= cfpOpensAt && now <= cfpClosesAt;
  const isCfpUpcoming = cfpOpensAt && now < cfpOpensAt;
  const isCfpClosed = cfpClosesAt && now > cfpClosesAt;
  
  // Calculate days until CFP closes
  const daysUntilClose = cfpClosesAt && isCfpOpen ? differenceInDays(cfpClosesAt, now) : null;
  const isClosingSoon = daysUntilClose !== null && daysUntilClose <= 7;

  // Format date range
  const formatDateRange = () => {
    if (!startDate) return 'Date TBD';
    if (!endDate || startDate.toDateString() === endDate.toDateString()) {
      return format(startDate, 'MMM d, yyyy');
    }
    if (startDate.getMonth() === endDate.getMonth() && startDate.getFullYear() === endDate.getFullYear()) {
      return `${format(startDate, 'MMM d')} - ${format(endDate, 'd, yyyy')}`;
    }
    return `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`;
  };

  if (variant === 'compact') {
    return (
      <Link href={`/events/${event.slug}`} className="block">
        <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
          <div className="flex items-center gap-4 min-w-0">
            <div className={cn(
              "p-2.5 rounded-lg flex-shrink-0",
              isCfpOpen ? "bg-green-100 dark:bg-green-900/30" :
              isCfpUpcoming ? "bg-blue-100 dark:bg-blue-900/30" :
              "bg-slate-100 dark:bg-slate-800"
            )}>
              <Calendar className={cn(
                "h-5 w-5",
                isCfpOpen ? "text-green-600 dark:text-green-400" :
                isCfpUpcoming ? "text-blue-600 dark:text-blue-400" :
                "text-slate-500"
              )} />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-slate-900 dark:text-white truncate">
                {event.name}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {formatDateRange()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isCfpOpen && (
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-0">
                CFP Open
              </Badge>
            )}
            <ChevronRight className="h-5 w-5 text-slate-400" />
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link href={`/events/${event.slug}`} className="block h-full">
      <Card className="h-full hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-0 overflow-hidden group">
        {/* Status gradient bar */}
        <div className={cn(
          "h-1.5",
          isCfpOpen ? "bg-gradient-to-r from-green-500 to-emerald-500" :
          isCfpUpcoming ? "bg-gradient-to-r from-blue-500 to-indigo-500" :
          !event.isPublished ? "bg-gradient-to-r from-amber-500 to-orange-500" :
          "bg-gradient-to-r from-slate-400 to-slate-500"
        )} />
        
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            {/* Event icon */}
            <div className={cn(
              "p-3 rounded-lg flex-shrink-0",
              isCfpOpen ? "bg-gradient-to-br from-green-500 to-emerald-500" :
              isCfpUpcoming ? "bg-gradient-to-br from-blue-500 to-indigo-500" :
              "bg-gradient-to-br from-slate-500 to-slate-600"
            )}>
              <Calendar className="h-5 w-5 text-white" />
            </div>
            
            {/* Status badges */}
            <div className="flex flex-wrap gap-1.5 justify-end">
              {!event.isPublished && (
                <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800">
                  Draft
                </Badge>
              )}
              {isCfpOpen && (
                <Badge className="text-xs bg-green-100 text-green-800 border-0 dark:bg-green-900/30 dark:text-green-400">
                  CFP Open
                </Badge>
              )}
              {isCfpUpcoming && (
                <Badge className="text-xs bg-blue-100 text-blue-800 border-0 dark:bg-blue-900/30 dark:text-blue-400">
                  CFP Soon
                </Badge>
              )}
              {isCfpClosed && event.isPublished && (
                <Badge variant="secondary" className="text-xs">
                  CFP Closed
                </Badge>
              )}
            </div>
          </div>
          
          <CardTitle className="text-lg group-hover:text-primary transition-colors line-clamp-2 mt-3">
            {event.name}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Description */}
          {event.description && (
            <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
              {event.description}
            </p>
          )}
          
          {/* Event metadata */}
          <div className="space-y-2">
            {/* Date */}
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <Calendar className="h-4 w-4 flex-shrink-0" />
              <span>{formatDateRange()}</span>
            </div>
            
            {/* Location */}
            {(event.location || event.isVirtual) && (
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                {event.isVirtual ? (
                  <>
                    <Globe className="h-4 w-4 flex-shrink-0" />
                    <span>Virtual Event</span>
                  </>
                ) : (
                  <>
                    <MapPin className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{event.location}</span>
                  </>
                )}
              </div>
            )}
          </div>
          
          {/* CFP Deadline */}
          {cfpClosesAt && (isCfpOpen || isCfpUpcoming) && (
            <div className={cn(
              "flex items-center gap-2 text-sm font-medium p-2 rounded-md",
              isClosingSoon 
                ? "bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400"
                : isCfpOpen 
                  ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                  : "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
            )}>
              <CalendarClock className="h-4 w-4 flex-shrink-0" />
              <span>
                {isCfpUpcoming ? 'Opens' : 'Closes'} {format(isCfpUpcoming ? cfpOpensAt! : cfpClosesAt, 'MMM d')}
                {isClosingSoon && daysUntilClose !== null && (
                  <span className="ml-1">
                    ({daysUntilClose === 0 ? 'Today!' : `${daysUntilClose} day${daysUntilClose === 1 ? '' : 's'} left`})
                  </span>
                )}
              </span>
            </div>
          )}
          
          {/* Stats footer */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
              {event._count && (
                <div className="flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" />
                  <span>{event._count.submissions} submissions</span>
                </div>
              )}
            </div>
            
            {showSubmitButton && isCfpOpen && (
              <Button size="sm" variant="ghost" className="text-xs h-7">
                <Send className="h-3 w-3 mr-1" />
                Submit
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

/**
 * Event Card Skeleton for loading states
 */
export function EventCardSkeleton() {
  return (
    <Card className="h-full border-0 overflow-hidden">
      <div className="h-1.5 bg-slate-200 dark:bg-slate-700 animate-pulse" />
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="p-3 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse">
            <div className="h-5 w-5" />
          </div>
          <div className="h-5 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
        </div>
        <div className="h-6 w-3/4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mt-3" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          <div className="h-4 w-2/3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
        </div>
        <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
        <div className="h-4 w-1/3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
      </CardContent>
    </Card>
  );
}
