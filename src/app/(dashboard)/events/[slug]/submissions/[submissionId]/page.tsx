/**
 * Submission Detail Page
 * 
 * Comprehensive view of a submission with:
 * - 3-column layout (main content + sidebar)
 * - Review score visualization with bar charts
 * - Speaker profile with bio and social links
 * - Supporting materials with icons
 * - Internal discussions and speaker messaging
 */

import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth';
import { notFound, redirect } from 'next/navigation';
import { 
  decryptPiiFields, 
  USER_PII_FIELDS,
  SPEAKER_PROFILE_PII_FIELDS 
} from '@/lib/security/encryption';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ReviewScoreSummary, RatingBarChart } from '@/components/ui/rating-bar-chart';
import Link from 'next/link';
import { 
  Tag, 
  Clock, 
  FileText,
  ArrowLeft,
  Calendar,
  Star,
  User,
  Globe,
  Video,
  Code,
  FileIcon,
  ExternalLink,
  Download,
  Linkedin,
  Twitter,
  Github,
  MessageSquare
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
 */
export async function generateMetadata() {
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
          speakerProfile: {
            select: {
              fullName: true,
              bio: true,
              company: true,
              position: true,
              location: true,
              websiteUrl: true,
              linkedinUrl: true,
              twitterHandle: true,
              githubUsername: true,
            },
          },
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
  
  // Check permissions
  const isAdmin = user.role === 'ADMIN';
  const userReviewTeamRole = submission.event.reviewTeam[0]?.role;
  const isLead = userReviewTeamRole === 'LEAD';
  const isReviewer = submission.event.reviewTeam.length > 0;
  const isOwner = submission.speakerId === user.id;
  
  const canManage = isAdmin || isLead;
  const canReview = canManage || isReviewer;
  
  if (!isOwner && !canReview) {
    redirect(`/events/${slug}`);
  }
  
  // Decrypt speaker data
  const decryptedSpeaker = decryptPiiFields(
    submission.speaker as unknown as Record<string, unknown>,
    USER_PII_FIELDS
  );
  const speakerName = decryptedSpeaker.name as string | null;
  const speakerEmail = submission.speaker.email;
  
  // Decrypt speaker profile if exists
  const decryptedSpeakerProfile = submission.speaker.speakerProfile
    ? decryptPiiFields(
        submission.speaker.speakerProfile as unknown as Record<string, unknown>,
        SPEAKER_PROFILE_PII_FIELDS
      )
    : null;
  
  // Calculate review statistics
  const reviewsWithScores = submission.reviews.filter(r => r.overallScore);
  const avgScore = reviewsWithScores.length > 0
    ? reviewsWithScores.reduce((sum, r) => sum + (r.overallScore || 0), 0) / reviewsWithScores.length
    : null;
  
  // Prepare scores for visualization
  const aggregatedScores: Record<string, number[]> = {
    Content: [],
    Presentation: [],
    Relevance: [],
    Overall: [],
  };
  
  submission.reviews.forEach(r => {
    if (r.contentScore) aggregatedScores['Content'].push(r.contentScore);
    if (r.presentationScore) aggregatedScores['Presentation'].push(r.presentationScore);
    if (r.relevanceScore) aggregatedScores['Relevance'].push(r.relevanceScore);
    if (r.overallScore) aggregatedScores['Overall'].push(r.overallScore);
  });
  
  const averageScores: Record<string, number> = {};
  Object.entries(aggregatedScores).forEach(([key, scores]) => {
    if (scores.length > 0) {
      averageScores[key] = scores.reduce((a, b) => a + b, 0) / scores.length;
    }
  });
  
  // Check if user has reviewed
  const userReview = submission.reviews.find(r => r.reviewerId === user.id);
  
  const getInitials = (name?: string | null, email?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email?.charAt(0).toUpperCase() || '?';
  };
  
  // Material type icons and labels
  const getMaterialIcon = (type: string | null) => {
    switch (type) {
      case 'SLIDES': return FileText;
      case 'VIDEO': return Video;
      case 'CODE': return Code;
      default: return FileIcon;
    }
  };
  
  const getMaterialLabel = (type: string | null) => {
    switch (type) {
      case 'SLIDES': return 'Slides';
      case 'VIDEO': return 'Video';
      case 'CODE': return 'Code Repository';
      case 'DOCUMENT': return 'Document';
      default: return 'Other';
    }
  };
  
  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <Link 
          href={canReview ? `/events/${slug}/submissions` : '/submissions'}
          className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          {canReview ? 'Back to Submissions' : 'Back to My Submissions'}
        </Link>
        {canReview && (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/events/${slug}`}>
              View Event
            </Link>
          </Button>
        )}
      </div>
      
      {/* Submission Header */}
      <div className="space-y-4 mb-6">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          {submission.title}
        </h1>
        <p className="text-muted-foreground">
          Submitted to {submission.event.name}
        </p>
        
        <div className="flex flex-wrap gap-2">
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
          {canReview && avgScore !== null && (
            <Badge 
              variant="outline" 
              className={
                avgScore >= 4 ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300' :
                avgScore >= 3 ? 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300' :
                avgScore >= 2 ? 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300' :
                'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300'
              }
            >
              <Star className="h-3 w-3 mr-1 fill-current" />
              {avgScore.toFixed(1)}/5
            </Badge>
          )}
          {canReview && avgScore === null && (
            <Badge variant="outline" className="text-muted-foreground">
              <Star className="h-3 w-3 mr-1" />
              No ratings yet
            </Badge>
          )}
        </div>
      </div>
      
      {/* Main Grid Layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-auto">
              <TabsTrigger value="details" className="text-xs sm:text-sm">Details</TabsTrigger>
              {canReview && (
                <TabsTrigger value="reviews" className="text-xs sm:text-sm">
                  Reviews ({submission.reviews.length})
                </TabsTrigger>
              )}
              <TabsTrigger value="messages" className="text-xs sm:text-sm">
                Messages ({submission.messages.length})
              </TabsTrigger>
            </TabsList>
            
            {/* Details Tab */}
            <TabsContent value="details" className="space-y-6">
              {/* Abstract */}
              <Card>
                <CardHeader>
                  <CardTitle>Abstract</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap">{submission.abstract}</p>
                </CardContent>
              </Card>
              
              {/* Talk Outline */}
              {submission.outline && (
                <Card>
                  <CardHeader>
                    <CardTitle>Talk Outline</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                      {submission.outline}
                    </p>
                  </CardContent>
                </Card>
              )}
              
              {/* Target Audience & Prerequisites */}
              {(submission.targetAudience || submission.prerequisites) && (
                <Card>
                  <CardHeader>
                    <CardTitle>Additional Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
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
                  </CardContent>
                </Card>
              )}
              
              {/* Speaker Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Speaker Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={submission.speaker.image || undefined} />
                      <AvatarFallback className="text-lg">
                        {getInitials(speakerName, speakerEmail)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-lg">
                        {decryptedSpeakerProfile?.fullName 
                          ? String(decryptedSpeakerProfile.fullName) 
                          : speakerName || 'No name'}
                      </p>
                      <p className="text-sm text-muted-foreground">{speakerEmail}</p>
                      {decryptedSpeakerProfile?.position && decryptedSpeakerProfile?.company ? (
                        <p className="text-sm text-muted-foreground">
                          {String(decryptedSpeakerProfile.position)} at {String(decryptedSpeakerProfile.company)}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  
                  {decryptedSpeakerProfile?.bio ? (
                    <div>
                      <h4 className="font-medium mb-1">Bio</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {String(decryptedSpeakerProfile.bio)}
                      </p>
                    </div>
                  ) : null}
                  
                  {/* Social Links */}
                  {(decryptedSpeakerProfile?.websiteUrl || 
                    decryptedSpeakerProfile?.linkedinUrl || 
                    decryptedSpeakerProfile?.twitterHandle || 
                    decryptedSpeakerProfile?.githubUsername) ? (
                    <div className="flex flex-wrap gap-2">
                      {decryptedSpeakerProfile?.websiteUrl ? (
                        <Button variant="outline" size="sm" asChild>
                          <a 
                            href={String(decryptedSpeakerProfile.websiteUrl)} 
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <Globe className="h-4 w-4 mr-1" />
                            Website
                          </a>
                        </Button>
                      ) : null}
                      {decryptedSpeakerProfile?.linkedinUrl ? (
                        <Button variant="outline" size="sm" asChild>
                          <a 
                            href={String(decryptedSpeakerProfile.linkedinUrl)} 
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <Linkedin className="h-4 w-4 mr-1" />
                            LinkedIn
                          </a>
                        </Button>
                      ) : null}
                      {decryptedSpeakerProfile?.twitterHandle ? (
                        <Button variant="outline" size="sm" asChild>
                          <a 
                            href={`https://twitter.com/${String(decryptedSpeakerProfile.twitterHandle)}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <Twitter className="h-4 w-4 mr-1" />
                            @{String(decryptedSpeakerProfile.twitterHandle)}
                          </a>
                        </Button>
                      ) : null}
                      {decryptedSpeakerProfile?.githubUsername ? (
                        <Button variant="outline" size="sm" asChild>
                          <a 
                            href={`https://github.com/${String(decryptedSpeakerProfile.githubUsername)}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <Github className="h-4 w-4 mr-1" />
                            {String(decryptedSpeakerProfile.githubUsername)}
                          </a>
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
              
              {/* Co-Speakers */}
              {submission.coSpeakers.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Co-Speakers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {submission.coSpeakers.map((coSpeaker) => (
                        <div key={coSpeaker.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={coSpeaker.avatarUrl || undefined} />
                            <AvatarFallback>
                              {getInitials(coSpeaker.name, coSpeaker.email || undefined)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{coSpeaker.name}</p>
                            {coSpeaker.email && (
                              <p className="text-sm text-muted-foreground">{coSpeaker.email}</p>
                            )}
                            {coSpeaker.bio && (
                              <p className="text-sm text-muted-foreground mt-1">{coSpeaker.bio}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            
            {/* Reviews Tab */}
            {canReview && (
              <TabsContent value="reviews" className="space-y-6">
                {/* Review Summary */}
                {submission.reviews.length > 0 && Object.keys(averageScores).length > 0 && (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold">Review Summary</h3>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Overall:</span>
                            <span className="text-lg font-bold">
                              {avgScore?.toFixed(1) || '-'}/5
                            </span>
                          </div>
                        </div>
                        <RatingBarChart 
                          criteria={averageScores} 
                          maxScore={5}
                          colorScheme="performance"
                        />
                        <div className="text-xs text-muted-foreground">
                          Based on {submission.reviews.length} review{submission.reviews.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                {/* Scoring System Explanation */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm text-muted-foreground">
                      <p className="mb-2">
                        <strong>How ratings work:</strong> Each reviewer scores multiple criteria (1-5 scale). 
                        The individual review score is the average of all criteria. 
                        The overall submission rating is the average of all review scores.
                      </p>
                      <p>
                        <strong>Current status:</strong> {submission.reviews.length} review(s) • 
                        Average rating: <span className="font-medium">{avgScore?.toFixed(1) || 'None'}</span>
                      </p>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Review Section Component */}
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
              <div className="text-sm text-muted-foreground mb-4">
                Messages are visible to the speaker. Use these to communicate directly about the submission.
              </div>
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
        
        {/* Sidebar - 1/3 width */}
        <div className="space-y-6">
          {/* Quick Actions */}
          {canManage && (
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <SubmissionStatusActions 
                  submissionId={submission.id}
                  eventId={submission.event.id}
                  currentStatus={submission.status}
                />
              </CardContent>
            </Card>
          )}
          
          {/* Submission Meta */}
          <Card>
            <CardHeader>
              <CardTitle>Submission Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Submitted {format(submission.createdAt, 'PP')}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>Updated {format(submission.updatedAt, 'PP')}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span>ID: {submission.id.slice(0, 8)}</span>
              </div>
              {canReview && (
                <>
                  <Separator />
                  <div className="flex items-center gap-2 text-sm">
                    <Star className="h-4 w-4 text-muted-foreground" />
                    <span>{submission.reviews.length} review(s)</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <span>{submission.messages.length} message(s)</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          
          {/* Co-Speakers Summary */}
          {submission.coSpeakers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Co-Speakers ({submission.coSpeakers.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {submission.coSpeakers.map((coSpeaker) => (
                    <div key={coSpeaker.id} className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={coSpeaker.avatarUrl || undefined} />
                        <AvatarFallback className="text-xs">
                          {getInitials(coSpeaker.name, coSpeaker.email || undefined)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{coSpeaker.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Supporting Materials */}
          {submission.materials.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Supporting Materials</CardTitle>
                <CardDescription>
                  Files and links provided by the speaker
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {submission.materials.map((material) => {
                    const Icon = getMaterialIcon(material.type);
                    const isExternal = material.externalUrl && !material.fileUrl;
                    
                    return (
                      <div
                        key={material.id}
                        className="flex items-start gap-2 p-2 rounded border hover:bg-muted/50 transition-colors"
                      >
                        <div className="p-1 rounded bg-muted">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-xs">{material.title}</h4>
                          <p className="text-xs text-muted-foreground">
                            {getMaterialLabel(material.type)}
                            {isExternal && ' • External'}
                            {!isExternal && material.fileSize && ` • ${formatFileSize(material.fileSize)}`}
                          </p>
                          {material.description && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {material.description}
                            </p>
                          )}
                          <div className="mt-1">
                            {isExternal ? (
                              <Button variant="ghost" size="sm" asChild className="h-6 px-2 text-xs">
                                <a 
                                  href={material.externalUrl || '#'} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                >
                                  <ExternalLink className="h-3 w-3 mr-1" />
                                  View
                                </a>
                              </Button>
                            ) : material.fileUrl ? (
                              <Button variant="ghost" size="sm" asChild className="h-6 px-2 text-xs">
                                <a 
                                  href={material.fileUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                >
                                  <Download className="h-3 w-3 mr-1" />
                                  Download
                                </a>
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
