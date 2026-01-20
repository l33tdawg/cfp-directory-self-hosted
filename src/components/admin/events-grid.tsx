'use client';

/**
 * Events Grid
 * 
 * Grid display of events with filtering options.
 */

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EventStatsCard } from './event-stats-card';
import { Search, Filter, Plus, Calendar } from 'lucide-react';
import Link from 'next/link';
import { isPast, isFuture } from 'date-fns';

interface EventData {
  id: string;
  name: string;
  slug: string;
  isPublished: boolean;
  cfpOpensAt: Date | null;
  cfpClosesAt: Date | null;
  startDate: Date | null;
  _count: {
    submissions: number;
  };
  submissionStats?: {
    pending: number;
    accepted: number;
    rejected: number;
    underReview: number;
  };
  reviewStats?: {
    totalReviews: number;
    reviewedSubmissions: number;
  };
}

interface EventsGridProps {
  events: EventData[];
}

type FilterStatus = 'all' | 'cfp-open' | 'cfp-closed' | 'draft' | 'published';

export function EventsGrid({ events }: EventsGridProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  
  // Filter events
  const filteredEvents = events.filter(event => {
    // Search filter
    if (searchQuery && !event.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    // Status filter
    if (statusFilter !== 'all') {
      const _now = new Date(); // Used in date comparisons below
      const cfpOpen = event.cfpOpensAt && event.cfpClosesAt && 
        !isFuture(event.cfpOpensAt) && !isPast(event.cfpClosesAt);
      const cfpClosed = event.cfpClosesAt && isPast(event.cfpClosesAt);
      
      switch (statusFilter) {
        case 'cfp-open':
          if (!cfpOpen) return false;
          break;
        case 'cfp-closed':
          if (!cfpClosed) return false;
          break;
        case 'draft':
          if (event.isPublished) return false;
          break;
        case 'published':
          if (!event.isPublished) return false;
          break;
      }
    }
    
    return true;
  });
  
  // Calculate summary stats
  const cfpOpenCount = events.filter(e => {
    if (!e.cfpOpensAt || !e.cfpClosesAt) return false;
    return !isFuture(e.cfpOpensAt) && !isPast(e.cfpClosesAt);
  }).length;
  
  const totalSubmissions = events.reduce((sum, e) => sum + e._count.submissions, 0);
  
  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg bg-white dark:bg-slate-800 border">
          <p className="text-2xl font-bold">{events.length}</p>
          <p className="text-sm text-slate-500">Total Events</p>
        </div>
        <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <p className="text-2xl font-bold text-green-700 dark:text-green-400">{cfpOpenCount}</p>
          <p className="text-sm text-slate-500">CFPs Open</p>
        </div>
        <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{totalSubmissions}</p>
          <p className="text-sm text-slate-500">Total Submissions</p>
        </div>
        <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
          <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">
            {events.filter(e => e.isPublished).length}
          </p>
          <p className="text-sm text-slate-500">Published</p>
        </div>
      </div>
      
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as FilterStatus)}>
            <SelectTrigger className="w-[160px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              <SelectItem value="cfp-open">CFP Open</SelectItem>
              <SelectItem value="cfp-closed">CFP Closed</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>
          
          <Button asChild>
            <Link href="/events/new">
              <Plus className="h-4 w-4 mr-2" />
              New Event
            </Link>
          </Button>
        </div>
      </div>
      
      {/* Results Info */}
      <div className="text-sm text-slate-500">
        Showing {filteredEvents.length} of {events.length} events
        {statusFilter !== 'all' && ` (filtered)`}
        {searchQuery && ` matching "${searchQuery}"`}
      </div>
      
      {/* Events Grid */}
      {filteredEvents.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
          <p className="text-slate-500 dark:text-slate-400 mb-4">
            {events.length === 0 ? 'No events yet' : 'No events match your filters'}
          </p>
          {events.length === 0 ? (
            <Button asChild>
              <Link href="/events/new">
                <Plus className="h-4 w-4 mr-2" />
                Create First Event
              </Link>
            </Button>
          ) : (
            <Button variant="outline" onClick={() => {
              setSearchQuery('');
              setStatusFilter('all');
            }}>
              Clear Filters
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredEvents.map((event) => (
            <EventStatsCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
