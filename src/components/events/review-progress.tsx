'use client';

/**
 * Review Progress Component
 * 
 * Shows overall review progress and reviewer workload.
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CheckCircle2, Clock, Users } from 'lucide-react';

interface ReviewerWorkload {
  id: string;
  name: string | null;
  image: string | null;
  reviewCount: number;
  assignedCount: number;
}

interface ReviewProgressProps {
  totalSubmissions: number;
  reviewedSubmissions: number;
  totalReviews: number;
  reviewersWorkload?: ReviewerWorkload[];
  targetReviewsPerSubmission?: number;
}

export function ReviewProgress({
  totalSubmissions,
  reviewedSubmissions,
  totalReviews,
  reviewersWorkload = [],
  targetReviewsPerSubmission = 2,
}: ReviewProgressProps) {
  const progressPercentage = totalSubmissions > 0 
    ? Math.round((reviewedSubmissions / totalSubmissions) * 100) 
    : 0;
  
  const targetTotalReviews = totalSubmissions * targetReviewsPerSubmission;
  const reviewCoverage = targetTotalReviews > 0 
    ? Math.round((totalReviews / targetTotalReviews) * 100) 
    : 0;
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-purple-600" />
          <CardTitle className="text-lg">Review Progress</CardTitle>
        </div>
        <CardDescription>Track submission review completion</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Progress */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Submissions Reviewed</span>
            <span className="text-sm text-slate-500">
              {reviewedSubmissions} / {totalSubmissions}
            </span>
          </div>
          <Progress value={progressPercentage} className="h-3" />
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{progressPercentage}% complete</span>
            <span>{totalSubmissions - reviewedSubmissions} remaining</span>
          </div>
        </div>
        
        {/* Review Coverage */}
        <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Review Coverage</span>
            <Badge variant={reviewCoverage >= 100 ? 'default' : 'secondary'}>
              {totalReviews} / {targetTotalReviews} target
            </Badge>
          </div>
          <Progress 
            value={Math.min(reviewCoverage, 100)} 
            className="h-2" 
          />
          <p className="text-xs text-slate-500">
            Target: {targetReviewsPerSubmission} reviews per submission
          </p>
        </div>
        
        {/* Reviewer Workload */}
        {reviewersWorkload.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Reviewer Workload</h4>
            <div className="space-y-2">
              {reviewersWorkload.map((reviewer) => {
                const initials = reviewer.name
                  ? reviewer.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                  : 'U';
                
                return (
                  <div 
                    key={reviewer.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={reviewer.image || undefined} />
                      <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {reviewer.name || 'Unknown'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {reviewer.reviewCount} reviews
                      </Badge>
                      {reviewer.reviewCount >= reviewer.assignedCount ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <Clock className="h-4 w-4 text-yellow-500" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {reviewersWorkload.length === 0 && (
          <div className="text-center py-4 text-sm text-slate-500">
            No reviewers assigned yet
          </div>
        )}
      </CardContent>
    </Card>
  );
}
