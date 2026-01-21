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
  HelpCircle
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
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <Label className="font-medium">{label}</Label>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <span className="text-sm font-medium">{value}/5</span>
      </div>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((score) => (
          <button
            key={score}
            type="button"
            onClick={() => onChange(score)}
            className="p-1 transition-transform hover:scale-110"
          >
            <Star
              className={`h-7 w-7 ${
                score <= value
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-slate-300 dark:text-slate-600'
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
  const [newReview, setNewReview] = useState({
    contentScore: userReview?.contentScore || 3,
    presentationScore: userReview?.presentationScore || 3,
    relevanceScore: userReview?.relevanceScore || 3,
    overallScore: userReview?.overallScore || 3,
    privateNotes: userReview?.privateNotes || '',
    publicNotes: userReview?.publicNotes || '',
    recommendation: userReview?.recommendation || 'NEUTRAL',
  });

  const hasExistingReview = Boolean(userReview);

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

  const otherReviews = reviews.filter(r => r.reviewer?.id !== currentUserId);

  return (
    <div className="space-y-6">
      {/* Add Review Button */}
      {!hasExistingReview && !isAddingReview && (
        <Button onClick={() => setIsAddingReview(true)} size="lg">
          <Plus className="h-4 w-4 mr-2" />
          Add Your Review
        </Button>
      )}

      {/* Review Form */}
      {(isAddingReview || isEditing) && (
        <Card className="border-2 border-primary">
          <CardHeader>
            <CardTitle>{hasExistingReview ? 'Edit Your Review' : 'Your Review'}</CardTitle>
            <CardDescription>
              Rate this submission based on the criteria below
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Scoring Criteria */}
            <div className="grid gap-6 md:grid-cols-2">
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

            <Separator />

            {/* Recommendation */}
            <div className="space-y-3">
              <Label className="font-medium">Your Recommendation</Label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {recommendationOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = newReview.recommendation === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setNewReview({ ...newReview, recommendation: opt.value })}
                      className={`p-3 rounded-lg border-2 text-center transition-all ${
                        isSelected 
                          ? `${opt.color} text-white border-transparent` 
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <Icon className={`h-5 w-5 mx-auto mb-1 ${isSelected ? 'text-white' : ''}`} />
                      <span className="text-xs font-medium block">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Notes */}
            <div className="space-y-4">
              <div>
                <Label className="font-medium">Private Notes</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Only visible to the review team, not the speaker
                </p>
                <Textarea
                  value={newReview.privateNotes}
                  onChange={(e) => setNewReview({ ...newReview, privateNotes: e.target.value })}
                  placeholder="Your detailed thoughts, concerns, or notes about this submission..."
                  className="min-h-[100px]"
                />
              </div>

              <div>
                <Label className="font-medium">Public Feedback (Optional)</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  This will be shared with the speaker if their submission is rejected
                </p>
                <Textarea
                  value={newReview.publicNotes}
                  onChange={(e) => setNewReview({ ...newReview, publicNotes: e.target.value })}
                  placeholder="Constructive feedback for the speaker..."
                  className="min-h-[80px]"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              <Button onClick={handleSubmitReview} disabled={api.isLoading}>
                {api.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {hasExistingReview ? 'Update Review' : 'Submit Review'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsAddingReview(false);
                  setIsEditing(false);
                }}
              >
                Cancel
              </Button>
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
          <h4 className="font-medium text-slate-700 dark:text-slate-300">
            Other Reviews ({otherReviews.length})
          </h4>
          {otherReviews.map((review) => {
            // Build scores object for the bar chart
            const reviewScores: Record<string, number> = {};
            if (review.contentScore) reviewScores['Content'] = review.contentScore;
            if (review.presentationScore) reviewScores['Presentation'] = review.presentationScore;
            if (review.relevanceScore) reviewScores['Relevance'] = review.relevanceScore;
            if (review.overallScore) reviewScores['Overall'] = review.overallScore;
            
            return (
              <Card key={review.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">
                        {review.reviewer?.name || review.reviewer?.email}
                      </CardTitle>
                      <CardDescription>
                        {format(new Date(review.createdAt), 'MMM d, yyyy')}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {review.overallScore && (
                        <Badge variant="outline">
                          <Star className="h-3 w-3 mr-1 fill-yellow-400 text-yellow-400" />
                          {review.overallScore}/5
                        </Badge>
                      )}
                      {review.recommendation && (
                        <Badge className={recommendationLabels[review.recommendation]?.color}>
                          {recommendationLabels[review.recommendation]?.label}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
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

                  {review.privateNotes && (
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
