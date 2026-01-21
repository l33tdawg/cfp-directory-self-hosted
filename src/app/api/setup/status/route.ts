/**
 * Setup Status API
 * 
 * GET /api/setup/status - Check if initial setup is complete
 * 
 * Returns whether the system has been set up (has at least one admin).
 * This is a public endpoint - no auth required.
 * 
 * SECURITY: Limits information disclosure for unconfigured instances
 * to prevent reconnaissance of fresh installations.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { rateLimitMiddleware } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting to prevent enumeration/scanning
    const rateLimited = rateLimitMiddleware(request, 'api');
    if (rateLimited) {
      return rateLimited;
    }
    
    // Check if there's at least one admin user
    const adminCount = await prisma.user.count({
      where: { role: 'ADMIN' },
    });

    const isSetupComplete = adminCount > 0;

    // SECURITY: For unconfigured instances, return minimal information
    // to prevent reconnaissance of fresh installations
    if (!isSetupComplete) {
      return NextResponse.json({
        isSetupComplete: false,
        hasSiteSettings: false,
        // Don't reveal any other information for fresh installs
      });
    }

    // Get site settings if exists (only for configured instances)
    const settings = await prisma.siteSettings.findUnique({
      where: { id: 'default' },
      select: {
        name: true,
        description: true,
        logoUrl: true,
        websiteUrl: true,
      },
    });

    // Count published events with open CFP (only for configured instances)
    const now = new Date();
    const openEventsCount = await prisma.event.count({
      where: {
        isPublished: true,
        cfpOpensAt: { lte: now },
        cfpClosesAt: { gte: now },
      },
    });

    const totalEventsCount = await prisma.event.count({
      where: { isPublished: true },
    });

    return NextResponse.json({
      isSetupComplete: true,
      hasSiteSettings: !!settings?.name,
      siteSettings: settings || null,
      stats: {
        openCfpCount: openEventsCount,
        totalEventsCount: totalEventsCount,
      },
    });
  } catch (error) {
    console.error('Setup status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check setup status' },
      { status: 500 }
    );
  }
}
