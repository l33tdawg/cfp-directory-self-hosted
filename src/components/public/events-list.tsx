/**
 * Modern Public Events List Component
 * 
 * Glassmorphism event cards with gradient accents for dark theme.
 */

import Link from 'next/link';
import { Calendar, MapPin, Clock, ArrowRight, Globe, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Event {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  location: string | null;
  isVirtual?: boolean;
  venueCity?: string | null;
  country?: string | null;
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
  let text = html.replace(/<[^>]*>/g, ' ');
  text = text.replace(/&nbsp;/g, ' ')
             .replace(/&amp;/g, '&')
             .replace(/&lt;/g, '<')
             .replace(/&gt;/g, '>')
             .replace(/&quot;/g, '"')
             .replace(/&#39;/g, "'");
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

// Gradient colors for variety - with light/dark mode support
const cardGradients = [
  { bg: 'from-violet-500/10 to-fuchsia-500/10', border: 'group-hover:border-violet-500/30', glow: 'from-violet-500/30 to-fuchsia-500/30', accent: 'violet' },
  { bg: 'from-cyan-500/10 to-blue-500/10', border: 'group-hover:border-cyan-500/30', glow: 'from-cyan-500/30 to-blue-500/30', accent: 'cyan' },
  { bg: 'from-emerald-500/10 to-teal-500/10', border: 'group-hover:border-emerald-500/30', glow: 'from-emerald-500/30 to-teal-500/30', accent: 'emerald' },
  { bg: 'from-orange-500/10 to-rose-500/10', border: 'group-hover:border-orange-500/30', glow: 'from-orange-500/30 to-rose-500/30', accent: 'orange' },
];

export function PublicEventsList({ events, showCfpStatus, isPast }: PublicEventsListProps) {
  if (events.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {events.map((event, index) => {
        const daysUntilCfpClose = event.cfpClosesAt ? getDaysUntil(event.cfpClosesAt) : null;
        const cfpOpen = event.cfpOpensAt && event.cfpClosesAt && 
          new Date() >= new Date(event.cfpOpensAt) && 
          new Date() <= new Date(event.cfpClosesAt);
        const isClosingSoon = daysUntilCfpClose !== null && daysUntilCfpClose <= 7;
        const plainDescription = stripHtml(event.description);
        const gradient = cardGradients[index % cardGradients.length];
        const locationText = event.isVirtual 
          ? 'Virtual Event' 
          : event.venueCity 
            ? `${event.venueCity}${event.country ? `, ${event.country}` : ''}`
            : event.location;

        return (
          <Link key={event.id} href={`/e/${event.slug}`} className="group block">
            {/* Card with glow effect */}
            <div className="relative h-full">
              {/* Glow on hover - only visible in dark mode */}
              <div className={`absolute -inset-0.5 bg-gradient-to-r ${gradient.glow} rounded-2xl blur opacity-0 dark:group-hover:opacity-100 transition-all duration-500`} />
              
              {/* Card - light/dark mode support */}
              <div className={`relative h-full p-6 rounded-2xl bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 ${gradient.border} transition-all duration-300 group-hover:bg-white dark:group-hover:bg-slate-900/80 group-hover:shadow-lg dark:group-hover:shadow-none ${isPast ? 'opacity-60' : ''}`}>
                <div className="flex gap-5">
                  {/* Event Icon */}
                  <div className={`flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br ${gradient.bg} border border-slate-200 dark:border-white/10 flex items-center justify-center group-hover:scale-105 transition-transform duration-300`}>
                    <Calendar className="h-6 w-6 text-slate-600 dark:text-white/70" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Badges */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {showCfpStatus && cfpOpen && (
                        <Badge className={`text-xs border-0 ${
                          isClosingSoon 
                            ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400' 
                            : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                        }`}>
                          <Sparkles className="h-3 w-3 mr-1" />
                          {daysUntilCfpClose !== null && daysUntilCfpClose <= 0 
                            ? 'Last day!' 
                            : daysUntilCfpClose !== null && daysUntilCfpClose <= 7
                              ? `${daysUntilCfpClose}d left`
                              : 'CFP Open'}
                        </Badge>
                      )}
                      {event.isVirtual && (
                        <Badge className="text-xs bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-white/50 border border-slate-200 dark:border-white/10">
                          <Globe className="h-3 w-3 mr-1" />
                          Virtual
                        </Badge>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="font-semibold text-lg text-slate-900 dark:text-white group-hover:text-slate-700 dark:group-hover:text-white/90 transition-colors line-clamp-2 mb-2">
                      {event.name}
                    </h3>

                    {/* Description */}
                    {plainDescription && (
                      <p className="text-sm text-slate-500 dark:text-white/40 line-clamp-2 mb-4">
                        {plainDescription}
                      </p>
                    )}

                    {/* Meta Info */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500 dark:text-white/40">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDateRange(event.startDate, event.endDate)}</span>
                      </div>
                      {locationText && (
                        <div className="flex items-center gap-1.5">
                          {event.isVirtual ? (
                            <Globe className="h-4 w-4" />
                          ) : (
                            <MapPin className="h-4 w-4" />
                          )}
                          <span className="truncate max-w-[180px]">{locationText}</span>
                        </div>
                      )}
                    </div>

                    {/* CFP Deadline */}
                    {showCfpStatus && cfpOpen && event.cfpClosesAt && (
                      <div className={`mt-4 inline-flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg ${
                        isClosingSoon 
                          ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20'
                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      }`}>
                        <Clock className="h-3.5 w-3.5" />
                        <span>Closes {formatDate(event.cfpClosesAt)}</span>
                      </div>
                    )}
                  </div>

                  {/* Arrow */}
                  <div className="flex-shrink-0 self-center">
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center group-hover:bg-slate-200 dark:group-hover:bg-white/10 transition-all">
                      <ArrowRight className="h-5 w-5 text-slate-400 dark:text-white/30 group-hover:text-slate-600 dark:group-hover:text-white/60 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
