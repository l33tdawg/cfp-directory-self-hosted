/**
 * Rating Bar Chart Component
 * 
 * Visual representation of review scores with color-coded progress bars.
 * Supports both horizontal and vertical orientations.
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface RatingBarChartProps {
  criteria: Record<string, number>;
  maxScore?: number;
  className?: string;
  showLabels?: boolean;
  orientation?: 'horizontal' | 'vertical';
  colorScheme?: 'default' | 'gradient' | 'performance';
}

export function RatingBarChart({
  criteria,
  maxScore = 5,
  className,
  showLabels = true,
  orientation = 'horizontal',
  colorScheme = 'default'
}: RatingBarChartProps) {
  const getScoreColor = (score: number, max: number) => {
    const percentage = (score / max) * 100;
    
    if (colorScheme === 'performance') {
      if (percentage >= 80) return 'bg-green-500';
      if (percentage >= 60) return 'bg-yellow-500';
      if (percentage >= 40) return 'bg-orange-500';
      return 'bg-red-500';
    }
    
    if (colorScheme === 'gradient') {
      if (percentage >= 80) return 'bg-gradient-to-r from-green-400 to-green-600';
      if (percentage >= 60) return 'bg-gradient-to-r from-blue-400 to-blue-600';
      if (percentage >= 40) return 'bg-gradient-to-r from-yellow-400 to-yellow-600';
      return 'bg-gradient-to-r from-red-400 to-red-600';
    }
    
    // Default scheme
    return 'bg-primary';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 4.5) return 'Excellent';
    if (score >= 4) return 'Very Good';
    if (score >= 3) return 'Good';
    if (score >= 2) return 'Fair';
    return 'Needs Work';
  };

  if (orientation === 'vertical') {
    return (
      <div className={cn("space-y-4", className)}>
        {Object.entries(criteria).map(([criterion, score]) => {
          const percentage = (score / maxScore) * 100;
          return (
            <div key={criterion} className="flex flex-col items-center space-y-2">
              <div className="w-8 h-32 bg-muted rounded-lg relative overflow-hidden">
                <div
                  className={cn(
                    "absolute bottom-0 left-0 right-0 rounded-lg transition-all duration-500 ease-out",
                    getScoreColor(score, maxScore)
                  )}
                  style={{ height: `${percentage}%` }}
                />
              </div>
              <div className="text-center">
                <div className="text-sm font-medium">{score}/{maxScore}</div>
                <div className="text-xs text-muted-foreground capitalize">
                  {criterion.replace(/_/g, ' ')}
                </div>
                {showLabels && (
                  <div className="text-xs text-muted-foreground">
                    {getScoreLabel(score)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {Object.entries(criteria).map(([criterion, score]) => {
        const percentage = (score / maxScore) * 100;
        return (
          <div key={criterion} className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium capitalize">
                {criterion.replace(/_/g, ' ')}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold">{score}/{maxScore}</span>
                {showLabels && (
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    {getScoreLabel(score)}
                  </span>
                )}
              </div>
            </div>
            <div className="relative">
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500 ease-out",
                    getScoreColor(score, maxScore)
                  )}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <div className="absolute inset-0 rounded-full border border-border/20" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface ReviewScoreSummaryProps {
  reviews: Array<{
    scores: Record<string, number>;
    reviewer?: { name?: string | null };
  }>;
  maxScore?: number;
  className?: string;
}

export function ReviewScoreSummary({ 
  reviews, 
  maxScore = 5, 
  className 
}: ReviewScoreSummaryProps) {
  // Calculate average scores across all reviews
  const criteriaAverages: Record<string, number> = {};
  const criteriaNames = new Set<string>();

  reviews.forEach(review => {
    Object.keys(review.scores).forEach(criterion => {
      criteriaNames.add(criterion);
    });
  });

  criteriaNames.forEach(criterion => {
    const scores = reviews
      .map(review => review.scores[criterion])
      .filter(score => typeof score === 'number');
    
    if (scores.length > 0) {
      criteriaAverages[criterion] = scores.reduce((a, b) => a + b, 0) / scores.length;
    }
  });

  const overallAverage = Object.values(criteriaAverages).length > 0
    ? Object.values(criteriaAverages).reduce((a, b) => a + b, 0) / Object.values(criteriaAverages).length
    : 0;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Review Summary</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Overall:</span>
          <span className="text-lg font-bold">{overallAverage.toFixed(1)}/{maxScore}</span>
        </div>
      </div>
      <RatingBarChart 
        criteria={criteriaAverages} 
        maxScore={maxScore}
        colorScheme="performance"
      />
      <div className="text-xs text-muted-foreground">
        Based on {reviews.length} review{reviews.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
