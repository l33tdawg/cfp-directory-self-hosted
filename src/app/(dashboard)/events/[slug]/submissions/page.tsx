/**
 * Event Submissions Page
 * 
 * Lists all submissions for an event (for organizers/reviewers).
 */

import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth';
import { notFound, redirect } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Link from 'next/link';
import { FileText, Search, ChevronRight, User, Star } from 'lucide-react';
import { format } from 'date-fns';
import type { SubmissionStatus } from '@prisma/client';

interface EventSubmissionsPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ status?: string; trackId?: string; q?: string }>;
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  UNDER_REVIEW: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  ACCEPTED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  WAITLISTED: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  WITHDRAWN: 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200',
};

const statusLabels: Record<string, string> = {
  PENDING: 'Pending',
  UNDER_REVIEW: 'Under Review',
  ACCEPTED: 'Accepted',
  REJECTED: 'Not Selected',
  WAITLISTED: 'Waitlisted',
  WITHDRAWN: 'Withdrawn',
};

const validStatuses: SubmissionStatus[] = ['PENDING', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED', 'WAITLISTED', 'WITHDRAWN'];

export async function generateMetadata({ params }: EventSubmissionsPageProps) {
  const { slug } = await params;
  const event = await prisma.event.findUnique({
    where: { slug },
    select: { name: true },
  });
  
  return {
    title: event ? `${event.name} Submissions` : 'Submissions',
  };
}

export default async function EventSubmissionsPage({ params, searchParams }: EventSubmissionsPageProps) {
  const { slug } = await params;
  const { status, trackId, q: searchQuery } = await searchParams;
  const user = await getCurrentUser();
  const userRole = user.role as string;
  
  const event = await prisma.event.findUnique({
    where: { slug },
    include: {
      tracks: {
        orderBy: { name: 'asc' },
      },
      reviewTeam: {
        where: { userId: user.id },
        select: { role: true },
      },
    },
  });
  
  if (!event) {
    notFound();
  }
  
  // Check permissions - organizers and reviewers on the team can view
  const isOrganizerUser = ['ADMIN', 'ORGANIZER'].includes(userRole);
  const isReviewerOnTeam = event.reviewTeam.length > 0;
  const canView = isOrganizerUser || isReviewerOnTeam;
  
  if (!canView) {
    redirect(`/events/${slug}`);
  }
  
  // Build query with proper typing
  const where: {
    eventId: string;
    status?: SubmissionStatus;
    trackId?: string;
    OR?: Array<{
      title?: { contains: string; mode: 'insensitive' };
      abstract?: { contains: string; mode: 'insensitive' };
      speaker?: { name: { contains: string; mode: 'insensitive' } };
    }>;
  } = {
    eventId: event.id,
  };
  
  // Validate and apply status filter
  if (status && validStatuses.includes(status as SubmissionStatus)) {
    where.status = status as SubmissionStatus;
  }
  
  if (trackId) {
    where.trackId = trackId;
  }
  
  if (searchQuery) {
    where.OR = [
      { title: { contains: searchQuery, mode: 'insensitive' } },
      { abstract: { contains: searchQuery, mode: 'insensitive' } },
      { speaker: { name: { contains: searchQuery, mode: 'insensitive' } } },
    ];
  }
  
  const submissions = await prisma.submission.findMany({
    where,
    include: {
      speaker: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      track: true,
      format: true,
      reviews: {
        select: {
          id: true,
          overallScore: true,
          recommendation: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  
  // Calculate stats
  const stats = {
    total: submissions.length,
    pending: submissions.filter(s => s.status === 'PENDING').length,
    underReview: submissions.filter(s => s.status === 'UNDER_REVIEW').length,
    accepted: submissions.filter(s => s.status === 'ACCEPTED').length,
    rejected: submissions.filter(s => s.status === 'REJECTED').length,
  };
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <Link 
          href={`/events/${slug}`}
          className="text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white mb-2 inline-block"
        >
          ← Back to {event.name}
        </Link>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          Submissions
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          {event.name}
        </p>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-slate-500">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            <p className="text-sm text-slate-500">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-blue-600">{stats.underReview}</p>
            <p className="text-sm text-slate-500">Under Review</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-green-600">{stats.accepted}</p>
            <p className="text-sm text-slate-500">Accepted</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
            <p className="text-sm text-slate-500">Not Selected</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Filters */}
      <form className="flex flex-wrap gap-4 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            name="q"
            placeholder="Search submissions..."
            defaultValue={searchQuery}
            className="pl-10"
          />
        </div>
        
        <Select name="status" defaultValue={status || 'all'}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
            <SelectItem value="ACCEPTED">Accepted</SelectItem>
            <SelectItem value="REJECTED">Not Selected</SelectItem>
            <SelectItem value="WAITLISTED">Waitlisted</SelectItem>
          </SelectContent>
        </Select>
        
        {event.tracks.length > 0 && (
          <Select name="trackId" defaultValue={trackId || 'all'}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All tracks" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tracks</SelectItem>
              {event.tracks.map((track) => (
                <SelectItem key={track.id} value={track.id}>
                  {track.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        
        <Button type="submit" variant="secondary">
          Filter
        </Button>
      </form>
      
      {/* Submissions List */}
      {submissions.length > 0 ? (
        <div className="space-y-4">
          {submissions.map((submission) => {
            const avgScore = submission.reviews.length > 0
              ? submission.reviews.reduce((sum, r) => sum + (r.overallScore || 0), 0) / submission.reviews.length
              : null;
            
            return (
              <Link
                key={submission.id}
                href={`/events/${slug}/submissions/${submission.id}`}
                className="block"
              >
                <Card className="hover:border-blue-500 transition-colors">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium text-lg truncate">
                            {submission.title}
                          </h3>
                          <Badge className={statusColors[submission.status]}>
                            {statusLabels[submission.status]}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-3">
                          {submission.abstract}
                        </p>
                        
                        <div className="flex items-center gap-4 text-sm text-slate-500">
                          <span className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {submission.speaker.name || submission.speaker.email}
                          </span>
                          {submission.track && (
                            <Badge variant="outline" style={{ backgroundColor: submission.track.color || undefined }}>
                              {submission.track.name}
                            </Badge>
                          )}
                          {submission.format && (
                            <span>{submission.format.name}</span>
                          )}
                          <span>
                            {format(submission.createdAt, 'MMM d, yyyy')}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        {/* Review Stats */}
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-sm">
                            <Star className="h-4 w-4 text-yellow-500" />
                            <span className="font-medium">
                              {avgScore !== null ? avgScore.toFixed(1) : '-'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">
                            {submission.reviews.length} reviews
                          </p>
                        </div>
                        
                        <ChevronRight className="h-5 w-5 text-slate-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <FileText className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
            No submissions found
          </h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {searchQuery || status || trackId
              ? 'Try adjusting your filters'
              : 'No submissions have been received for this event yet'}
          </p>
        </div>
      )}
    </div>
  );
}
