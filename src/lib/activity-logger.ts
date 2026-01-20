/**
 * Activity Logger
 * 
 * Utility for logging user and system activities for audit purposes.
 */

import { prisma } from '@/lib/db/prisma';

export type ActivityAction =
  // User actions
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_ROLE_CHANGED'
  | 'USER_DELETED'
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'USER_INVITED'
  | 'USER_INVITE_ACCEPTED'
  
  // Event actions
  | 'EVENT_CREATED'
  | 'EVENT_UPDATED'
  | 'EVENT_PUBLISHED'
  | 'EVENT_UNPUBLISHED'
  | 'EVENT_DELETED'
  | 'EVENT_CFP_OPENED'
  | 'EVENT_CFP_CLOSED'
  
  // Submission actions
  | 'SUBMISSION_CREATED'
  | 'SUBMISSION_UPDATED'
  | 'SUBMISSION_ACCEPTED'
  | 'SUBMISSION_REJECTED'
  | 'SUBMISSION_WITHDRAWN'
  
  // Review actions
  | 'REVIEW_SUBMITTED'
  | 'REVIEW_UPDATED'
  | 'REVIEWER_ASSIGNED'
  | 'REVIEWER_REMOVED'
  
  // System actions
  | 'SETTINGS_UPDATED'
  | 'FEDERATION_ENABLED'
  | 'FEDERATION_DISABLED';

export type EntityType = 
  | 'User' 
  | 'Event' 
  | 'Submission' 
  | 'Review' 
  | 'Settings';

interface LogActivityParams {
  userId?: string | null;
  action: ActivityAction;
  entityType: EntityType;
  entityId: string;
  metadata?: Record<string, string | number | boolean | null>;
  ipAddress?: string | null;
}

/**
 * Log an activity to the database
 */
export async function logActivity({
  userId,
  action,
  entityType,
  entityId,
  metadata,
  ipAddress,
}: LogActivityParams): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        metadata: metadata || {},
        ipAddress,
      },
    });
  } catch (error) {
    // Don't throw - activity logging should never break the main flow
    console.error('Failed to log activity:', error);
  }
}

/**
 * Get recent activity logs
 */
export async function getActivityLogs(options: {
  limit?: number;
  offset?: number;
  userId?: string;
  entityType?: EntityType;
  entityId?: string;
  action?: ActivityAction;
  startDate?: Date;
  endDate?: Date;
} = {}) {
  const {
    limit = 50,
    offset = 0,
    userId,
    entityType,
    entityId,
    action,
    startDate,
    endDate,
  } = options;

  const where: Record<string, unknown> = {};

  if (userId) where.userId = userId;
  if (entityType) where.entityType = entityType;
  if (entityId) where.entityId = entityId;
  if (action) where.action = action;
  
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) (where.createdAt as Record<string, Date>).gte = startDate;
    if (endDate) (where.createdAt as Record<string, Date>).lte = endDate;
  }

  const [logs, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    }),
    prisma.activityLog.count({ where }),
  ]);

  return { logs, total };
}

/**
 * Get activity summary for dashboard
 */
export async function getActivitySummary(days: number = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const [
    totalActions,
    actionBreakdown,
    topUsers,
    recentLogs,
  ] = await Promise.all([
    // Total actions in period
    prisma.activityLog.count({
      where: { createdAt: { gte: startDate } },
    }),
    
    // Breakdown by action type
    prisma.activityLog.groupBy({
      by: ['action'],
      where: { createdAt: { gte: startDate } },
      _count: true,
      orderBy: { _count: { action: 'desc' } },
      take: 10,
    }),
    
    // Top active users
    prisma.activityLog.groupBy({
      by: ['userId'],
      where: { 
        createdAt: { gte: startDate },
        userId: { not: null },
      },
      _count: true,
      orderBy: { _count: { userId: 'desc' } },
      take: 5,
    }),
    
    // Recent logs
    prisma.activityLog.findMany({
      where: { createdAt: { gte: startDate } },
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  return {
    totalActions,
    actionBreakdown: actionBreakdown.map(a => ({
      action: a.action,
      count: a._count,
    })),
    topUsers,
    recentLogs,
  };
}

/**
 * Format an activity action for display
 */
export function formatActivityAction(action: ActivityAction): string {
  const actionMap: Record<ActivityAction, string> = {
    USER_CREATED: 'User created',
    USER_UPDATED: 'User updated',
    USER_ROLE_CHANGED: 'User role changed',
    USER_DELETED: 'User deleted',
    USER_LOGIN: 'User logged in',
    USER_LOGOUT: 'User logged out',
    USER_INVITED: 'User invited',
    USER_INVITE_ACCEPTED: 'Invitation accepted',
    EVENT_CREATED: 'Event created',
    EVENT_UPDATED: 'Event updated',
    EVENT_PUBLISHED: 'Event published',
    EVENT_UNPUBLISHED: 'Event unpublished',
    EVENT_DELETED: 'Event deleted',
    EVENT_CFP_OPENED: 'CFP opened',
    EVENT_CFP_CLOSED: 'CFP closed',
    SUBMISSION_CREATED: 'Submission created',
    SUBMISSION_UPDATED: 'Submission updated',
    SUBMISSION_ACCEPTED: 'Submission accepted',
    SUBMISSION_REJECTED: 'Submission rejected',
    SUBMISSION_WITHDRAWN: 'Submission withdrawn',
    REVIEW_SUBMITTED: 'Review submitted',
    REVIEW_UPDATED: 'Review updated',
    REVIEWER_ASSIGNED: 'Reviewer assigned',
    REVIEWER_REMOVED: 'Reviewer removed',
    SETTINGS_UPDATED: 'Settings updated',
    FEDERATION_ENABLED: 'Federation enabled',
    FEDERATION_DISABLED: 'Federation disabled',
  };

  return actionMap[action] || action;
}

/**
 * Get activity icon name based on action
 */
export function getActivityIcon(action: ActivityAction): string {
  if (action.startsWith('USER_')) return 'user';
  if (action.startsWith('EVENT_')) return 'calendar';
  if (action.startsWith('SUBMISSION_')) return 'file-text';
  if (action.startsWith('REVIEW_')) return 'star';
  if (action.startsWith('SETTINGS_') || action.startsWith('FEDERATION_')) return 'settings';
  return 'activity';
}
