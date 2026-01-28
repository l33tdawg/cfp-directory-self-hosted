'use client';

/**
 * AI Review Panel Component
 *
 * Renders in the submission.review.panel slot to display
 * AI-generated analysis results for a submission.
 */

import React, { useEffect, useState } from 'react';
import type { PluginComponentProps } from '@/lib/plugins';

interface AiAnalysis {
  contentScore: number;
  presentationScore: number;
  relevanceScore: number;
  originalityScore: number;
  overallScore: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  recommendation: string;
}

interface AiReviewData {
  submissionId: string;
  analysis: AiAnalysis;
  analyzedAt: string;
  provider: string;
  model: string;
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function ScoreBar({ label, score }: { label: string; score: number }) {
  const percentage = (score / 5) * 100;
  const color =
    score >= 4
      ? 'bg-green-500'
      : score >= 3
        ? 'bg-yellow-500'
        : 'bg-red-500';

  return (
    <div className="flex items-center gap-3 text-sm" data-testid={`score-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <span className="w-32 text-muted-foreground">{label}</span>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="w-8 text-right font-medium">{score}/5</span>
    </div>
  );
}

function RecommendationBadge({ recommendation }: { recommendation: string }) {
  const styles: Record<string, string> = {
    STRONG_ACCEPT: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    ACCEPT: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
    NEUTRAL: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    REJECT: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    STRONG_REJECT: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };

  const labels: Record<string, string> = {
    STRONG_ACCEPT: 'Strong Accept',
    ACCEPT: 'Accept',
    NEUTRAL: 'Neutral',
    REJECT: 'Reject',
    STRONG_REJECT: 'Strong Reject',
  };

  const style = styles[recommendation] || styles.NEUTRAL;
  const label = labels[recommendation] || recommendation;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style}`}
      data-testid="ai-recommendation"
    >
      {label}
    </span>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function AiReviewPanel({ context, data }: PluginComponentProps) {
  const [reviewData, setReviewData] = useState<AiReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const submissionId = data?.submissionId as string | undefined;

  useEffect(() => {
    if (!submissionId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadReview() {
      try {
        // Look for completed AI review jobs for this submission
        const jobs = await context.jobs!.getJobs('completed', 10);
        const reviewJob = jobs.find(
          (j) =>
            j.type === 'ai-review' &&
            (j.result as Record<string, unknown>)?.data &&
            ((j.result as Record<string, unknown>).data as AiReviewData)?.submissionId === submissionId
        );

        if (cancelled) return;

        if (reviewJob?.result) {
          const result = reviewJob.result as { data?: AiReviewData };
          if (result.data) {
            setReviewData(result.data);
          }
        }

        // Check for pending/running jobs
        if (!reviewJob) {
          const pendingJobs = await context.jobs!.getJobs('pending', 10);
          const runningJobs = await context.jobs!.getJobs('running', 10);
          const allPending = [...pendingJobs, ...runningJobs];
          const hasPending = allPending.some(
            (j) =>
              j.type === 'ai-review' &&
              (j.payload as Record<string, unknown>)?.submissionId === submissionId
          );

          if (cancelled) return;

          if (hasPending) {
            setError('AI review is still processing...');
          }
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load AI review');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadReview();

    return () => {
      cancelled = true;
    };
  }, [submissionId, context.jobs]);

  // No submission context
  if (!submissionId) {
    return null;
  }

  // Loading state
  if (loading) {
    return (
      <div className="border rounded-lg p-4" data-testid="ai-review-loading">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Loading AI review...
        </div>
      </div>
    );
  }

  // Processing state
  if (error === 'AI review is still processing...') {
    return (
      <div className="border rounded-lg p-4" data-testid="ai-review-processing">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          AI review is being generated...
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="border border-destructive/50 rounded-lg p-4" data-testid="ai-review-error">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  // No review available
  if (!reviewData) {
    return (
      <div className="border rounded-lg p-4" data-testid="ai-review-empty">
        <p className="text-sm text-muted-foreground">
          No AI review available for this submission.
        </p>
      </div>
    );
  }

  // Render the full review
  const { analysis, analyzedAt, provider, model } = reviewData;

  return (
    <div className="border rounded-lg p-4 space-y-4" data-testid="ai-review-panel">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">AI Review</h3>
        <RecommendationBadge recommendation={analysis.recommendation} />
      </div>

      {/* Summary */}
      <p className="text-sm text-muted-foreground" data-testid="ai-review-summary">
        {analysis.summary}
      </p>

      {/* Scores */}
      <div className="space-y-2">
        <ScoreBar label="Content" score={analysis.contentScore} />
        <ScoreBar label="Presentation" score={analysis.presentationScore} />
        <ScoreBar label="Relevance" score={analysis.relevanceScore} />
        <ScoreBar label="Originality" score={analysis.originalityScore} />
        <ScoreBar label="Overall" score={analysis.overallScore} />
      </div>

      {/* Strengths */}
      {analysis.strengths.length > 0 && (
        <div data-testid="ai-review-strengths">
          <h4 className="text-xs font-medium uppercase text-muted-foreground mb-1">
            Strengths
          </h4>
          <ul className="text-sm space-y-1">
            {analysis.strengths.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-green-500 shrink-0">+</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Weaknesses */}
      {analysis.weaknesses.length > 0 && (
        <div data-testid="ai-review-weaknesses">
          <h4 className="text-xs font-medium uppercase text-muted-foreground mb-1">
            Weaknesses
          </h4>
          <ul className="text-sm space-y-1">
            {analysis.weaknesses.map((w, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-red-500 shrink-0">-</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Suggestions */}
      {analysis.suggestions.length > 0 && (
        <div data-testid="ai-review-suggestions">
          <h4 className="text-xs font-medium uppercase text-muted-foreground mb-1">
            Suggestions
          </h4>
          <ul className="text-sm space-y-1">
            {analysis.suggestions.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-blue-500 shrink-0">*</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Footer */}
      <div className="text-xs text-muted-foreground pt-2 border-t flex justify-between" data-testid="ai-review-footer">
        <span>
          Analyzed by {provider}/{model}
        </span>
        <span>{new Date(analyzedAt).toLocaleDateString()}</span>
      </div>
    </div>
  );
}
