/**
 * Admin Reviewers API
 * 
 * Get reviewer statistics and workload information.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    
    if (user.role !== 'ADMIN' && user.role !== 'ORGANIZER') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    // Fetch all reviewers
    const reviewers = await prisma.user.findMany({
      where: {
        OR: [
          { role: 'REVIEWER' },
          { reviewerProfile: { isNot: null } },
          { reviewTeamEvents: { some: {} } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        reviewerProfile: {
          select: {
            fullName: true,
            expertiseAreas: true,
            onboardingCompleted: true,
          },
        },
        _count: {
          select: {
            reviews: true,
            reviewTeamEvents: true,
          },
        },
      },
    });
    
    // Get review distribution by event
    const reviewsByEvent = await prisma.review.groupBy({
      by: ['reviewerId'],
      _count: true,
      _avg: { overallScore: true },
    });
    
    // Build response
    const reviewersWithStats = reviewers.map(reviewer => {
      const reviewStats = reviewsByEvent.find(r => r.reviewerId === reviewer.id);
      return {
        ...reviewer,
        reviewCount: reviewStats?._count || 0,
        avgScore: reviewStats?._avg?.overallScore || null,
      };
    });
    
    // Summary statistics
    const totalReviews = await prisma.review.count();
    const totalPendingReviews = await prisma.submission.count({
      where: {
        status: { in: ['PENDING', 'UNDER_REVIEW'] },
        reviews: { none: {} },
      },
    });
    
    return NextResponse.json({
      reviewers: reviewersWithStats,
      stats: {
        totalReviewers: reviewers.length,
        totalReviews,
        totalPendingReviews,
        activeReviewers: reviewers.filter(r => r._count.reviews > 0).length,
      },
    });
  } catch (error) {
    console.error('Error fetching reviewers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
