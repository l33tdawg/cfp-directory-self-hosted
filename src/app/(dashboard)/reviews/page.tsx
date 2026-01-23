/**
 * Review Queue Page
 * 
 * Displays submissions awaiting review with tabs for different states.
 * Only accessible by reviewers and organizers.
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  ClipboardCheck, 
  Clock, 
  CheckCircle2, 
  Star,
  Calendar,
  User,
  ArrowRight,
  FileText,
  ChevronDown,
  Target,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { decryptPiiFields, USER_PII_FIELDS } from '@/lib/security/encryption';

export const metadata = {
  title: 'Review Queue',
  description: 'Manage your review assignments',
};

export default async function ReviewsPage() {
  const user = await getCurrentUser();
  const userRole = user.role as string;
  const isReviewer = ['ADMIN', 'ORGANIZER', 'REVIEWER'].includes(userRole);

  if (!isReviewer) {
    redirect('/dashboard');
  }

  // In a self-hosted single-org architecture, all reviewers can access all events
  // No need to filter by ReviewTeamMember assignments - all reviewers belong to the same org
  const canReviewAll = ['ADMIN', 'ORGANIZER', 'REVIEWER'].includes(userRole);

  // Build base where clause for submissions (empty = all submissions)
  const baseWhere = canReviewAll ? {} : { id: 'none' }; // Non-reviewers see nothing

  // Get submissions by review status
  const [pendingSubmissions, inProgressSubmissions, completedReviews] = await Promise.all([
    // Pending - no review from this user, submission is pending/under_review
    prisma.submission.findMany({
      where: {
        ...baseWhere,
        status: { in: ['PENDING', 'UNDER_REVIEW'] },
        reviews: {
          none: { reviewerId: user.id },
        },
      },
      include: {
        event: { select: { name: true, slug: true } },
        speaker: { select: { id: true, name: true, email: true, image: true } },
        _count: { select: { reviews: true } },
      },
      orderBy: { createdAt: 'asc' },
    }),
    
    // In Progress - user started review but not submitted (draft state isn't implemented yet, so this is empty)
    // For now, this could be submissions where user has a review but it's incomplete
    Promise.resolve([]),
    
    // Completed - user has submitted a review
    prisma.review.findMany({
      where: {
        reviewerId: user.id,
      },
      include: {
        submission: {
          include: {
            event: { select: { name: true, slug: true } },
            speaker: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
  ]);

  // Decrypt speaker names for pending submissions
  const decryptedPendingSubmissions = pendingSubmissions.map((submission) => {
    const decryptedUser = decryptPiiFields(
      submission.speaker as unknown as Record<string, unknown>,
      USER_PII_FIELDS
    );
    return {
      ...submission,
      speaker: {
        ...submission.speaker,
        name: String(decryptedUser.name || '') || null,
      },
    };
  });

  // Decrypt speaker names for completed reviews
  const decryptedCompletedReviews = completedReviews.map((review) => {
    const decryptedUser = decryptPiiFields(
      review.submission.speaker as unknown as Record<string, unknown>,
      USER_PII_FIELDS
    );
    return {
      ...review,
      submission: {
        ...review.submission,
        speaker: {
          ...review.submission.speaker,
          name: String(decryptedUser.name || '') || null,
        },
      },
    };
  });

  // Calculate stats
  const stats = {
    pending: decryptedPendingSubmissions.length,
    inProgress: inProgressSubmissions.length,
    completed: decryptedCompletedReviews.length,
    assignedEvents: 'All Events', // Single-org: all reviewers can access all events
  };

  const recommendationLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    STRONG_ACCEPT: { label: 'Strong Accept', variant: 'default' },
    ACCEPT: { label: 'Accept', variant: 'default' },
    NEUTRAL: { label: 'Neutral', variant: 'secondary' },
    REJECT: { label: 'Reject', variant: 'destructive' },
    STRONG_REJECT: { label: 'Strong Reject', variant: 'destructive' },
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Review Queue</h1>
          <p className="text-muted-foreground mt-1">
            Review and evaluate talk submissions
          </p>
        </div>
      </div>

      {/* Collapsible Review Guidelines */}
      <Collapsible className="mb-6">
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
          <CollapsibleTrigger className="w-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-lg">Review Guidelines</CardTitle>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
              </div>
              <CardDescription className="text-left">
                Quick reference for providing effective reviews
              </CardDescription>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 space-y-4">
              {/* Core Principles */}
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Be Constructive</p>
                    <p className="text-xs text-muted-foreground">Focus on improvements, not just flaws</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Stay Objective</p>
                    <p className="text-xs text-muted-foreground">Evaluate content quality, not preferences</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Be Specific</p>
                    <p className="text-xs text-muted-foreground">Provide concrete, actionable feedback</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Consider Audience</p>
                    <p className="text-xs text-muted-foreground">Match talk to event&apos;s target audience</p>
                  </div>
                </div>
              </div>

              {/* Scoring Quick Reference */}
              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-2">Scoring Guide</p>
                <div className="flex flex-wrap gap-4 text-xs">
                  <span><span className="font-medium">5★</span> Excellent - Outstanding, must-have</span>
                  <span><span className="font-medium">4★</span> Very Good - Strong with minor tweaks</span>
                  <span><span className="font-medium">3★</span> Good - Solid but needs work</span>
                  <span><span className="font-medium">2★</span> Fair - Potential but major improvements needed</span>
                  <span><span className="font-medium">1★</span> Poor - Not suitable in current form</span>
                </div>
              </div>

              {/* Do's and Don'ts */}
              <div className="border-t pt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-green-700 dark:text-green-400 mb-2">Do&apos;s</p>
                  <ul className="text-xs space-y-1 text-muted-foreground">
                    <li>✓ Read the entire submission carefully</li>
                    <li>✓ Provide specific improvement suggestions</li>
                    <li>✓ Use private notes for team discussions</li>
                    <li>✓ Recuse yourself if there&apos;s a conflict</li>
                  </ul>
                </div>
                <div>
                  <p className="text-sm font-medium text-red-700 dark:text-red-400 mb-2">Don&apos;ts</p>
                  <ul className="text-xs space-y-1 text-muted-foreground">
                    <li><AlertCircle className="h-3 w-3 inline mr-1" />Don&apos;t make personal attacks</li>
                    <li><AlertCircle className="h-3 w-3 inline mr-1" />Don&apos;t let bias influence reviews</li>
                    <li><AlertCircle className="h-3 w-3 inline mr-1" />Don&apos;t share submission details publicly</li>
                    <li><AlertCircle className="h-3 w-3 inline mr-1" />Don&apos;t rush through reviews</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Awaiting your review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">Reviews submitted</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Score</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {completedReviews.length > 0
                ? (completedReviews.reduce((sum, r) => sum + (r.overallScore || 0), 0) / completedReviews.filter(r => r.overallScore).length).toFixed(1)
                : '-'}
            </div>
            <p className="text-xs text-muted-foreground">Your average rating</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Events</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">All</div>
            <p className="text-xs text-muted-foreground">Access to all events</p>
          </CardContent>
        </Card>
      </div>

      {/* Review Queue Tabs */}
      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            Pending
            {stats.pending > 0 && (
              <Badge variant="secondary" className="h-5 px-2 text-xs">
                {stats.pending}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-2">
            Completed
            <Badge variant="outline" className="h-5 px-2 text-xs">
              {stats.completed}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* Pending Reviews */}
        <TabsContent value="pending">
          {decryptedPendingSubmissions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
                <p className="text-muted-foreground text-center">
                  No submissions awaiting your review.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {decryptedPendingSubmissions.map((submission) => (
                <Card key={submission.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{submission.title}</CardTitle>
                        <CardDescription className="flex items-center gap-4 mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {submission.event.name}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {submission.speaker?.name || submission.speaker?.email}
                          </span>
                          <span className="flex items-center gap-1">
                            <ClipboardCheck className="h-3 w-3" />
                            {submission._count.reviews} review{submission._count.reviews !== 1 ? 's' : ''}
                          </span>
                        </CardDescription>
                      </div>
                      <Badge variant="outline">
                        {submission.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                      {submission.abstract}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Submitted {format(new Date(submission.createdAt), 'MMM d, yyyy')}
                      </span>
                      <Button asChild>
                        <Link href={`/events/${submission.event.slug}/submissions/${submission.id}`}>
                          Start Review
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Completed Reviews */}
        <TabsContent value="completed">
          {decryptedCompletedReviews.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No reviews yet</h3>
                <p className="text-muted-foreground text-center">
                  Start reviewing submissions from the Pending tab.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {decryptedCompletedReviews.map((review) => (
                <Card key={review.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {review.submission.title}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-4 mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {review.submission.event.name}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {review.submission.speaker?.name || review.submission.speaker?.email}
                          </span>
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {review.overallScore && (
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="font-medium">{review.overallScore}/5</span>
                          </div>
                        )}
                        {review.recommendation && (
                          <Badge variant={recommendationLabels[review.recommendation]?.variant}>
                            {recommendationLabels[review.recommendation]?.label}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {review.privateNotes && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                        {review.privateNotes}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Reviewed {format(new Date(review.createdAt), 'MMM d, yyyy')}
                      </span>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/events/${review.submission.event.slug}/submissions/${review.submissionId}`}>
                          View Submission
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
