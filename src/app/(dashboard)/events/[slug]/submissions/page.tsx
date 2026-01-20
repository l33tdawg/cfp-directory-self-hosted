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
import { FileText, Search, Filter, ChevronRight, User, Star } from 'lucide-react';
import { format } from 'date-fns';

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
  
  const event = await prisma.event.findUnique({
    where: { slug },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          members: {
            where: { userId: user.id },
            select: { role: true },
          },
        },
      },
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
  
  // Check permissions
  const userRole = event.organization.members[0]?.role;
  const isReviewer = event.reviewTeam.length > 0;
  const canManage = user.role === 'ADMIN' || userRole === 'OWNER' || userRole === 'ADMIN';
  const canView = canManage || isReviewer;
  
  if (!canView) {
    redirect(`/events/${slug}`);
  }
  
  // Build query
  const where = {
    eventId: event.id,
    ...(status && { status: status as string }),
    ...(trackId && { trackId }),
    ...(searchQuery && {
      OR: [
        { title: { contains: searchQuery, mode: 'insensitive' as const } },
        { abstract: { contains: searchQuery, mode: 'insensitive' as const } },
        { speaker: { name: { contains: searchQuery, mode: 'insensitive' as const } } },
      ],
    }),
  };
  
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
          reviewerId: true,
          overallScore: true,
          recommendation: true,
        },
      },
      _count: {
        select: {
          messages: true,
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
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link 
            href={`/events/${slug}`}
            className="text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            ← Back to {event.name}
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            Submissions
          </h1>
        </div>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-slate-500">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <p className="text-xs text-slate-500">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold text-blue-600">{stats.underReview}</div>
            <p className="text-xs text-slate-500">Under Review</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold text-green-600">{stats.accepted}</div>
            <p className="text-xs text-slate-500">Accepted</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            <p className="text-xs text-slate-500">Rejected</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <form className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              name="q"
              placeholder="Search submissions..."
              defaultValue={searchQuery}
              className="pl-10"
            />
          </div>
        </form>
        
        <Select defaultValue={status || ''}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Statuses</SelectItem>
            {Object.entries(statusLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {event.tracks.length > 0 && (
          <Select defaultValue={trackId || ''}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Tracks" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Tracks</SelectItem>
              {event.tracks.map((track) => (
                <SelectItem key={track.id} value={track.id}>{track.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      
      {/* Submissions List */}
      {submissions.length > 0 ? (
        <div className="space-y-4">
          {submissions.map((submission) => {
            const avgScore = submission.reviews.length > 0
              ? submission.reviews.reduce((sum, r) => sum + (r.overallScore || 0), 0) / submission.reviews.length
              : null;
            const hasUserReviewed = submission.reviews.some(r => r.reviewerId === user.id);
            
            return (
              <Link key={submission.id} href={`/events/${slug}/submissions/${submission.id}`}>
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={statusColors[submission.status]}>
                            {statusLabels[submission.status]}
                          </Badge>
                          {submission.track && (
                            <Badge 
                              variant="outline"
                              style={{ borderColor: submission.track.color || undefined }}
                            >
                              {submission.track.name}
                            </Badge>
                          )}
                          {hasUserReviewed && (
                            <Badge variant="secondary" className="text-xs">
                              <Star className="h-3 w-3 mr-1" />
                              Reviewed
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-medium text-slate-900 dark:text-white">
                          {submission.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-2 text-sm text-slate-500">
                          <User className="h-3 w-3" />
                          <span>{submission.speaker.name || submission.speaker.email}</span>
                          {submission.format && (
                            <>
                              <span>•</span>
                              <span>{submission.format.name} ({submission.format.durationMin}m)</span>
                            </>
                          )}
                        </div>
                        <p className="text-sm text-slate-500 mt-2 line-clamp-2">
                          {submission.abstract}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {avgScore !== null && (
                          <div className="text-center">
                            <div className="text-lg font-bold">{avgScore.toFixed(1)}</div>
                            <div className="text-xs text-slate-500">
                              {submission.reviews.length} review{submission.reviews.length !== 1 ? 's' : ''}
                            </div>
                          </div>
                        )}
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
            {searchQuery || status || trackId ? 'No submissions found' : 'No submissions yet'}
          </h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {searchQuery || status || trackId 
              ? 'Try adjusting your filters' 
              : 'Submissions will appear here once speakers start submitting'}
          </p>
        </div>
      )}
    </div>
  );
}
