'use client';

/**
 * Event Stats Card
 * 
 * Card showing event details with submission statistics.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';
import { 
  Calendar, 
  FileText, 
  Users, 
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ExternalLink,
  Settings
} from 'lucide-react';
import { format, formatDistanceToNow, isPast, isFuture } from 'date-fns';

interface EventStatsCardProps {
  event: {
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
  };
}

function getCfpStatus(event: EventStatsCardProps['event']): { 
  label: string; 
  color: string; 
  icon: typeof Clock 
} {
  const now = new Date();
  
  if (!event.cfpOpensAt || !event.cfpClosesAt) {
    return { label: 'CFP not set', color: 'bg-gray-100 text-gray-700', icon: AlertCircle };
  }
  
  if (isFuture(event.cfpOpensAt)) {
    return { label: 'Opens soon', color: 'bg-blue-100 text-blue-700', icon: Clock };
  }
  
  if (isPast(event.cfpClosesAt)) {
    return { label: 'CFP Closed', color: 'bg-gray-100 text-gray-700', icon: XCircle };
  }
  
  return { label: 'CFP Open', color: 'bg-green-100 text-green-700', icon: CheckCircle };
}

export function EventStatsCard({ event }: EventStatsCardProps) {
  const cfpStatus = getCfpStatus(event);
  const CfpIcon = cfpStatus.icon;
  
  const totalSubmissions = event._count.submissions;
  const stats = event.submissionStats || { pending: 0, accepted: 0, rejected: 0, underReview: 0 };
  const reviewStats = event.reviewStats || { totalReviews: 0, reviewedSubmissions: 0 };
  
  // Calculate review progress
  const reviewProgress = totalSubmissions > 0 
    ? Math.round((reviewStats.reviewedSubmissions / totalSubmissions) * 100) 
    : 0;
  
  return (
    <Card className="hover:shadow-lg transition-all duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <Link href={`/events/${event.slug}`}>
              <CardTitle className="text-lg hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                {event.name}
              </CardTitle>
            </Link>
            <div className="flex items-center gap-2">
              <Badge className={cfpStatus.color}>
                <CfpIcon className="h-3 w-3 mr-1" />
                {cfpStatus.label}
              </Badge>
              {!event.isPublished && (
                <Badge variant="outline">Draft</Badge>
              )}
            </div>
          </div>
          
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/events/${event.slug}/edit`}>
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* CFP Dates */}
        {event.cfpOpensAt && event.cfpClosesAt && (
          <div className="text-sm text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>
                {format(event.cfpOpensAt, 'MMM d')} - {format(event.cfpClosesAt, 'MMM d, yyyy')}
              </span>
            </div>
            {!isPast(event.cfpClosesAt) && (
              <p className="text-xs mt-1 ml-6">
                Closes {formatDistanceToNow(event.cfpClosesAt, { addSuffix: true })}
              </p>
            )}
          </div>
        )}
        
        {/* Submission Stats Grid */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
            <p className="text-lg font-bold text-slate-900 dark:text-white">{totalSubmissions}</p>
            <p className="text-xs text-slate-500">Total</p>
          </div>
          <div className="p-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
            <p className="text-lg font-bold text-yellow-700 dark:text-yellow-400">{stats.pending + stats.underReview}</p>
            <p className="text-xs text-slate-500">Pending</p>
          </div>
          <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
            <p className="text-lg font-bold text-green-700 dark:text-green-400">{stats.accepted}</p>
            <p className="text-xs text-slate-500">Accepted</p>
          </div>
          <div className="p-2 rounded-lg bg-red-50 dark:bg-red-900/20">
            <p className="text-lg font-bold text-red-700 dark:text-red-400">{stats.rejected}</p>
            <p className="text-xs text-slate-500">Rejected</p>
          </div>
        </div>
        
        {/* Review Progress */}
        {totalSubmissions > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">Review Progress</span>
              <span className="font-medium">{reviewProgress}%</span>
            </div>
            <Progress value={reviewProgress} className="h-2" />
            <p className="text-xs text-slate-500">
              {reviewStats.reviewedSubmissions} of {totalSubmissions} reviewed • {reviewStats.totalReviews} total reviews
            </p>
          </div>
        )}
        
        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" className="flex-1" asChild>
            <Link href={`/events/${event.slug}/submissions`}>
              <FileText className="h-4 w-4 mr-1" />
              Submissions
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/events/${event.slug}`}>
              <ExternalLink className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
