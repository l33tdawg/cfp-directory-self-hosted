/**
 * Submission Detail Page
 * 
 * Shows submission details, reviews, and messaging.
 */

import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth';
import { notFound, redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { 
  Tag, 
  Clock, 
  FileText,
  ArrowLeft
} from 'lucide-react';
import { format } from 'date-fns';
import { SubmissionStatusActions } from './submission-status-actions';
import { SubmissionReviewSection } from './submission-review-section';
import { SubmissionMessagesSection } from './submission-messages-section';

interface SubmissionDetailPageProps {
  params: Promise<{ slug: string; submissionId: string }>;
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

/**
 * Generate page metadata
 * 
 * SECURITY: We return a generic title here to prevent information disclosure.
 * Fetching the actual submission title without authorization could leak
 * submission existence and titles via metadata/prefetch.
 * The actual title is shown in the page after authorization is verified.
 */
export async function generateMetadata() {
  // Return generic title - actual title shown after authorization in page content
  return {
    title: 'Submission Details',
  };
}

export default async function SubmissionDetailPage({ params }: SubmissionDetailPageProps) {
  const { slug, submissionId } = await params;
  const user = await getCurrentUser();
  
  const submission = await prisma.submission.findFirst({
    where: {
      id: submissionId,
      event: { slug },
    },
    include: {
      event: {
        select: {
          id: true,
          name: true,
          slug: true,
          reviewTeam: {
            where: { userId: user.id },
            select: { role: true },
          },
        },
      },
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
      materials: true,
      coSpeakers: true,
      reviews: {
        include: {
          reviewer: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          discussions: {
            include: {
              author: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
      messages: {
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
        where: { parentId: null },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
  
  if (!submission) {
    notFound();
  }
  
  // Check permissions - simplified for single-org model
  const sessionUserRole = user.role as string;
  const isReviewer = submission.event.reviewTeam.length > 0;
  const isOwner = submission.speakerId === user.id;
  const isOrganizer = ['ADMIN', 'ORGANIZER'].includes(sessionUserRole);
  const canManage = isOrganizer;
  const canReview = canManage || isReviewer;
  
  if (!isOwner && !canReview) {
    redirect(`/events/${slug}`);
  }
  
  // Calculate average score
  const avgScore = submission.reviews.length > 0
    ? submission.reviews.reduce((sum, r) => sum + (r.overallScore || 0), 0) / submission.reviews.length
    : null;
  
  // Check if user has reviewed
  const userReview = submission.reviews.find(r => r.reviewerId === user.id);
  
  const getInitials = (name?: string | null, email?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email?.charAt(0).toUpperCase() || '?';
  };
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Back Link */}
      <Link 
        href={canReview ? `/events/${slug}/submissions` : '/submissions'}
        className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        {canReview ? 'Back to Submissions' : 'Back to My Submissions'}
      </Link>
      
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge className={statusColors[submission.status]}>
                {statusLabels[submission.status]}
              </Badge>
              {submission.track && (
                <Badge 
                  variant="outline"
                  style={{ borderColor: submission.track.color || undefined }}
                >
                  <Tag className="h-3 w-3 mr-1" />
                  {submission.track.name}
                </Badge>
              )}
              {submission.format && (
                <Badge variant="outline">
                  <Clock className="h-3 w-3 mr-1" />
                  {submission.format.name} ({submission.format.durationMin}m)
                </Badge>
              )}
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {submission.title}
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              {submission.event.name}
            </p>
          </div>
          
          {canManage && (
            <SubmissionStatusActions 
              submissionId={submission.id}
              eventId={submission.event.id}
              currentStatus={submission.status}
            />
          )}
        </div>
      </div>
      
      {/* Speaker Info */}
      <Card className="mb-6">
        <CardContent className="pt-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={submission.speaker.image || undefined} />
              <AvatarFallback>
                {getInitials(submission.speaker.name, submission.speaker.email)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{submission.speaker.name || 'No name'}</p>
              <p className="text-sm text-slate-500">{submission.speaker.email}</p>
            </div>
            {submission.coSpeakers.length > 0 && (
              <div className="ml-auto">
                <span className="text-sm text-slate-500">
                  + {submission.coSpeakers.length} co-speaker{submission.coSpeakers.length !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Stats Bar for Reviewers */}
      {canReview && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="text-2xl font-bold">{submission.reviews.length}</div>
              <p className="text-xs text-slate-500">Reviews</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="text-2xl font-bold">
                {avgScore !== null ? avgScore.toFixed(1) : '-'}
              </div>
              <p className="text-xs text-slate-500">Avg Score</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="text-2xl font-bold">{submission.messages.length}</div>
              <p className="text-xs text-slate-500">Messages</p>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Tabs */}
      <Tabs defaultValue="details" className="space-y-6">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          {canReview && (
            <TabsTrigger value="reviews">
              Reviews ({submission.reviews.length})
            </TabsTrigger>
          )}
          <TabsTrigger value="messages">
            Messages ({submission.messages.length})
          </TabsTrigger>
        </TabsList>
        
        {/* Details Tab */}
        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Abstract</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="whitespace-pre-wrap">{submission.abstract}</p>
              
              {submission.outline && (
                <div>
                  <h4 className="font-medium mb-2">Talk Outline</h4>
                  <p className="text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                    {submission.outline}
                  </p>
                </div>
              )}
              
              {submission.targetAudience && (
                <div>
                  <h4 className="font-medium mb-2">Target Audience</h4>
                  <p className="text-slate-600 dark:text-slate-400">
                    {submission.targetAudience}
                  </p>
                </div>
              )}
              
              {submission.prerequisites && (
                <div>
                  <h4 className="font-medium mb-2">Prerequisites</h4>
                  <p className="text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                    {submission.prerequisites}
                  </p>
                </div>
              )}
              
              {submission.coSpeakers.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Co-Speakers</h4>
                  <div className="space-y-2">
                    {submission.coSpeakers.map((coSpeaker) => (
                      <div key={coSpeaker.id} className="flex items-center gap-3 p-2 rounded bg-slate-50 dark:bg-slate-800">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={coSpeaker.avatarUrl || undefined} />
                          <AvatarFallback>
                            {getInitials(coSpeaker.name, coSpeaker.email || undefined)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{coSpeaker.name}</p>
                          {coSpeaker.email && (
                            <p className="text-xs text-slate-500">{coSpeaker.email}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {submission.materials.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Materials</h4>
                  <div className="space-y-2">
                    {submission.materials.map((material) => (
                      <div key={material.id} className="flex items-center gap-3 p-2 rounded border">
                        <FileText className="h-4 w-4 text-slate-500" />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{material.title}</p>
                          {material.description && (
                            <p className="text-xs text-slate-500">{material.description}</p>
                          )}
                        </div>
                        {(material.fileUrl || material.externalUrl) && (
                          <Button variant="outline" size="sm" asChild>
                            <a 
                              href={material.fileUrl || material.externalUrl || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              View
                            </a>
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="pt-4 border-t text-sm text-slate-500">
                Submitted on {format(submission.createdAt, 'MMMM d, yyyy')}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Reviews Tab */}
        {canReview && (
          <TabsContent value="reviews">
            <SubmissionReviewSection
              submissionId={submission.id}
              eventId={submission.event.id}
              reviews={submission.reviews}
              userReview={userReview}
              currentUserId={user.id}
            />
          </TabsContent>
        )}
        
        {/* Messages Tab */}
        <TabsContent value="messages">
          <SubmissionMessagesSection
            submissionId={submission.id}
            eventId={submission.event.id}
            messages={submission.messages}
            currentUserId={user.id}
            isOwner={isOwner}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
