/**
 * Health Check Utilities
 * 
 * System health monitoring for the admin dashboard.
 */

import { prisma } from '@/lib/db/prisma';

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
  } catch (error) {
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
  } catch (error) {
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
export async function getAdminStats() {
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
export async function getPendingItems() {
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
 * Get recent activity for activity feed
 */
export async function getRecentActivity(limit: number = 10) {
  const [recentSubmissions, recentReviews, recentUsers] = await Promise.all([
    // Recent submissions
    prisma.submission.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        createdAt: true,
        status: true,
        speaker: {
          select: { name: true },
        },
        event: {
          select: { name: true, slug: true },
        },
      },
    }),
    
    // Recent reviews
    prisma.review.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        overallScore: true,
        reviewer: {
          select: { name: true },
        },
        submission: {
          select: { title: true },
        },
      },
    }),
    
    // Recent user signups
    prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    }),
  ]);
  
  // Combine and sort by date
  type ActivityItem = {
    id: string;
    type: 'submission' | 'review' | 'user';
    title: string;
    subtitle: string;
    timestamp: Date;
    metadata?: Record<string, unknown>;
  };
  
  const activities: ActivityItem[] = [
    ...recentSubmissions.map(s => ({
      id: s.id,
      type: 'submission' as const,
      title: `New submission: ${s.title}`,
      subtitle: `by ${s.speaker?.name || 'Unknown'} for ${s.event.name}`,
      timestamp: s.createdAt,
      metadata: { status: s.status, eventSlug: s.event.slug },
    })),
    ...recentReviews.map(r => ({
      id: r.id,
      type: 'review' as const,
      title: `Review submitted`,
      subtitle: `${r.reviewer?.name || 'Unknown'} reviewed "${r.submission?.title}"`,
      timestamp: r.createdAt,
      metadata: { score: r.overallScore },
    })),
    ...recentUsers.map(u => ({
      id: u.id,
      type: 'user' as const,
      title: `New user registered`,
      subtitle: u.name || u.email,
      timestamp: u.createdAt,
      metadata: { role: u.role },
    })),
  ];
  
  // Sort by timestamp descending
  activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  
  return activities.slice(0, limit);
}
