'use client';

/**
 * AI Paper Reviewer Dashboard
 *
 * Main admin dashboard showing review stats, job queue status,
 * configuration status, review queue, and quick actions.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  LayoutDashboard,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  AlertTriangle,
  Settings,
  History,
  Sparkles,
  Loader2,
  Key,
  Bot,
  Play,
  PlayCircle,
  FileText,
  RotateCcw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { PluginComponentProps } from '@/lib/plugins';

interface JobStats {
  pending: number;
  running: number;
  completedToday: number;
  failedToday: number;
}

interface ReviewStats {
  totalReviews: number;
  successRate: number;
  averageScore: number;
}

interface AnalysisDetails {
  overallScore?: number;
  recommendation?: string;
  confidence?: number;
  summary?: string;
  strengths?: string[];
  weaknesses?: string[];
  suggestions?: string[];
  criteriaScores?: Record<string, number>;
}

interface RecentReview {
  id: string;
  title: string;
  submissionId: string | null;
  eventId: string | null;
  eventSlug: string | null;
  score: number | null;
  recommendation: string | null;
  status: string;
  completedAt: string | null;
  analysis: AnalysisDetails | null;
}

interface JobResultData {
  success?: boolean;
  data?: {
    submissionId?: string;
    eventSlug?: string;
    analysis?: AnalysisDetails;
    // Direct fields in data (some formats)
    overallScore?: number;
    recommendation?: string;
    confidence?: number;
    summary?: string;
    strengths?: string[];
    weaknesses?: string[];
    suggestions?: string[];
    criteriaScores?: Record<string, number>;
  };
  // Old format fields (direct on result)
  submissionId?: string;
  eventSlug?: string;
  analysis?: AnalysisDetails;
  // Very old format - direct on result
  overallScore?: number;
  recommendation?: string;
  confidence?: number;
  summary?: string;
  strengths?: string[];
  weaknesses?: string[];
  suggestions?: string[];
  criteriaScores?: Record<string, number>;
}

/**
 * Helper to extract analysis from job result (handles multiple formats)
 * Returns full analysis details for expandable view
 */
function getAnalysisFromJobResult(result: JobResultData | null): {
  score: number | null;
  recommendation: string | null;
  submissionId: string | null;
  eventSlug: string | null;
  analysis: AnalysisDetails | null;
} {
  const empty = { score: null, recommendation: null, submissionId: null, eventSlug: null, analysis: null };
  if (!result) return empty;

  // New format: result.data.analysis
  if (result.data?.analysis?.overallScore !== undefined) {
    return {
      score: result.data.analysis.overallScore,
      recommendation: result.data.analysis.recommendation ?? null,
      submissionId: result.data.submissionId ?? null,
      eventSlug: result.data.eventSlug ?? null,
      analysis: result.data.analysis,
    };
  }

  // Data direct format: result.data.overallScore
  if (result.data?.overallScore !== undefined) {
    const analysis: AnalysisDetails = {
      overallScore: result.data.overallScore,
      recommendation: result.data.recommendation,
      confidence: result.data.confidence,
      summary: result.data.summary,
      strengths: result.data.strengths,
      weaknesses: result.data.weaknesses,
      suggestions: result.data.suggestions,
      criteriaScores: result.data.criteriaScores,
    };
    return {
      score: result.data.overallScore,
      recommendation: result.data.recommendation ?? null,
      submissionId: result.data.submissionId ?? null,
      eventSlug: result.data.eventSlug ?? null,
      analysis,
    };
  }

  // Old format: result.analysis
  if (result.analysis?.overallScore !== undefined) {
    return {
      score: result.analysis.overallScore,
      recommendation: result.analysis.recommendation ?? null,
      submissionId: result.submissionId ?? null,
      eventSlug: result.eventSlug ?? null,
      analysis: result.analysis,
    };
  }

  // Very old format: direct on result
  if (result.overallScore !== undefined) {
    const analysis: AnalysisDetails = {
      overallScore: result.overallScore,
      recommendation: result.recommendation,
      confidence: result.confidence,
      summary: result.summary,
      strengths: result.strengths,
      weaknesses: result.weaknesses,
      suggestions: result.suggestions,
      criteriaScores: result.criteriaScores,
    };
    return {
      score: result.overallScore,
      recommendation: result.recommendation ?? null,
      submissionId: result.submissionId ?? null,
      eventSlug: result.eventSlug ?? null,
      analysis,
    };
  }

  return empty;
}

interface SubmissionWithReview {
  id: string;
  title: string;
  abstract: string;
  status: string;
  createdAt: string;
  eventId: string;
  event: { id: string; name: string };
  speaker: { id: string; name: string };
  aiReview: {
    status: 'unreviewed' | 'pending' | 'running' | 'reviewed';
    jobId?: string;
    score?: number | null;
    recommendation?: string | null;
    reviewedAt?: string | null;
  };
}

// Alias for backwards compatibility
type UnreviewedSubmission = SubmissionWithReview;

interface SubmissionStats {
  total: number;
  reviewed: number;
  pending: number;
  unreviewed: number;
}

interface ActiveJob {
  id: string;
  status: 'pending' | 'running';
  title: string;
  submissionId: string;
  createdAt: string;
  startedAt: string | null;
  attempts: number;
}

export function AdminDashboard({ context, data }: PluginComponentProps) {
  const pluginBasePath = (data?.pluginBasePath as string) || '/admin/plugins/pages';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jobStats, setJobStats] = useState<JobStats>({
    pending: 0,
    running: 0,
    completedToday: 0,
    failedToday: 0,
  });
  const [reviewStats, setReviewStats] = useState<ReviewStats>({
    totalReviews: 0,
    successRate: 0,
    averageScore: 0,
  });
  const [recentReviews, setRecentReviews] = useState<RecentReview[]>([]);
  const [unreviewedSubmissions, setUnreviewedSubmissions] = useState<UnreviewedSubmission[]>([]);
  const [submissionStats, setSubmissionStats] = useState<SubmissionStats>({
    total: 0,
    reviewed: 0,
    pending: 0,
    unreviewed: 0,
  });
  const [queueingAll, setQueueingAll] = useState(false);
  const [queueingIds, setQueueingIds] = useState<Set<string>>(new Set());
  const [apiKeyConfigured, setApiKeyConfigured] = useState<boolean | null>(null);
  const [activeJobs, setActiveJobs] = useState<ActiveJob[]>([]);
  const [expandedReviews, setExpandedReviews] = useState<Set<string>>(new Set());
  const [reReviewingIds, setReReviewingIds] = useState<Set<string>>(new Set());
  const [reReviewingAll, setReReviewingAll] = useState(false);

  // Password fields are redacted on client, so check via plugin data
  // Fall back to checking config.apiKey in case it's not redacted
  // Allow actions when status is unknown (null) - server will validate
  const hasApiKey = apiKeyConfigured === true || Boolean(context.config.apiKey);
  const apiKeyStatusKnown = apiKeyConfigured !== null || Boolean(context.config.apiKey);
  const provider = (context.config.aiProvider as string) || 'openai';
  const model = (context.config.model as string) || 'gpt-4o';

  // Fetch only active jobs (for auto-refresh without full loading state)
  const fetchActiveJobs = useCallback(async () => {
    try {
      const [pendingRes, runningRes, completedRes, failedRes] = await Promise.all([
        fetch(`/api/plugins/${context.pluginId}/jobs?status=pending&type=ai-review&limit=100`),
        fetch(`/api/plugins/${context.pluginId}/jobs?status=running&type=ai-review&limit=100`),
        fetch(`/api/plugins/${context.pluginId}/jobs?status=completed&type=ai-review&limit=100`),
        fetch(`/api/plugins/${context.pluginId}/jobs?status=failed&type=ai-review&limit=100`),
      ]);

      const [pendingData, runningData, completedData, failedData] = await Promise.all([
        pendingRes.json(),
        runningRes.json(),
        completedRes.json(),
        failedRes.json(),
      ]);

      const pendingJobs = pendingData.jobs || [];
      const runningJobs = runningData.jobs || [];
      const completedJobs = completedData.jobs || [];
      const failedJobs = failedData.jobs || [];

      // Calculate today's stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const completedToday = completedJobs.filter(
        (job: { completedAt: string }) =>
          job.completedAt && new Date(job.completedAt) >= today
      ).length;

      const failedToday = failedJobs.filter(
        (job: { completedAt: string }) =>
          job.completedAt && new Date(job.completedAt) >= today
      ).length;

      setJobStats({
        pending: pendingJobs.length,
        running: runningJobs.length,
        completedToday,
        failedToday,
      });

      // Extract active jobs for display
      const active: ActiveJob[] = [
        ...runningJobs.map((job: {
          id: string;
          payload: { title?: string; submissionId?: string };
          createdAt: string;
          startedAt?: string | null;
          attempts: number;
        }) => ({
          id: job.id,
          status: 'running' as const,
          title: job.payload.title || 'Untitled',
          submissionId: job.payload.submissionId || '',
          createdAt: job.createdAt,
          startedAt: job.startedAt || null,
          attempts: job.attempts,
        })),
        ...pendingJobs.slice(0, 5).map((job: {
          id: string;
          payload: { title?: string; submissionId?: string };
          createdAt: string;
          attempts: number;
        }) => ({
          id: job.id,
          status: 'pending' as const,
          title: job.payload.title || 'Untitled',
          submissionId: job.payload.submissionId || '',
          createdAt: job.createdAt,
          startedAt: null,
          attempts: job.attempts,
        })),
      ];
      setActiveJobs(active);

    } catch {
      // Silently fail - the full refresh will catch errors
    }
  }, [context.pluginId]);

  // Silent data refresh without showing loading spinner (for after actions)
  const refreshDataSilent = useCallback(async () => {
    try {
      const [submissionsRes] = await Promise.all([
        fetch(`/api/plugins/${context.pluginId}/submissions?limit=100`),
      ]);

      const submissionsData = submissionsRes.ok
        ? await submissionsRes.json()
        : { submissions: [], stats: { total: 0, reviewed: 0, pending: 0, unreviewed: 0 } };

      // Update submissions
      if (submissionsData.submissions) {
        const unreviewed = submissionsData.submissions.filter(
          (s: SubmissionWithReview) => s.aiReview.status === 'unreviewed'
        );
        setUnreviewedSubmissions(unreviewed.slice(0, 10));

        // Get reviewed submissions for re-review capability
        setSubmissionStats(submissionsData.stats);
      }

      // Also refresh job stats
      await fetchActiveJobs();
    } catch {
      // Silently fail
    }
  }, [context.pluginId, fetchActiveJobs]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch all job types, submissions, and config status in parallel
      const [pendingRes, runningRes, completedRes, failedRes, submissionsRes, configRes] = await Promise.all([
        fetch(`/api/plugins/${context.pluginId}/jobs?status=pending&type=ai-review&limit=100`),
        fetch(`/api/plugins/${context.pluginId}/jobs?status=running&type=ai-review&limit=100`),
        fetch(`/api/plugins/${context.pluginId}/jobs?status=completed&type=ai-review&limit=100`),
        fetch(`/api/plugins/${context.pluginId}/jobs?status=failed&type=ai-review&limit=100`),
        fetch(`/api/plugins/${context.pluginId}/submissions?limit=100`),
        fetch(`/api/plugins/${context.pluginId}/data/config/api-key-configured`),
      ]);

      // Check API key configuration status
      if (configRes.ok) {
        const configData = await configRes.json();
        setApiKeyConfigured(configData.value === true);
      }

      const [pendingData, runningData, completedData, failedData, submissionsData] = await Promise.all([
        pendingRes.json(),
        runningRes.json(),
        completedRes.json(),
        failedRes.json(),
        submissionsRes.ok ? submissionsRes.json() : { submissions: [], stats: { total: 0, reviewed: 0, pending: 0, unreviewed: 0 } },
      ]);

      const pendingJobs = pendingData.jobs || [];
      const runningJobs = runningData.jobs || [];
      const completedJobs = completedData.jobs || [];
      const failedJobs = failedData.jobs || [];

      // Calculate today's stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const completedToday = completedJobs.filter(
        (job: { completedAt: string }) =>
          job.completedAt && new Date(job.completedAt) >= today
      ).length;

      const failedToday = failedJobs.filter(
        (job: { completedAt: string }) =>
          job.completedAt && new Date(job.completedAt) >= today
      ).length;

      setJobStats({
        pending: pendingJobs.length,
        running: runningJobs.length,
        completedToday,
        failedToday,
      });

      // Extract active jobs (pending + running) for display
      const active: ActiveJob[] = [
        ...runningJobs.map((job: {
          id: string;
          payload: { title?: string; submissionId?: string };
          createdAt: string;
          startedAt?: string | null;
          attempts: number;
        }) => ({
          id: job.id,
          status: 'running' as const,
          title: job.payload.title || 'Untitled',
          submissionId: job.payload.submissionId || '',
          createdAt: job.createdAt,
          startedAt: job.startedAt || null,
          attempts: job.attempts,
        })),
        ...pendingJobs.slice(0, 5).map((job: {
          id: string;
          payload: { title?: string; submissionId?: string };
          createdAt: string;
          attempts: number;
        }) => ({
          id: job.id,
          status: 'pending' as const,
          title: job.payload.title || 'Untitled',
          submissionId: job.payload.submissionId || '',
          createdAt: job.createdAt,
          startedAt: null,
          attempts: job.attempts,
        })),
      ];
      setActiveJobs(active);

      // Calculate review stats using helper function
      const totalReviews = completedJobs.length + failedJobs.length;
      const successRate = totalReviews > 0 ? (completedJobs.length / totalReviews) * 100 : 0;

      let totalScore = 0;
      let scoreCount = 0;
      completedJobs.forEach((job: { result?: JobResultData }) => {
        const { score } = getAnalysisFromJobResult(job.result || null);
        if (typeof score === 'number') {
          totalScore += score;
          scoreCount++;
        }
      });
      const averageScore = scoreCount > 0 ? totalScore / scoreCount : 0;

      setReviewStats({
        totalReviews,
        successRate,
        averageScore,
      });

      // Get recent reviews with proper result parsing, deduplicated by submissionId
      const allReviews = completedJobs.map((job: {
        id: string;
        payload: { title?: string; submissionId?: string; eventId?: string; eventSlug?: string };
        status: string;
        completedAt: string | null;
        result?: JobResultData;
      }) => {
        const parsed = getAnalysisFromJobResult(job.result || null);
        return {
          id: job.id,
          title: job.payload.title || 'Untitled',
          submissionId: parsed.submissionId || job.payload.submissionId || null,
          eventId: job.payload.eventId || null,
          eventSlug: parsed.eventSlug || job.payload.eventSlug || null,
          score: parsed.score,
          recommendation: parsed.recommendation,
          status: job.status,
          completedAt: job.completedAt,
          analysis: parsed.analysis,
        };
      });

      // Deduplicate by submissionId, keeping only the most recent review for each
      const seenSubmissions = new Set<string>();
      const recent = allReviews.filter((review: RecentReview) => {
        if (!review.submissionId) return true; // Keep reviews without submissionId
        if (seenSubmissions.has(review.submissionId)) return false;
        seenSubmissions.add(review.submissionId);
        return true;
      }).slice(0, 10);

      setRecentReviews(recent);

      // Set submission data
      if (submissionsData.submissions) {
        const unreviewed = submissionsData.submissions.filter(
          (s: SubmissionWithReview) => s.aiReview.status === 'unreviewed'
        );
        setUnreviewedSubmissions(unreviewed.slice(0, 10)); // Show first 10

        // Get reviewed submissions for re-review capability
        setSubmissionStats(submissionsData.stats);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [context.pluginId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh active jobs section only (every 5 seconds)
  useEffect(() => {
    if (jobStats.running > 0 || jobStats.pending > 0) {
      const interval = setInterval(() => {
        fetchActiveJobs();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [jobStats.running, jobStats.pending, fetchActiveJobs]);

  const queueReview = async (submission: UnreviewedSubmission) => {
    setQueueingIds((prev) => new Set(prev).add(submission.id));

    try {
      const response = await fetch(`/api/plugins/${context.pluginId}/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'ai-review',
          payload: {
            submissionId: submission.id,
            eventId: submission.eventId,
            title: submission.title,
            abstract: submission.abstract,
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to queue review');
      }

      // Refresh data silently to show updated status without full page spinner
      await refreshDataSilent();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to queue review');
    } finally {
      setQueueingIds((prev) => {
        const next = new Set(prev);
        next.delete(submission.id);
        return next;
      });
    }
  };

  const queueAllUnreviewed = async () => {
    if (apiKeyStatusKnown && !hasApiKey) {
      setError('Please configure your API key before queuing reviews');
      return;
    }

    setQueueingAll(true);
    setError(null);

    try {
      // Queue all unreviewed submissions
      for (const submission of unreviewedSubmissions) {
        await fetch(`/api/plugins/${context.pluginId}/jobs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'ai-review',
            payload: {
              submissionId: submission.id,
              eventId: submission.eventId,
              title: submission.title,
              abstract: submission.abstract,
            },
          }),
        });
      }

      // Refresh data silently without full page spinner
      await refreshDataSilent();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to queue reviews');
    } finally {
      setQueueingAll(false);
    }
  };

  // Re-review a single submission from Recent Reviews
  const queueReReview = async (review: RecentReview) => {
    if (!review.submissionId) return;

    setReReviewingIds((prev) => new Set(prev).add(review.id));

    try {
      const response = await fetch(`/api/plugins/${context.pluginId}/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'ai-review',
          payload: {
            submissionId: review.submissionId,
            eventId: review.eventId,
            eventSlug: review.eventSlug,
            title: review.title,
            isReReview: true,
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to queue re-review');
      }

      // Refresh data silently
      await refreshDataSilent();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to queue re-review');
    } finally {
      setReReviewingIds((prev) => {
        const next = new Set(prev);
        next.delete(review.id);
        return next;
      });
    }
  };

  // Toggle expanded state for a review
  const toggleReviewExpanded = (reviewId: string) => {
    setExpandedReviews((prev) => {
      const next = new Set(prev);
      if (next.has(reviewId)) {
        next.delete(reviewId);
      } else {
        next.add(reviewId);
      }
      return next;
    });
  };

  // Re-review all recent reviews
  const queueAllReReviews = async () => {
    if (apiKeyStatusKnown && !hasApiKey) {
      setError('Please configure your API key before queuing reviews');
      return;
    }

    // Only re-review items that have a submissionId
    const reviewsWithSubmissions = recentReviews.filter(r => r.submissionId);
    if (reviewsWithSubmissions.length === 0) return;

    setReReviewingAll(true);
    setError(null);

    try {
      for (const review of reviewsWithSubmissions) {
        await fetch(`/api/plugins/${context.pluginId}/jobs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'ai-review',
            payload: {
              submissionId: review.submissionId,
              eventId: review.eventId,
              eventSlug: review.eventSlug,
              title: review.title,
              isReReview: true,
            },
          }),
        });
      }

      // Refresh data silently
      await refreshDataSilent();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to queue re-reviews');
    } finally {
      setReReviewingAll(false);
    }
  };

  const getRecommendationColor = (rec: string | null) => {
    if (!rec) return 'text-slate-500';
    if (rec.includes('ACCEPT')) return 'text-green-600 dark:text-green-400';
    if (rec.includes('REJECT')) return 'text-red-600 dark:text-red-400';
    return 'text-yellow-600 dark:text-yellow-400';
  };

  return (
    <div className="space-y-6" data-testid="admin-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            AI Paper Reviewer Dashboard
          </h1>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
          data-testid="refresh-button"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600 dark:text-purple-400" />
        </div>
      ) : (
        <>
          {/* Configuration Status */}
          <div
            className={`p-4 rounded-lg border ${
              hasApiKey
                ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800'
                : apiKeyStatusKnown
                  ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
                  : 'bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700'
            }`}
            data-testid="config-status"
          >
            <div className="flex items-center gap-3">
              {hasApiKey ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <div>
                    <p className="text-sm font-medium text-green-800 dark:text-green-200">
                      API Configured
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400">
                      Using {provider} / {model}
                    </p>
                  </div>
                </>
              ) : apiKeyStatusKnown ? (
                <>
                  <Key className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  <div>
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                      API Key Not Configured
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Configure your API key in the plugin settings to enable reviews
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <Key className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Using {provider} / {model}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Click Review on a submission to verify your API key configuration
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Submission Stats Card */}
            <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg" data-testid="submission-stats-card">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Submissions
                </h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Total</span>
                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                    {submissionStats.total}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-green-600 dark:text-green-400">Reviewed</span>
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">
                    {submissionStats.reviewed}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-amber-600 dark:text-amber-400">Unreviewed</span>
                  <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                    {submissionStats.unreviewed}
                  </span>
                </div>
              </div>
            </div>

            {/* Review Stats Card */}
            <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg" data-testid="review-stats-card">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Review Stats
                </h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Total Reviews</span>
                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                    {reviewStats.totalReviews}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Success Rate</span>
                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                    {reviewStats.successRate.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Avg Score</span>
                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                    {reviewStats.averageScore > 0 ? `${reviewStats.averageScore.toFixed(1)}/5` : '-'}
                  </span>
                </div>
              </div>
            </div>

            {/* Job Queue Card */}
            <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg" data-testid="job-queue-card">
              <div className="flex items-center gap-2 mb-3">
                <Bot className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Job Queue
                </h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Pending
                  </span>
                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                    {jobStats.pending}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Loader2 className="h-3 w-3" /> Running
                  </span>
                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                    {jobStats.running}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> Today
                  </span>
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">
                    {jobStats.completedToday}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                    <XCircle className="h-3 w-3" /> Failed Today
                  </span>
                  <span className="text-sm font-medium text-red-600 dark:text-red-400">
                    {jobStats.failedToday}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions Card */}
            <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg" data-testid="quick-actions-card">
              <div className="flex items-center gap-2 mb-3">
                <Settings className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Quick Actions
                </h3>
              </div>
              <div className="flex flex-col gap-2">
                <a
                  href={`${pluginBasePath}/ai-paper-reviewer/history`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <History className="h-4 w-4" />
                  History
                </a>
                <a
                  href={`${pluginBasePath}/ai-paper-reviewer/personas`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <Sparkles className="h-4 w-4" />
                  Personas
                </a>
                <a
                  href={`/admin/plugins/${context.pluginId}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </a>
              </div>
            </div>
          </div>

          {/* Jobs in Progress - Active Jobs */}
          {activeJobs.length > 0 && (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg" data-testid="jobs-in-progress">
              <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 text-blue-600 dark:text-blue-400 animate-spin" />
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Jobs in Progress ({activeJobs.length})
                    </h3>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Auto-refreshing every 5s
                  </span>
                </div>
              </div>
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {activeJobs.map((job) => (
                  <div
                    key={job.id}
                    className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {job.status === 'running' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Analyzing
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                            <Clock className="h-3 w-3" />
                            Queued
                          </span>
                        )}
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                          {job.title}
                        </p>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                        <span>
                          {job.status === 'running' ? 'Started' : 'Queued'}{' '}
                          {new Date(job.status === 'running' && job.startedAt ? job.startedAt : job.createdAt).toLocaleTimeString()}
                        </span>
                        {job.attempts > 1 && (
                          <span className="text-amber-600 dark:text-amber-400">
                            Attempt {job.attempts}
                          </span>
                        )}
                      </div>
                    </div>
                    {job.status === 'running' && (
                      <div className="ml-4 flex items-center gap-2">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Review Queue - Unreviewed Submissions */}
          {submissionStats.unreviewed > 0 && (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg" data-testid="review-queue">
              <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Review Queue ({submissionStats.unreviewed} unreviewed)
                    </h3>
                  </div>
                  {(hasApiKey || !apiKeyStatusKnown) && unreviewedSubmissions.length > 0 && (
                    <button
                      onClick={queueAllUnreviewed}
                      disabled={queueingAll}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md disabled:opacity-50 transition-colors"
                    >
                      {queueingAll ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <PlayCircle className="h-4 w-4" />
                      )}
                      Review All ({unreviewedSubmissions.length})
                    </button>
                  )}
                </div>
              </div>
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {unreviewedSubmissions.map((submission) => (
                  <div
                    key={submission.id}
                    className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {submission.title}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {submission.event.name} | {submission.speaker.name} | {new Date(submission.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => queueReview(submission)}
                      disabled={(apiKeyStatusKnown && !hasApiKey) || queueingIds.has(submission.id)}
                      className="ml-4 flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-md hover:bg-purple-50 dark:hover:bg-purple-950/50 disabled:opacity-50 transition-colors"
                    >
                      {queueingIds.has(submission.id) ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                      Review
                    </button>
                  </div>
                ))}
                {submissionStats.unreviewed > 10 && (
                  <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">
                    Showing first 10 of {submissionStats.unreviewed} unreviewed submissions
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recent Reviews - Expandable with Re-review */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg" data-testid="recent-activity">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Recent Reviews ({recentReviews.length})
                  </h3>
                </div>
                {recentReviews.length > 0 && (hasApiKey || !apiKeyStatusKnown) && (
                  <button
                    onClick={queueAllReReviews}
                    disabled={reReviewingAll || recentReviews.filter(r => r.submissionId).length === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950/50 disabled:opacity-50 transition-colors"
                  >
                    {reReviewingAll ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RotateCcw className="h-4 w-4" />
                    )}
                    Re-review All
                  </button>
                )}
              </div>
            </div>
            {recentReviews.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                No reviews completed yet. Reviews will appear here once submissions are analyzed.
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {recentReviews.map((review) => {
                  const isExpanded = expandedReviews.has(review.id);
                  const isReReviewing = reReviewingIds.has(review.id);
                  const analysis = review.analysis;

                  return (
                    <div key={review.id}>
                      {/* Main Row - Clickable to expand */}
                      <div
                        className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer"
                        onClick={() => toggleReviewExpanded(review.id)}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {/* Expand/Collapse Icon */}
                          <button className="flex-shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                            {isExpanded ? (
                              <ChevronUp className="h-5 w-5" />
                            ) : (
                              <ChevronDown className="h-5 w-5" />
                            )}
                          </button>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                              {review.title}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {review.completedAt
                                ? new Date(review.completedAt).toLocaleString()
                                : 'Pending'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 ml-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-semibold ${
                              review.score !== null && review.score >= 4 ? 'text-green-600 dark:text-green-400' :
                              review.score !== null && review.score >= 3 ? 'text-amber-600 dark:text-amber-400' :
                              review.score !== null ? 'text-red-600 dark:text-red-400' : 'text-slate-400'
                            }`}>
                              {review.score !== null ? `${review.score}/5` : '-'}
                            </span>
                            <span
                              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                review.recommendation?.includes('ACCEPT') ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                                review.recommendation?.includes('REJECT') ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                                'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {review.recommendation?.replace(/_/g, ' ') || '-'}
                            </span>
                          </div>
                          {/* Re-review Button */}
                          {review.submissionId && (
                            <button
                              onClick={() => queueReReview(review)}
                              disabled={(apiKeyStatusKnown && !hasApiKey) || isReReviewing}
                              className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 border border-blue-200 dark:border-blue-700 rounded hover:bg-blue-50 dark:hover:bg-blue-950/50 disabled:opacity-50 transition-colors"
                            >
                              {isReReviewing ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <RotateCcw className="h-3 w-3" />
                              )}
                              Re-review
                            </button>
                          )}
                          {/* View Submission Link */}
                          {review.submissionId && review.eventSlug && (
                            <a
                              href={`/admin/events/${review.eventSlug}/submissions/${review.submissionId}`}
                              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 border border-purple-200 dark:border-purple-700 rounded hover:bg-purple-50 dark:hover:bg-purple-950/50 transition-colors"
                            >
                              <FileText className="h-3 w-3" />
                              View
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Expanded Details - Same style as Review History */}
                      {isExpanded && analysis && (
                        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-200 dark:border-slate-700">
                          <div className="space-y-4 text-sm">
                            {/* Criteria Scores - Table style at top */}
                            {analysis.criteriaScores && Object.keys(analysis.criteriaScores).length > 0 && (
                              <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 divide-x divide-y divide-slate-200 dark:divide-slate-700">
                                  {Object.entries(analysis.criteriaScores).map(([criteria, score]) => (
                                    <div key={criteria} className="px-3 py-2 flex items-center justify-between gap-2">
                                      <span className="text-xs text-slate-600 dark:text-slate-400">{criteria}</span>
                                      <span className={`text-sm font-semibold ${
                                        score >= 4 ? 'text-green-600 dark:text-green-400' :
                                        score >= 3 ? 'text-amber-600 dark:text-amber-400' :
                                        'text-red-600 dark:text-red-400'
                                      }`}>
                                        {score}/5
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Summary */}
                            {analysis.summary && (
                              <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                                <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Summary</span>
                                <span className="text-slate-600 dark:text-slate-400">{analysis.summary}</span>
                              </div>
                            )}

                            {/* Strengths & Weaknesses Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Strengths - Green */}
                              {analysis.strengths && analysis.strengths.length > 0 && (
                                <div className="bg-green-50 dark:bg-green-950/30 p-3 rounded-lg border border-green-200 dark:border-green-800">
                                  <span className="font-semibold text-green-700 dark:text-green-300 block mb-2">Strengths</span>
                                  <ul className="list-disc list-inside space-y-1">
                                    {analysis.strengths.map((s, i) => (
                                      <li key={i} className="text-slate-600 dark:text-slate-400">{s}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Weaknesses - Red */}
                              {analysis.weaknesses && analysis.weaknesses.length > 0 && (
                                <div className="bg-red-50 dark:bg-red-950/30 p-3 rounded-lg border border-red-200 dark:border-red-800">
                                  <span className="font-semibold text-red-700 dark:text-red-300 block mb-2">Weaknesses</span>
                                  <ul className="list-disc list-inside space-y-1">
                                    {analysis.weaknesses.map((w, i) => (
                                      <li key={i} className="text-slate-600 dark:text-slate-400">{w}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>

                            {/* Suggestions if available */}
                            {analysis.suggestions && analysis.suggestions.length > 0 && (
                              <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                                <span className="font-semibold text-blue-700 dark:text-blue-300 block mb-2">Suggestions</span>
                                <ul className="list-disc list-inside space-y-1">
                                  {analysis.suggestions.map((s, i) => (
                                    <li key={i} className="text-slate-600 dark:text-slate-400">{s}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Confidence indicator */}
                            {analysis.confidence !== undefined && (
                              <div className="text-xs text-slate-500 dark:text-slate-500 pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center gap-4">
                                <span>
                                  Confidence:{' '}
                                  <span className={`font-medium ${
                                    analysis.confidence >= 0.7 ? 'text-green-600 dark:text-green-400' :
                                    analysis.confidence >= 0.5 ? 'text-yellow-600 dark:text-yellow-400' :
                                    'text-red-600 dark:text-red-400'
                                  }`}>
                                    {Math.round(analysis.confidence * 100)}%
                                  </span>
                                </span>
                                <span>Job ID: {review.id}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Expanded but no analysis data */}
                      {isExpanded && !analysis && (
                        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-200 dark:border-slate-700">
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            No detailed analysis available for this review.
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
