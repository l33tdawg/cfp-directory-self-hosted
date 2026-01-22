/**
 * Signup Status API
 * 
 * GET /api/auth/signup-status - Check if public signup is enabled
 * 
 * This is a public endpoint that returns whether speakers can self-register.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { rateLimitMiddleware } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  try {
    const rateLimited = rateLimitMiddleware(request, 'api');
    if (rateLimited) {
      return rateLimited;
    }

    const settings = await prisma.siteSettings.findUnique({
      where: { id: 'default' },
      select: { 
        allowPublicSignup: true,
        name: true,
        contactEmail: true,
      },
    });

    return NextResponse.json({
      allowPublicSignup: settings?.allowPublicSignup ?? false,
      siteName: settings?.name ?? 'CFP System',
      contactEmail: settings?.contactEmail,
    });
  } catch (error) {
    console.error('Signup status check error:', error);
    return NextResponse.json(
      { allowPublicSignup: false },
      { status: 500 }
    );
  }
}
