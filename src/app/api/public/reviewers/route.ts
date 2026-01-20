/**
 * Public Reviewers API
 * 
 * GET: Get all reviewers with showOnTeamPage enabled (public)
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
  try {
    const reviewers = await prisma.reviewerProfile.findMany({
      where: {
        showOnTeamPage: true,
        onboardingCompleted: true,
      },
      orderBy: [
        { displayOrder: 'asc' },
        { createdAt: 'asc' },
      ],
      select: {
        id: true,
        fullName: true,
        designation: true,
        company: true,
        bio: true,
        photoUrl: true,
        expertiseAreas: true,
        linkedinUrl: true,
        twitterHandle: true,
        githubUsername: true,
        websiteUrl: true,
        user: {
          select: {
            image: true,
          },
        },
      },
    });

    // Map the user image as fallback for photoUrl
    const mappedReviewers = reviewers.map((r) => ({
      ...r,
      photoUrl: r.photoUrl || r.user?.image || null,
      user: undefined, // Remove user object from response
    }));

    return NextResponse.json({ reviewers: mappedReviewers });
  } catch (error) {
    console.error('Error fetching reviewers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reviewers' },
      { status: 500 }
    );
  }
}
