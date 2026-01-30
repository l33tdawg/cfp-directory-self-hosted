/**
 * Public Reviewers API
 *
 * GET: Get all reviewers with showOnTeamPage enabled (public)
 *
 * SECURITY: Rate limited to prevent bulk scraping of reviewer profiles.
 * Users opt-in to being listed via showOnTeamPage flag.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { decryptPiiFields, REVIEWER_PROFILE_PII_FIELDS } from '@/lib/security/encryption';
import { rateLimitMiddleware } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  // SECURITY: Rate limit to prevent bulk scraping
  const rateLimitResponse = rateLimitMiddleware(request, 'api');
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

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

    // Decrypt PII and map the user image as fallback for photoUrl
    const mappedReviewers = reviewers.map((r) => {
      const decrypted = decryptPiiFields(
        r as unknown as Record<string, unknown>,
        REVIEWER_PROFILE_PII_FIELDS
      );
      return {
        ...decrypted,
        photoUrl: decrypted.photoUrl || r.user?.image || null,
        user: undefined, // Remove user object from response
      };
    });

    return NextResponse.json({ reviewers: mappedReviewers });
  } catch (error) {
    console.error('Error fetching reviewers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reviewers' },
      { status: 500 }
    );
  }
}
