/**
 * Submission Review Section (Client Component)
 * 
 * Displays reviews for a submission and allows reviewers to add/edit reviews.
 * Features detailed scoring criteria, recommendation options, and visual bar charts.
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { RatingBarChart } from '@/components/ui/rating-bar-chart';
import { useApi } from '@/hooks/use-api';
import { toast } from 'sonner';
import { 
  Star, 
  Plus, 
  Loader2, 
  ThumbsUp,
  ThumbsDown,
  Minus,
  CheckCircle2,
  XCircle,
  HelpCircle,
  MessageSquare
} from 'lucide-react';
import { format } from 'date-fns';

interface Review {
  id: string;
  contentScore?: number | null;
  presentationScore?: number | null;
  relevanceScore?: number | null;
  overallScore?: number | null;
  privateNotes?: string | null;
  publicNotes?: string | null;
  recommendation?: string | null;
  createdAt: Date;
  reviewer?: {
    id: string;
    name?: string | null;
    email: string;
    image?: string | null;
  };
  discussions?: unknown[];
}

interface SubmissionReviewSectionProps {
  eventId: string;
  submissionId: string;
  reviews: Review[];
  userReview?: Review;
  currentUserId: string;
}

// Scoring criteria definitions
const scoringCriteria = {
  content: {
    label: 'Content Quality',
    description: 'Is the topic well-defined? Is the content technically accurate and valuable?',
  },
  presentation: {
    label: 'Presentation Skills',
    description: 'Is the abstract well-written? Does the speaker seem capable of delivering this talk?',
  },
  relevance: {
    label: 'Relevance',
    description: 'Is this topic relevant to the event audience? Is it timely?',
  },
  overall: {
    label: 'Overall Assessment',
    description: 'Your overall impression of this submission.',
  },
};

const recommendationOptions = [
  { 
    value: 'STRONG_ACCEPT', 
    label: 'Strong Accept', 
    icon: CheckCircle2,
    color: 'bg-green-600 hover:bg-green-700',
    description: 'Excellent submission, must include'
  },
  { 
    value: 'ACCEPT', 
    label: 'Accept', 
    icon: ThumbsUp,
    color: 'bg-green-500 hover:bg-green-600',
    description: 'Good submission, should include'
  },
  { 
    value: 'NEUTRAL', 
    label: 'Neutral', 
    icon: Minus,
    color: 'bg-slate-500 hover:bg-slate-600',
    description: 'Could go either way'
  },
  { 
    value: 'REJECT', 
    label: 'Reject', 
    icon: ThumbsDown,
    color: 'bg-red-500 hover:bg-red-600',
    description: 'Not a good fit'
  },
  { 
    value: 'STRONG_REJECT', 
    label: 'Strong Reject', 
    icon: XCircle,
    color: 'bg-red-600 hover:bg-red-700',
    description: 'Definitely should not include'
  },
];

function ScoreSelector({ 
  value, 
  onChange, 
  label, 
  description 
}: { 
  value: number; 
  onChange: (v: number) => void; 
  label: string; 
  description: string;
}) {
  const isRated = value > 0;
  
  return (
    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <Label className="font-semibold text-slate-900 dark:text-white">{label}</Label>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
        </div>
        <div className={`
          px-2.5 py-1 rounded-full text-xs font-semibold
          ${isRated 
            ? value >= 4 
              ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400' 
              : value >= 3 
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400'
                : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400'
            : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
          }
        `}>
          {isRated ? `${value}/5` : 'Not rated'}
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((score) => (
          <button
            key={score}
            type="button"
            onClick={() => onChange(score)}
            className="p-1.5 transition-all duration-150 hover:scale-110 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <Star
              className={`h-8 w-8 transition-colors ${
                score <= value
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-slate-300 dark:text-slate-600 hover:text-amber-300'
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

export function SubmissionReviewSection({
  eventId,
  submissionId,
  reviews,
  userReview,
  currentUserId,
}: SubmissionReviewSectionProps) {
  const api = useApi();
  const [isAddingReview, setIsAddingReview] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Initialize with null/0 for new reviews, or existing values for editing
  const [newReview, setNewReview] = useState({
    contentScore: userReview?.contentScore ?? 0,
    presentationScore: userReview?.presentationScore ?? 0,
    relevanceScore: userReview?.relevanceScore ?? 0,
    overallScore: userReview?.overallScore ?? 0,
    privateNotes: userReview?.privateNotes || '',
    publicNotes: userReview?.publicNotes || '',
    recommendation: userReview?.recommendation || '',
  });

  const hasExistingReview = Boolean(userReview);
  
  // Check if all scores are filled
  const allScoresFilled = newReview.contentScore > 0 && 
    newReview.presentationScore > 0 && 
    newReview.relevanceScore > 0 && 
    newReview.overallScore > 0;
  
  // Check if recommendation is selected
  const hasRecommendation = newReview.recommendation !== '';

  const handleSubmitReview = async () => {
    const endpoint = hasExistingReview && isEditing
      ? `/api/events/${eventId}/submissions/${submissionId}/reviews/${userReview!.id}`
      : `/api/events/${eventId}/submissions/${submissionId}/reviews`;
    
    const method = hasExistingReview && isEditing ? 'PATCH' : 'POST';

    const response = method === 'POST' 
      ? await api.post(endpoint, newReview)
      : await api.patch(endpoint, newReview);

    if (response.error) return;

    toast.success(hasExistingReview ? 'Review updated' : 'Review submitted');
    setIsAddingReview(false);
    setIsEditing(false);
    window.location.reload();
  };

  const recommendationLabels: Record<string, { label: string; color: string }> = {
    STRONG_ACCEPT: { label: 'Strong Accept', color: 'bg-green-600' },
    ACCEPT: { label: 'Accept', color: 'bg-green-500' },
    NEUTRAL: { label: 'Neutral', color: 'bg-slate-500' },
    REJECT: { label: 'Reject', color: 'bg-red-500' },
    STRONG_REJECT: { label: 'Strong Reject', color: 'bg-red-600' },
  };

  // Helper to detect AI reviews and parse their structured data
  const isAiReview = (review: Review) => {
    return review.reviewer?.name === 'AI Paper Reviewer' ||
           review.privateNotes?.startsWith('## AI Analysis Summary');
  };

  // Parse AI review markdown into structured data
  const parseAiReviewNotes = (privateNotes: string | null | undefined): {
    summary: string | null;
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
    confidence: number | null;
    model: string | null;
  } => {
    if (!privateNotes) return { summary: null, strengths: [], weaknesses: [], suggestions: [], confidence: null, model: null };

    const result = {
      summary: null as string | null,
      strengths: [] as string[],
      weaknesses: [] as string[],
      suggestions: [] as string[],
      confidence: null as number | null,
      model: null as string | null,
    };

    const lines = privateNotes.split('\n');
    let currentSection = '';

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed === '## AI Analysis Summary') {
        currentSection = 'summary';
        continue;
      } else if (trimmed === '### Strengths') {
        currentSection = 'strengths';
        continue;
      } else if (trimmed === '### Weaknesses') {
        currentSection = 'weaknesses';
        continue;
      } else if (trimmed === '### Suggestions') {
        currentSection = 'suggestions';
        continue;
      } else if (trimmed === '---') {
        currentSection = 'meta';
        continue;
      }

      if (currentSection === 'summary' && trimmed && !trimmed.startsWith('#')) {
        result.summary = trimmed;
      } else if (currentSection === 'strengths' && trimmed.startsWith('- ')) {
        result.strengths.push(trimmed.slice(2));
      } else if (currentSection === 'weaknesses' && trimmed.startsWith('- ')) {
        result.weaknesses.push(trimmed.slice(2));
      } else if (currentSection === 'suggestions' && trimmed.startsWith('- ')) {
        result.suggestions.push(trimmed.slice(2));
      } else if (currentSection === 'meta') {
        const confidenceMatch = trimmed.match(/\*Confidence:\s*(\d+)%\*/);
        const modelMatch = trimmed.match(/\*Model:\s*(.+)\*/);
        if (confidenceMatch) result.confidence = parseInt(confidenceMatch[1], 10);
        if (modelMatch) result.model = modelMatch[1];
      }
    }

    return result;
  };

  const otherReviews = reviews.filter(r => r.reviewer?.id !== currentUserId);

  return (
    <div className="space-y-6">
      {/* Add Review Prompt */}
      {!hasExistingReview && !isAddingReview && (
        <Card className="border-2 border-dashed border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/20">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <div className="w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center mb-4">
              <Star className="h-7 w-7 text-blue-500" />
            </div>
            <h3 className="font-semibold text-lg text-slate-900 dark:text-white mb-1">
              You haven&apos;t reviewed this submission yet
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 text-center max-w-md">
              Share your assessment to help make a decision on this submission
            </p>
            <Button onClick={() => setIsAddingReview(true)} size="lg" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Your Review
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Review Form */}
      {(isAddingReview || isEditing) && (
        <Card className="border-2 border-blue-500 dark:border-blue-400 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-b">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                <Star className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">
                  {hasExistingReview ? 'Edit Your Review' : 'Add Your Review'}
                </CardTitle>
                <CardDescription>
                  {hasExistingReview 
                    ? 'Update your scores and feedback below'
                    : 'Rate this submission on each criteria (click the stars)'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {/* Progress indicator */}
            {!hasExistingReview && (
              <div className="flex items-center gap-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                <div className="flex-shrink-0">
                  <HelpCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    <strong>Review progress:</strong>{' '}
                    {allScoresFilled && hasRecommendation 
                      ? 'All criteria rated! Ready to submit.'
                      : `Rate all ${4 - [newReview.contentScore, newReview.presentationScore, newReview.relevanceScore, newReview.overallScore].filter(s => s > 0).length} remaining criteria and select a recommendation`
                    }
                  </p>
                </div>
              </div>
            )}
            
            {/* Scoring Criteria */}
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-500" />
                Scoring Criteria
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <ScoreSelector
                  value={newReview.contentScore}
                  onChange={(v) => setNewReview({ ...newReview, contentScore: v })}
                  label={scoringCriteria.content.label}
                  description={scoringCriteria.content.description}
                />
                <ScoreSelector
                  value={newReview.presentationScore}
                  onChange={(v) => setNewReview({ ...newReview, presentationScore: v })}
                  label={scoringCriteria.presentation.label}
                  description={scoringCriteria.presentation.description}
                />
                <ScoreSelector
                  value={newReview.relevanceScore}
                  onChange={(v) => setNewReview({ ...newReview, relevanceScore: v })}
                  label={scoringCriteria.relevance.label}
                  description={scoringCriteria.relevance.description}
                />
                <ScoreSelector
                  value={newReview.overallScore}
                  onChange={(v) => setNewReview({ ...newReview, overallScore: v })}
                  label={scoringCriteria.overall.label}
                  description={scoringCriteria.overall.description}
                />
              </div>
            </div>

            <Separator />

            {/* Recommendation */}
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <ThumbsUp className="h-4 w-4 text-green-500" />
                Your Recommendation
                {!hasRecommendation && (
                  <Badge variant="outline" className="text-amber-600 border-amber-300 ml-2">
                    Required
                  </Badge>
                )}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {recommendationOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = newReview.recommendation === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setNewReview({ ...newReview, recommendation: opt.value })}
                      className={`p-3 rounded-xl border-2 text-center transition-all duration-200 ${
                        isSelected 
                          ? `${opt.color} text-white border-transparent shadow-lg scale-105` 
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Icon className={`h-5 w-5 mx-auto mb-1 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
                      <span className="text-xs font-medium block">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Notes */}
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <Label className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
                  <MessageSquare className="h-4 w-4 text-slate-500" />
                  Private Notes
                </Label>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                  Only visible to the review team, not the speaker
                </p>
                <Textarea
                  value={newReview.privateNotes}
                  onChange={(e) => setNewReview({ ...newReview, privateNotes: e.target.value })}
                  placeholder="Your detailed thoughts, concerns, or notes about this submission..."
                  className="min-h-[100px] resize-none"
                />
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <Label className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
                  <MessageSquare className="h-4 w-4 text-slate-500" />
                  Public Feedback
                  <Badge variant="outline" className="text-slate-500 ml-1">Optional</Badge>
                </Label>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                  This will be shared with the speaker if their submission is rejected
                </p>
                <Textarea
                  value={newReview.publicNotes}
                  onChange={(e) => setNewReview({ ...newReview, publicNotes: e.target.value })}
                  placeholder="Constructive feedback for the speaker..."
                  className="min-h-[80px] resize-none"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4 border-t">
              <Button 
                onClick={handleSubmitReview} 
                disabled={api.isLoading || !allScoresFilled || !hasRecommendation}
                size="lg"
                className="gap-2"
              >
                {api.isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {hasExistingReview ? 'Update Review' : 'Submit Review'}
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => {
                  setIsAddingReview(false);
                  setIsEditing(false);
                }}
              >
                Cancel
              </Button>
              {!allScoresFilled && (
                <span className="text-sm text-amber-600 dark:text-amber-400">
                  Please rate all criteria to submit
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* User's Existing Review */}
      {userReview && !isEditing && (
        <Card className="border-2 border-blue-500">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Your Review</CardTitle>
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                Edit Review
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Scores with bar chart */}
            {(() => {
              const userScores: Record<string, number> = {};
              if (userReview.contentScore) userScores['Content'] = userReview.contentScore;
              if (userReview.presentationScore) userScores['Presentation'] = userReview.presentationScore;
              if (userReview.relevanceScore) userScores['Relevance'] = userReview.relevanceScore;
              if (userReview.overallScore) userScores['Overall'] = userReview.overallScore;
              
              return Object.keys(userScores).length > 0 ? (
                <div>
                  <h5 className="text-sm font-medium mb-3">Your Scores</h5>
                  <RatingBarChart 
                    criteria={userScores}
                    maxScore={5}
                    colorScheme="performance"
                  />
                </div>
              ) : null;
            })()}

            {/* Recommendation */}
            {userReview.recommendation && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Recommendation:</span>
                <Badge className={recommendationLabels[userReview.recommendation]?.color}>
                  {recommendationLabels[userReview.recommendation]?.label}
                </Badge>
              </div>
            )}

            {/* Notes */}
            {userReview.privateNotes && (
              <div>
                <h5 className="text-sm font-medium mb-1">Private Notes</h5>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{userReview.privateNotes}</p>
              </div>
            )}
            
            {userReview.publicNotes && (
              <div>
                <h5 className="text-sm font-medium mb-1">Public Feedback</h5>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{userReview.publicNotes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Other Reviews */}
      {otherReviews.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-slate-900 dark:text-white">
              Other Reviews
            </h4>
            <Badge variant="secondary" className="font-medium">
              {otherReviews.length}
            </Badge>
          </div>
          {otherReviews.map((review) => {
            // Build scores object for the bar chart
            const reviewScores: Record<string, number> = {};
            if (review.contentScore) reviewScores['Content'] = review.contentScore;
            if (review.presentationScore) reviewScores['Presentation'] = review.presentationScore;
            if (review.relevanceScore) reviewScores['Relevance'] = review.relevanceScore;
            if (review.overallScore) reviewScores['Overall'] = review.overallScore;

            // Use the overall score directly instead of calculating an average
            // This ensures consistency between the badge display and the criteria breakdown
            const avgScore = review.overallScore ?? null;
            
            return (
              <Card key={review.id} className="overflow-hidden">
                <CardHeader className="pb-3 bg-slate-50 dark:bg-slate-800/50 border-b">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-600 dark:to-slate-700 flex items-center justify-center text-sm font-semibold text-slate-600 dark:text-slate-300">
                        {review.reviewer?.name?.charAt(0)?.toUpperCase() || review.reviewer?.email?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <CardTitle className="text-base">
                          {review.reviewer?.name || review.reviewer?.email || 'Anonymous'}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Reviewed {format(new Date(review.createdAt), 'MMM d, yyyy')}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {avgScore !== null && (
                        <Badge
                          variant="outline"
                          className={`font-semibold ${
                            avgScore >= 4
                              ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800'
                              : avgScore >= 3
                                ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'
                                : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
                          }`}
                        >
                          <Star className="h-3 w-3 mr-1 fill-current" />
                          {avgScore}/5
                        </Badge>
                      )}
                      {review.recommendation && (
                        <Badge className={`${recommendationLabels[review.recommendation]?.color} text-white`}>
                          {recommendationLabels[review.recommendation]?.label}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  {/* Score breakdown with bar chart */}
                  {Object.keys(reviewScores).length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium mb-3">Criteria Scores</h5>
                      <RatingBarChart 
                        criteria={reviewScores}
                        maxScore={5}
                        colorScheme="performance"
                        showLabels={false}
                      />
                    </div>
                  )}

                  {/* AI Review - Styled Display */}
                  {isAiReview(review) && review.privateNotes && (() => {
                    const parsed = parseAiReviewNotes(review.privateNotes);
                    return (
                      <div className="space-y-3">
                        {/* Summary */}
                        {parsed.summary && (
                          <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                            <h5 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Summary</h5>
                            <p className="text-sm text-slate-600 dark:text-slate-400">{parsed.summary}</p>
                          </div>
                        )}

                        {/* Strengths & Weaknesses Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {parsed.strengths.length > 0 && (
                            <div className="bg-green-50 dark:bg-green-950/30 p-3 rounded-lg border border-green-200 dark:border-green-800">
                              <h5 className="text-sm font-semibold text-green-700 dark:text-green-300 mb-2">Strengths</h5>
                              <ul className="list-disc list-inside space-y-1">
                                {parsed.strengths.map((s, i) => (
                                  <li key={i} className="text-sm text-slate-600 dark:text-slate-400">{s}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {parsed.weaknesses.length > 0 && (
                            <div className="bg-red-50 dark:bg-red-950/30 p-3 rounded-lg border border-red-200 dark:border-red-800">
                              <h5 className="text-sm font-semibold text-red-700 dark:text-red-300 mb-2">Weaknesses</h5>
                              <ul className="list-disc list-inside space-y-1">
                                {parsed.weaknesses.map((w, i) => (
                                  <li key={i} className="text-sm text-slate-600 dark:text-slate-400">{w}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        {/* Suggestions */}
                        {parsed.suggestions.length > 0 && (
                          <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                            <h5 className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-2">Suggestions</h5>
                            <ul className="list-disc list-inside space-y-1">
                              {parsed.suggestions.map((s, i) => (
                                <li key={i} className="text-sm text-slate-600 dark:text-slate-400">{s}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Confidence & Model */}
                        {(parsed.confidence !== null || parsed.model) && (
                          <div className="text-xs text-slate-500 dark:text-slate-500 pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center gap-4">
                            {parsed.confidence !== null && (
                              <span>
                                Confidence:{' '}
                                <span className={`font-medium ${
                                  parsed.confidence >= 70 ? 'text-green-600 dark:text-green-400' :
                                  parsed.confidence >= 50 ? 'text-yellow-600 dark:text-yellow-400' :
                                  'text-red-600 dark:text-red-400'
                                }`}>
                                  {parsed.confidence}%
                                </span>
                              </span>
                            )}
                            {parsed.model && <span>Model: {parsed.model}</span>}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Regular Review - Plain Text Display */}
                  {!isAiReview(review) && review.privateNotes && (
                    <div>
                      <h5 className="text-sm font-medium mb-1">Private Notes</h5>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {review.privateNotes}
                      </p>
                    </div>
                  )}

                  {review.publicNotes && (
                    <div>
                      <h5 className="text-sm font-medium mb-1">Public Feedback</h5>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {review.publicNotes}
                      </p>
                    </div>
                  )}

                  {!review.privateNotes && !review.publicNotes && Object.keys(reviewScores).length === 0 && (
                    <p className="text-sm text-muted-foreground">No review notes provided.</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {reviews.length === 0 && !isAddingReview && !userReview && (
        <div className="text-center py-8 text-muted-foreground">
          <HelpCircle className="h-12 w-12 mx-auto mb-4 text-slate-300" />
          <p>No reviews yet. Be the first to review this submission!</p>
        </div>
      )}
    </div>
  );
}
