/**
 * Setup Status API
 * 
 * GET /api/setup/status - Check if initial setup is complete
 * 
 * Returns whether the system has been set up (has at least one admin).
 * This is a public endpoint - no auth required.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
  try {
    // Check if there's at least one admin user
    const adminCount = await prisma.user.count({
      where: { role: 'ADMIN' },
    });

    // Get site settings if exists
    const settings = await prisma.siteSettings.findUnique({
      where: { id: 'default' },
      select: {
        name: true,
        description: true,
        logoUrl: true,
        websiteUrl: true,
      },
    });

    // Count published events with open CFP
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
      isSetupComplete: adminCount > 0,
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
