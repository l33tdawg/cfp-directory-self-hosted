/**
 * Admin Activity Log API
 * 
 * Fetch activity logs with filtering options.
 */

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getActivityLogs, type ActivityAction, type EntityType } from '@/lib/activity-logger';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const userId = searchParams.get('userId') || undefined;
    const entityType = searchParams.get('entityType') as 'User' | 'Event' | 'Submission' | 'Review' | 'Settings' | undefined;
    const action = searchParams.get('action') || undefined;
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');
    
    const startDate = startDateStr ? new Date(startDateStr) : undefined;
    const endDate = endDateStr ? new Date(endDateStr) : undefined;
    
    const { logs, total } = await getActivityLogs({
      limit,
      offset,
      userId,
      entityType,
      action: action as ActivityAction | undefined,
      startDate,
      endDate,
    });
    
    return NextResponse.json({
      logs,
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + logs.length < total,
      },
    });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
