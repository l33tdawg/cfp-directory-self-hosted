/**
 * Submission Review Section (Client Component)
 * 
 * Displays reviews for a submission and allows reviewers to add/edit reviews.
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useApi } from '@/hooks/use-api';
import { toast } from 'sonner';
import { Star, Plus, Loader2 } from 'lucide-react';
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

export function SubmissionReviewSection({
  eventId,
  submissionId,
  reviews,
  userReview,
  currentUserId,
}: SubmissionReviewSectionProps) {
  const api = useApi();
  const [isAddingReview, setIsAddingReview] = useState(false);
  const [newReview, setNewReview] = useState({
    overallScore: 3,
    privateNotes: '',
    recommendation: 'NEUTRAL',
  });

  const hasExistingReview = Boolean(userReview);

  const handleAddReview = async () => {
    const { error } = await api.post(
      `/api/events/${eventId}/submissions/${submissionId}/reviews`,
      newReview
    );

    if (error) return;

    toast.success('Review submitted');
    setIsAddingReview(false);
    // Refresh page to show new review
    window.location.reload();
  };

  const recommendationLabels: Record<string, { label: string; color: string }> = {
    STRONG_ACCEPT: { label: 'Strong Accept', color: 'bg-green-500' },
    ACCEPT: { label: 'Accept', color: 'bg-green-400' },
    NEUTRAL: { label: 'Neutral', color: 'bg-slate-400' },
    REJECT: { label: 'Reject', color: 'bg-red-400' },
    STRONG_REJECT: { label: 'Strong Reject', color: 'bg-red-500' },
  };

  return (
    <div className="space-y-4">
      {/* Add Review Button */}
      {!hasExistingReview && !isAddingReview && (
        <Button onClick={() => setIsAddingReview(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Review
        </Button>
      )}

      {/* Add Review Form */}
      {isAddingReview && (
        <Card>
          <CardHeader>
            <CardTitle>Your Review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Score */}
            <div>
              <Label>Overall Score</Label>
              <div className="flex items-center gap-1 mt-2">
                {[1, 2, 3, 4, 5].map((score) => (
                  <button
                    key={score}
                    onClick={() => setNewReview({ ...newReview, overallScore: score })}
                    className="p-1"
                  >
                    <Star
                      className={`h-6 w-6 ${
                        score <= newReview.overallScore
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-slate-300'
                      }`}
                    />
                  </button>
                ))}
                <span className="ml-2 text-sm text-slate-500">
                  {newReview.overallScore}/5
                </span>
              </div>
            </div>

            {/* Recommendation */}
            <div>
              <Label>Recommendation</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {Object.entries(recommendationLabels).map(([value, { label, color }]) => (
                  <Button
                    key={value}
                    variant={newReview.recommendation === value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setNewReview({ ...newReview, recommendation: value })}
                    className={newReview.recommendation === value ? color : ''}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Private Notes */}
            <div>
              <Label>Private Notes (visible only to review team)</Label>
              <Textarea
                value={newReview.privateNotes}
                onChange={(e) => setNewReview({ ...newReview, privateNotes: e.target.value })}
                placeholder="Your thoughts on this submission..."
                className="mt-2"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button onClick={handleAddReview} disabled={api.isLoading}>
                {api.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Review
              </Button>
              <Button variant="outline" onClick={() => setIsAddingReview(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* User's Existing Review */}
      {userReview && (
        <Card className="border-blue-500 border-2">
          <CardHeader>
            <CardTitle className="text-sm">Your Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-3">
              {userReview.overallScore && (
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{userReview.overallScore}/5</span>
                </div>
              )}
              {userReview.recommendation && (
                <Badge className={recommendationLabels[userReview.recommendation]?.color}>
                  {recommendationLabels[userReview.recommendation]?.label}
                </Badge>
              )}
            </div>
            {userReview.privateNotes && (
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                {userReview.privateNotes}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Other Reviews */}
      {reviews.filter(r => r.reviewer?.id !== currentUserId).length > 0 ? (
        <div className="space-y-4">
          <h4 className="font-medium text-slate-700 dark:text-slate-300">Other Reviews</h4>
          {reviews
            .filter(r => r.reviewer?.id !== currentUserId)
            .map((review) => (
            <Card key={review.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-medium">
                      {review.reviewer?.name || review.reviewer?.email}
                    </p>
                    <p className="text-sm text-slate-500">
                      {format(new Date(review.createdAt), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {review.overallScore && (
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">{review.overallScore}/5</span>
                      </div>
                    )}
                    {review.recommendation && (
                      <Badge className={recommendationLabels[review.recommendation]?.color}>
                        {recommendationLabels[review.recommendation]?.label}
                      </Badge>
                    )}
                  </div>
                </div>

                {review.privateNotes && (
                  <p className="text-slate-600 dark:text-slate-400 text-sm">
                    {review.privateNotes}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        !isAddingReview && !userReview && (
          <div className="text-center py-8 text-slate-500">
            No reviews yet. Be the first to review!
          </div>
        )
      )}
    </div>
  );
}
