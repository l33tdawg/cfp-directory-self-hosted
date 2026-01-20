/**
 * Admin Stats API
 * 
 * Returns dashboard statistics for admins.
 */

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getAdminStats, getPendingItems, getRecentActivity } from '@/lib/health-checks';

export async function GET() {
  try {
    const user = await getCurrentUser();
    
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    const [stats, pendingItems, recentActivity] = await Promise.all([
      getAdminStats(),
      getPendingItems(),
      getRecentActivity(10),
    ]);
    
    return NextResponse.json({
      stats,
      pendingItems,
      recentActivity,
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
