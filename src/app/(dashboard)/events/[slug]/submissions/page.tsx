/**
 * Event Submissions Page
 * 
 * Lists all submissions for an event (for organizers/reviewers).
 */

import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth';
import { notFound, redirect } from 'next/navigation';
import { 
  decryptPiiFields, 
  USER_PII_FIELDS,
  SPEAKER_PROFILE_PII_FIELDS,
  CO_SPEAKER_PII_FIELDS
} from '@/lib/security/encryption';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Link from 'next/link';
import { FileText, Search, ChevronRight, Star, MessageSquare } from 'lucide-react';
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
          speakerProfile: {
            select: {
              fullName: true,
              company: true,
              position: true,
            },
          },
        },
      },
      track: true,
      format: true,
      coSpeakers: {
        select: { 
          id: true,
          name: true,
          email: true,
          bio: true,
          avatarUrl: true,
        },
      },
      reviews: {
        select: {
          id: true,
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
  
  // Decrypt speaker information
  const decryptedSubmissions = submissions.map((submission) => {
    const decryptedUser = decryptPiiFields(
      submission.speaker as unknown as Record<string, unknown>,
      USER_PII_FIELDS
    );
    
    let speakerName = String(decryptedUser.name || '') || submission.speaker.email;
    let speakerCompany = '';
    let speakerPosition = '';
    
    if (submission.speaker.speakerProfile) {
      const decryptedProfile = decryptPiiFields(
        submission.speaker.speakerProfile as unknown as Record<string, unknown>,
        SPEAKER_PROFILE_PII_FIELDS
      );
      // Use speaker profile name if available
      if (decryptedProfile.fullName) {
        speakerName = String(decryptedProfile.fullName);
      }
      speakerCompany = String(decryptedProfile.company || '');
      speakerPosition = String(decryptedProfile.position || '');
    }
    
    // Decrypt co-speaker information
    const decryptedCoSpeakers = submission.coSpeakers.map((coSpeaker) => {
      const decrypted = decryptPiiFields(
        coSpeaker as unknown as Record<string, unknown>,
        CO_SPEAKER_PII_FIELDS
      );
      return {
        id: coSpeaker.id,
        name: String(decrypted.name || ''),
        email: decrypted.email ? String(decrypted.email) : null,
        avatarUrl: coSpeaker.avatarUrl,
      };
    });
    
    return {
      ...submission,
      decryptedSpeaker: {
        name: speakerName,
        email: submission.speaker.email,
        image: submission.speaker.image,
        company: speakerCompany,
        position: speakerPosition,
      },
      decryptedCoSpeakers,
    };
  });
  
  // Calculate stats
  const stats = {
    total: decryptedSubmissions.length,
    pending: decryptedSubmissions.filter(s => s.status === 'PENDING').length,
    underReview: decryptedSubmissions.filter(s => s.status === 'UNDER_REVIEW').length,
    accepted: decryptedSubmissions.filter(s => s.status === 'ACCEPTED').length,
    rejected: decryptedSubmissions.filter(s => s.status === 'REJECTED').length,
    waitlisted: decryptedSubmissions.filter(s => s.status === 'WAITLISTED').length,
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
      {decryptedSubmissions.length > 0 ? (
        <div className="space-y-3">
          {decryptedSubmissions.map((submission) => {
            const avgScore = submission.reviews.length > 0
              ? submission.reviews.reduce((sum, r) => sum + (r.overallScore || 0), 0) / submission.reviews.length
              : null;
            
            const speakerInitials = submission.decryptedSpeaker.name
              .split(' ')
              .map(n => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2);
            
            // Determine border color based on status
            const borderColor = {
              ACCEPTED: 'border-l-green-500',
              REJECTED: 'border-l-red-500',
              WAITLISTED: 'border-l-purple-500',
              PENDING: 'border-l-amber-500',
              UNDER_REVIEW: 'border-l-blue-500',
              WITHDRAWN: 'border-l-slate-400',
            }[submission.status] || 'border-l-slate-400';
            
            // Score color based on value
            const getScoreColor = (score: number | null) => {
              if (score === null) return 'text-slate-400';
              if (score >= 4) return 'text-green-600 dark:text-green-400';
              if (score >= 3) return 'text-amber-600 dark:text-amber-400';
              return 'text-red-600 dark:text-red-400';
            };
            
            return (
              <Link
                key={submission.id}
                href={`/events/${slug}/submissions/${submission.id}`}
                className="block group"
              >
                <Card className={`hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 border-l-4 ${borderColor}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Speaker Avatar */}
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarImage src={submission.decryptedSpeaker.image || undefined} />
                        <AvatarFallback className="bg-slate-100 dark:bg-slate-700 text-sm">
                          {speakerInitials}
                        </AvatarFallback>
                      </Avatar>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            {/* Title and Status */}
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h3 className="font-semibold text-slate-900 dark:text-white line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {submission.title}
                              </h3>
                              <Badge className={statusColors[submission.status]}>
                                {statusLabels[submission.status]}
                              </Badge>
                            </div>
                            
                            {/* Abstract */}
                            <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-2">
                              {submission.abstract}
                            </p>
                            
                            {/* Speaker Info */}
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                {submission.decryptedSpeaker.name}
                              </span>
                              {submission.decryptedSpeaker.position && submission.decryptedSpeaker.company && (
                                <span className="text-xs text-slate-500">
                                  {submission.decryptedSpeaker.position} at {submission.decryptedSpeaker.company}
                                </span>
                              )}
                              {submission.decryptedCoSpeakers.length > 0 && (
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-slate-500">+</span>
                                  <div className="flex items-center -space-x-2">
                                    {submission.decryptedCoSpeakers.slice(0, 3).map((coSpeaker) => {
                                      const initials = coSpeaker.name
                                        .split(' ')
                                        .map(n => n[0])
                                        .join('')
                                        .toUpperCase()
                                        .slice(0, 2);
                                      return (
                                        <Avatar key={coSpeaker.id} className="h-6 w-6 border-2 border-white dark:border-slate-800">
                                          <AvatarImage src={coSpeaker.avatarUrl || undefined} />
                                          <AvatarFallback className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-[10px]">
                                            {initials}
                                          </AvatarFallback>
                                        </Avatar>
                                      );
                                    })}
                                  </div>
                                  <span className="text-xs text-slate-600 dark:text-slate-400 ml-1">
                                    {submission.decryptedCoSpeakers.map(cs => cs.name).join(', ')}
                                  </span>
                                </div>
                              )}
                            </div>
                            
                            {/* Metadata */}
                            <div className="flex items-center gap-3 flex-wrap">
                              {submission.track && (
                                <Badge 
                                  variant="outline" 
                                  className="text-xs"
                                  style={{ 
                                    borderColor: submission.track.color || undefined,
                                    backgroundColor: submission.track.color ? `${submission.track.color}20` : undefined,
                                  }}
                                >
                                  {submission.track.name}
                                </Badge>
                              )}
                              {submission.format && (
                                <span className="text-xs text-slate-500">
                                  {submission.format.name}
                                </span>
                              )}
                              <span className="text-xs text-slate-500">
                                {format(submission.createdAt, 'MMM d, yyyy')}
                              </span>
                              {submission._count.messages > 0 && (
                                <span className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                                  <MessageSquare className="h-3 w-3" />
                                  {submission._count.messages}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {/* Score Column */}
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <div className="text-right">
                              <div className={`flex items-center gap-1 ${getScoreColor(avgScore)}`}>
                                <Star className={`h-4 w-4 ${avgScore !== null && avgScore >= 4 ? 'fill-current' : ''}`} />
                                <span className="font-semibold text-lg">
                                  {avgScore !== null ? avgScore.toFixed(1) : '-'}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500">
                                {submission.reviews.length} review{submission.reviews.length !== 1 ? 's' : ''}
                              </p>
                            </div>
                            <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                          </div>
                        </div>
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
