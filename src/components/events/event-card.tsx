/**
 * Event Card Component
 * 
 * Display card for events in lists.
 */

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Globe, FileText, Users } from 'lucide-react';
import { format } from 'date-fns';

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
    organization?: {
      id: string;
      name: string;
      slug: string;
      logoUrl?: string | null;
    };
    _count?: {
      submissions: number;
      tracks?: number;
      formats?: number;
    };
  };
  showOrganization?: boolean;
}

export function EventCard({ event, showOrganization = true }: EventCardProps) {
  const now = new Date();
  const cfpOpensAt = event.cfpOpensAt ? new Date(event.cfpOpensAt) : null;
  const cfpClosesAt = event.cfpClosesAt ? new Date(event.cfpClosesAt) : null;
  const startDate = event.startDate ? new Date(event.startDate) : null;
  
  const isCfpOpen = cfpOpensAt && cfpClosesAt && now >= cfpOpensAt && now <= cfpClosesAt;
  const isCfpUpcoming = cfpOpensAt && now < cfpOpensAt;
  const isCfpClosed = cfpClosesAt && now > cfpClosesAt;
  
  return (
    <Link href={`/events/${event.slug}`}>
      <Card className="hover:shadow-md transition-shadow h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg line-clamp-1">{event.name}</CardTitle>
              {showOrganization && event.organization && (
                <CardDescription className="text-sm">
                  by {event.organization.name}
                </CardDescription>
              )}
            </div>
            <div className="flex gap-1">
              {!event.isPublished && (
                <Badge variant="outline" className="text-xs">
                  Draft
                </Badge>
              )}
              {isCfpOpen && (
                <Badge className="bg-green-500 text-xs">
                  CFP Open
                </Badge>
              )}
              {isCfpUpcoming && (
                <Badge variant="secondary" className="text-xs">
                  CFP Soon
                </Badge>
              )}
              {isCfpClosed && (
                <Badge variant="outline" className="text-xs">
                  CFP Closed
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {event.description && (
            <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
              {event.description}
            </p>
          )}
          
          <div className="flex flex-wrap gap-3 text-sm text-slate-500 dark:text-slate-400">
            {startDate && (
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{format(startDate, 'MMM d, yyyy')}</span>
              </div>
            )}
            
            {event.location && (
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                <span className="line-clamp-1">{event.location}</span>
              </div>
            )}
            
            {event.isVirtual && (
              <div className="flex items-center gap-1">
                <Globe className="h-4 w-4" />
                <span>Virtual</span>
              </div>
            )}
          </div>
          
          {event._count && (
            <div className="flex gap-4 pt-2 text-sm text-slate-500 dark:text-slate-400 border-t">
              <div className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                <span>{event._count.submissions} submissions</span>
              </div>
            </div>
          )}
          
          {cfpClosesAt && isCfpOpen && (
            <div className="pt-2 text-sm text-orange-600 dark:text-orange-400">
              CFP closes {format(cfpClosesAt, 'MMM d, yyyy')}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
