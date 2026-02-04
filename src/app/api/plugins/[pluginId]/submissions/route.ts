/**
 * Plugin Submissions API
 *
 * Get submissions with their AI review status for the plugin.
 * Used by the AI Paper Reviewer to find unreviewed submissions.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getApiUser } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ pluginId: string }> }
) {
  try {
    const { pluginId } = await params;
    const user = await getApiUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Require admin role
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Verify plugin exists
    const plugin = await prisma.plugin.findUnique({
      where: { id: pluginId },
      select: { id: true, name: true },
    });

    if (!plugin) {
      return NextResponse.json(
        { error: 'Plugin not found' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId') || undefined;
    const reviewed = searchParams.get('reviewed'); // 'true', 'false', or undefined for all
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);

    // Build submission query
    const submissionWhere: Record<string, unknown> = {};
    if (eventId) {
      submissionWhere.eventId = eventId;
    }

    // Get all submissions
    const submissions = await prisma.submission.findMany({
      where: submissionWhere,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        abstract: true,
        status: true,
        createdAt: true,
        eventId: true,
        event: {
          select: {
            id: true,
            name: true,
          },
        },
        speaker: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Get all completed ai-review jobs for this plugin to find reviewed submissions
    const completedJobs = await prisma.pluginJob.findMany({
      where: {
        pluginId,
        type: 'ai-review',
        status: 'completed',
      },
      select: {
        id: true,
        payload: true,
        result: true,
        completedAt: true,
      },
    });

    // Get pending/running jobs to track in-progress reviews
    const pendingJobs = await prisma.pluginJob.findMany({
      where: {
        pluginId,
        type: 'ai-review',
        status: { in: ['pending', 'running'] },
      },
      select: {
        id: true,
        payload: true,
        status: true,
      },
    });

    // Build a map of submission ID to review status
    const reviewedSubmissions = new Map<string, {
      jobId: string;
      completedAt: Date;
      score: number | null;
      recommendation: string | null;
    }>();

    for (const job of completedJobs) {
      const payload = job.payload as Record<string, unknown> | null;
      const result = job.result as Record<string, unknown> | null;
      const submissionId = payload?.submissionId as string | undefined;

      if (submissionId) {
        // Handle multiple result formats
        let analysis: Record<string, unknown> | undefined;

        // New format: result.data.analysis
        if ((result?.data as Record<string, unknown>)?.analysis) {
          analysis = (result?.data as Record<string, unknown>)?.analysis as Record<string, unknown>;
        }
        // Old format: result.analysis directly
        else if (result?.analysis) {
          analysis = result.analysis as Record<string, unknown>;
        }

        reviewedSubmissions.set(submissionId, {
          jobId: job.id,
          completedAt: job.completedAt!,
          score: (analysis?.overallScore as number) ?? null,
          recommendation: (analysis?.recommendation as string) ?? null,
        });
      }
    }

    // Track pending reviews
    const pendingReviews = new Map<string, { jobId: string; status: string }>();
    for (const job of pendingJobs) {
      const payload = job.payload as Record<string, unknown> | null;
      const submissionId = payload?.submissionId as string | undefined;
      if (submissionId) {
        pendingReviews.set(submissionId, { jobId: job.id, status: job.status });
      }
    }

    // Annotate submissions with review status
    // Format matches main platform for plugin compatibility
    const annotatedSubmissions = submissions.map((sub) => {
      const review = reviewedSubmissions.get(sub.id);
      const pending = pendingReviews.get(sub.id);

      // Determine status for top-level aiReviewStatus field
      let aiReviewStatus: 'none' | 'pending' | 'processing' | 'completed' | 'failed';
      if (review) {
        aiReviewStatus = 'completed';
      } else if (pending) {
        aiReviewStatus = pending.status === 'running' ? 'processing' : 'pending';
      } else {
        aiReviewStatus = 'none';
      }

      return {
        ...sub,
        hasAiReview: !!review,
        aiReviewStatus,
        // aiReview is null when not reviewed, matches main platform format
        aiReview: review
          ? {
              id: review.jobId,
              status: 'completed' as const,
              overallScore: review.score,
              recommendation: review.recommendation,
              confidence: null,
              createdAt: review.completedAt.toISOString(),
              completedAt: review.completedAt.toISOString(),
            }
          : null,
      };
    });

    // Filter by reviewed status if requested
    let filteredSubmissions = annotatedSubmissions;
    if (reviewed === 'true') {
      filteredSubmissions = annotatedSubmissions.filter(
        (s) => s.aiReviewStatus === 'completed'
      );
    } else if (reviewed === 'false') {
      filteredSubmissions = annotatedSubmissions.filter(
        (s) => s.aiReviewStatus === 'none'
      );
    }

    // Calculate summary stats
    const stats = {
      total: submissions.length,
      reviewed: annotatedSubmissions.filter((s) => s.aiReviewStatus === 'completed').length,
      pending: annotatedSubmissions.filter((s) => s.aiReviewStatus === 'pending' || s.aiReviewStatus === 'processing').length,
      unreviewed: annotatedSubmissions.filter((s) => s.aiReviewStatus === 'none').length,
    };

    return NextResponse.json({
      submissions: filteredSubmissions,
      stats,
    });
  } catch (error) {
    console.error('Error fetching plugin submissions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
