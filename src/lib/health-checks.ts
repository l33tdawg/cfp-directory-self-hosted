/**
 * Health Check Utilities
 * 
 * System health monitoring for the admin dashboard.
 */

import { prisma } from '@/lib/db/prisma';
import { decryptPiiFields, USER_PII_FIELDS } from '@/lib/security/encryption';

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

export interface HealthCheckResult {
  status: HealthStatus;
  latency?: number;
  message?: string;
}

export interface SystemHealth {
  database: HealthCheckResult;
  storage: HealthCheckResult;
  email: HealthCheckResult;
  federation: HealthCheckResult;
  overall: HealthStatus;
}

// Types for admin dashboard
export interface AdminStats {
  totalUsers: number;
  totalEvents: number;
  totalSubmissions: number;
  totalReviewers: number;
  pendingSubmissions: number;
  recentUsers: number;
}

export interface PendingItems {
  pendingSubmissions: number;
  incompleteOnboarding: number;
  openCfpEvents: number;
  unassignedReviews: number;
}

export interface RecentActivity {
  id: string;
  type: 'submission' | 'review' | 'user' | 'security' | 'event' | 'settings' | 'file';
  action: string;
  title: string;
  subtitle: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
  user?: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  } | null;
}

/**
 * Check database connectivity and response time
 */
async function checkDatabase(): Promise<HealthCheckResult> {
  const start = Date.now();
  
  try {
    // Simple query to test connectivity
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - start;
    
    return {
      status: latency < 100 ? 'healthy' : latency < 500 ? 'degraded' : 'unhealthy',
      latency,
      message: latency > 500 ? 'High database latency' : undefined,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      latency: Date.now() - start,
      message: error instanceof Error ? error.message : 'Database connection failed',
    };
  }
}

/**
 * Check storage availability
 */
async function checkStorage(): Promise<HealthCheckResult> {
  const start = Date.now();
  
  try {
    // Check if uploads directory exists and is writable
    const fs = await import('fs/promises');
    const path = await import('path');
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    
    try {
      await fs.access(uploadsDir);
    } catch {
      // Directory doesn't exist, try to create it
      await fs.mkdir(uploadsDir, { recursive: true });
    }
    
    const latency = Date.now() - start;
    return {
      status: 'healthy',
      latency,
    };
  } catch {
    return {
      status: 'degraded',
      latency: Date.now() - start,
      message: 'Storage directory not accessible',
    };
  }
}

/**
 * Check email service configuration
 */
async function checkEmail(): Promise<HealthCheckResult> {
  const start = Date.now();
  
  // Check if SMTP credentials are configured
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const resendKey = process.env.RESEND_API_KEY;
  
  const latency = Date.now() - start;
  
  if (resendKey || (smtpHost && smtpUser)) {
    return {
      status: 'healthy',
      latency,
      message: resendKey ? 'Resend configured' : 'SMTP configured',
    };
  }
  
  return {
    status: 'degraded',
    latency,
    message: 'Email service not configured',
  };
}

/**
 * Check federation status
 */
async function checkFederation(): Promise<HealthCheckResult> {
  const start = Date.now();
  
  try {
    // Check federation settings
    const settings = await prisma.siteSettings.findUnique({
      where: { id: 'default' },
      select: { 
        federationEnabled: true, 
        federationLicenseKey: true,
        federationActivatedAt: true,
      },
    });
    
    const latency = Date.now() - start;
    
    if (!settings?.federationEnabled) {
      return {
        status: 'unknown',
        latency,
        message: 'Federation disabled',
      };
    }
    
    if (!settings.federationLicenseKey) {
      return {
        status: 'degraded',
        latency,
        message: 'License key not configured',
      };
    }
    
    if (!settings.federationActivatedAt) {
      return {
        status: 'degraded',
        latency,
        message: 'License not activated',
      };
    }
    
    return {
      status: 'healthy',
      latency,
      message: 'Federation active',
    };
  } catch {
    return {
      status: 'unknown',
      latency: Date.now() - start,
      message: 'Could not check federation status',
    };
  }
}

/**
 * Calculate overall system health
 */
function calculateOverallHealth(checks: Omit<SystemHealth, 'overall'>): HealthStatus {
  const statuses = [checks.database.status, checks.storage.status, checks.email.status];
  
  // Don't include federation in overall health (it's optional)
  if (statuses.includes('unhealthy')) return 'unhealthy';
  if (statuses.includes('degraded')) return 'degraded';
  if (statuses.every(s => s === 'healthy')) return 'healthy';
  return 'unknown';
}

/**
 * Run all health checks
 */
export async function getSystemHealth(): Promise<SystemHealth> {
  const [database, storage, email, federation] = await Promise.all([
    checkDatabase(),
    checkStorage(),
    checkEmail(),
    checkFederation(),
  ]);
  
  const checks = { database, storage, email, federation };
  
  return {
    ...checks,
    overall: calculateOverallHealth(checks),
  };
}

/**
 * Get admin dashboard statistics
 */
export async function getAdminStats(): Promise<AdminStats> {
  const [
    totalUsers,
    totalEvents,
    totalSubmissions,
    totalReviewers,
    pendingSubmissions,
    recentUsers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.event.count(),
    prisma.submission.count(),
    prisma.user.count({ where: { role: 'REVIEWER' } }),
    prisma.submission.count({ where: { status: 'PENDING' } }),
    prisma.user.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      },
    }),
  ]);
  
  return {
    totalUsers,
    totalEvents,
    totalSubmissions,
    totalReviewers,
    pendingSubmissions,
    recentUsers,
  };
}

/**
 * Get pending items that need attention
 */
export async function getPendingItems(): Promise<PendingItems> {
  const [
    pendingSubmissions,
    incompleteOnboarding,
    openCfpEvents,
    unassignedReviews,
  ] = await Promise.all([
    // Submissions awaiting review
    prisma.submission.count({
      where: { 
        status: { in: ['PENDING', 'UNDER_REVIEW'] },
      },
    }),
    
    // Users who haven't completed onboarding
    prisma.speakerProfile.count({
      where: { onboardingCompleted: false },
    }),
    
    // Events with open CFPs
    prisma.event.count({
      where: {
        isPublished: true,
        cfpOpensAt: { lte: new Date() },
        cfpClosesAt: { gte: new Date() },
      },
    }),
    
    // Submissions without any reviews
    prisma.submission.count({
      where: {
        status: { in: ['PENDING', 'UNDER_REVIEW'] },
        reviews: { none: {} },
      },
    }),
  ]);
  
  return {
    pendingSubmissions,
    incompleteOnboarding,
    openCfpEvents,
    unassignedReviews,
  };
}

/**
 * Format activity action into human-readable title
 */
function formatActivityTitle(action: string, metadata?: Record<string, unknown>): string {
  const titleMap: Record<string, string> = {
    // User actions
    USER_CREATED: 'User created',
    USER_REGISTERED: 'New user registered',
    USER_UPDATED: 'User profile updated',
    USER_ROLE_CHANGED: `Role changed${metadata?.newRole ? ` to ${metadata.newRole}` : ''}`,
    USER_DELETED: 'User deleted',
    USER_LOGIN: 'User logged in',
    USER_LOGOUT: 'User logged out',
    USER_INVITED: `User invited${metadata?.invitedEmail ? `: ${metadata.invitedEmail}` : ''}`,
    USER_INVITE_ACCEPTED: 'Invitation accepted',
    USER_EMAIL_VERIFIED: 'Email verified',
    USER_VERIFICATION_RESENT: 'Verification email resent',
    // Security actions
    LOGIN_FAILED: 'Login attempt failed',
    PASSWORD_CHANGED: 'Password changed',
    PASSWORD_RESET_REQUESTED: 'Password reset requested',
    PASSWORD_RESET_COMPLETED: 'Password reset completed',
    SESSION_INVALIDATED: 'Session invalidated',
    ADMIN_ACTION: 'Admin action performed',
    RATE_LIMIT_EXCEEDED: 'Rate limit exceeded',
    UNAUTHORIZED_ACCESS_ATTEMPT: 'Unauthorized access attempt',
    // Event actions
    EVENT_CREATED: 'Event created',
    EVENT_UPDATED: 'Event updated',
    EVENT_PUBLISHED: 'Event published',
    EVENT_UNPUBLISHED: 'Event unpublished',
    EVENT_DELETED: 'Event deleted',
    EVENT_CFP_OPENED: 'CFP opened',
    EVENT_CFP_CLOSED: 'CFP closed',
    // Submission actions
    SUBMISSION_CREATED: 'Submission created',
    SUBMISSION_UPDATED: 'Submission updated',
    SUBMISSION_STATUS_CHANGED: `Submission status changed${metadata?.newStatus ? ` to ${metadata.newStatus}` : ''}`,
    SUBMISSION_ACCEPTED: 'Submission accepted',
    SUBMISSION_REJECTED: 'Submission rejected',
    SUBMISSION_WITHDRAWN: 'Submission withdrawn',
    // Review actions
    REVIEW_SUBMITTED: 'Review submitted',
    REVIEW_UPDATED: 'Review updated',
    REVIEWER_ASSIGNED: 'Reviewer assigned',
    REVIEWER_REMOVED: 'Reviewer removed',
    // File actions
    FILE_UPLOADED: 'File uploaded',
    FILE_DELETED: 'File deleted',
    // System actions
    SETTINGS_UPDATED: 'Settings updated',
    FEDERATION_ENABLED: 'Federation enabled',
    FEDERATION_DISABLED: 'Federation disabled',
  };
  
  return titleMap[action] || action.replace(/_/g, ' ').toLowerCase();
}

/**
 * Get activity type from action
 */
function getActivityType(action: string, entityType: string): RecentActivity['type'] {
  if (action.startsWith('USER_') || entityType === 'User') return 'user';
  if (action.startsWith('EVENT_') || entityType === 'Event') return 'event';
  if (action.startsWith('SUBMISSION_') || entityType === 'Submission') return 'submission';
  if (action.startsWith('REVIEW_') || entityType === 'Review') return 'review';
  if (action.startsWith('FILE_')) return 'file';
  if (action.startsWith('SETTINGS_') || action.startsWith('FEDERATION_') || entityType === 'Settings') return 'settings';
  if (entityType === 'Security' || action.includes('LOGIN') || action.includes('PASSWORD') || 
      action.includes('SESSION') || action.includes('RATE_LIMIT') || action.includes('UNAUTHORIZED')) return 'security';
  return 'user'; // fallback
}

/**
 * Get recent activity for activity feed from ActivityLog table
 */
export async function getRecentActivity(limit: number = 10): Promise<RecentActivity[]> {
  const logs = await prisma.activityLog.findMany({
    take: limit,
    orderBy: { createdAt: 'desc' },
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
  });
  
  return logs.map(log => {
    // Decrypt user info if present
    let decryptedUser = log.user;
    if (log.user) {
      const decrypted = decryptPiiFields(
        log.user as unknown as Record<string, unknown>,
        USER_PII_FIELDS
      );
      decryptedUser = {
        ...log.user,
        name: decrypted.name as string | null,
        email: decrypted.email as string,
      };
    }
    
    const metadata = (log.metadata as Record<string, unknown>) || {};
    const userName = decryptedUser?.name || decryptedUser?.email?.split('@')[0] || 'System';
    
    return {
      id: log.id,
      type: getActivityType(log.action, log.entityType),
      action: log.action,
      title: formatActivityTitle(log.action, metadata),
      subtitle: userName,
      timestamp: log.createdAt,
      metadata,
      user: decryptedUser,
    };
  });
}
