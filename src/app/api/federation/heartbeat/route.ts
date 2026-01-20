/**
 * Federation Heartbeat API
 * 
 * POST /api/federation/heartbeat - Manually trigger a heartbeat
 * 
 * Typically called by a cron job or scheduled task.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { performHeartbeat, getFederationState } from '@/lib/federation';

export const dynamic = 'force-dynamic';

/**
 * POST - Trigger heartbeat
 */
export async function POST(request: NextRequest) {
  try {
    // Check for cron secret or admin auth
    const cronSecret = request.headers.get('x-cron-secret');
    const expectedSecret = process.env.CRON_SECRET;
    
    // Allow if cron secret matches
    if (cronSecret && expectedSecret && cronSecret === expectedSecret) {
      await performHeartbeat();
      return NextResponse.json({ success: true });
    }
    
    // Otherwise require admin auth
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }
    
    // Check if federation is enabled
    const state = await getFederationState();
    if (!state.isEnabled) {
      return NextResponse.json(
        { error: 'Federation is not enabled' },
        { status: 400 }
      );
    }
    
    await performHeartbeat();
    
    return NextResponse.json({
      success: true,
      message: 'Heartbeat sent successfully',
    });
  } catch (error) {
    console.error('Heartbeat error:', error);
    return NextResponse.json(
      { error: 'Failed to send heartbeat' },
      { status: 500 }
    );
  }
}
