/**
 * My Submissions Page
 * 
 * Lists all submissions by the current user across all events
 * with filtering and status overview.
 */

import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatsCard, StatsCardGrid } from '@/components/dashboard';
import Link from 'next/link';
import { 
  FileText, 
  Calendar, 
  ChevronRight, 
  Search, 
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  MessageSquare
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

export const metadata = {
  title: 'My Submissions',
};

type StatusFilter = 'all' | 'active' | 'accepted' | 'rejected' | 'withdrawn';

const statusConfig: Record<string, {
  label: string;
  color: string;
  icon: typeof CheckCircle;
  bgColor: string;
}> = {
  PENDING: {
    label: 'Pending',
    color: 'text-amber-700 dark:text-amber-400',
    icon: Clock,
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
  },
  UNDER_REVIEW: {
    label: 'Under Review',
    color: 'text-blue-700 dark:text-blue-400',
    icon: AlertCircle,
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  ACCEPTED: {
    label: 'Accepted',
    color: 'text-green-700 dark:text-green-400',
    icon: CheckCircle,
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  REJECTED: {
    label: 'Not Selected',
    color: 'text-red-700 dark:text-red-400',
    icon: XCircle,
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
  WAITLISTED: {
    label: 'Waitlisted',
    color: 'text-purple-700 dark:text-purple-400',
    icon: Clock,
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
  },
  WITHDRAWN: {
    label: 'Withdrawn',
    color: 'text-slate-500 dark:text-slate-400',
    icon: XCircle,
    bgColor: 'bg-slate-100 dark:bg-slate-800',
  },
};

interface SubmissionsPageProps {
  searchParams: Promise<{ status?: StatusFilter }>;
}

export default async function SubmissionsPage({ searchParams }: SubmissionsPageProps) {
  const user = await getCurrentUser();
  const params = await searchParams;
  const statusFilter = params.status || 'all';
  
  const submissions = await prisma.submission.findMany({
    where: { speakerId: user.id },
    include: {
      event: {
        select: {
          id: true,
          name: true,
          slug: true,
          startDate: true,
        },
      },
      track: {
        select: {
          id: true,
          name: true,
          color: true,
        },
      },
      format: {
        select: {
          id: true,
          name: true,
          durationMin: true,
        },
      },
      _count: {
        select: {
          reviews: true,
          messages: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  
  // Calculate stats
  const stats = {
    total: submissions.length,
    active: submissions.filter(s => ['PENDING', 'UNDER_REVIEW'].includes(s.status)).length,
    accepted: submissions.filter(s => s.status === 'ACCEPTED').length,
    rejected: submissions.filter(s => s.status === 'REJECTED').length,
    withdrawn: submissions.filter(s => s.status === 'WITHDRAWN').length,
  };
  
  // Filter submissions
  const filteredSubmissions = statusFilter === 'all' 
    ? submissions 
    : submissions.filter(s => {
        switch (statusFilter) {
          case 'active':
            return ['PENDING', 'UNDER_REVIEW'].includes(s.status);
          case 'accepted':
            return s.status === 'ACCEPTED';
          case 'rejected':
            return ['REJECTED', 'WAITLISTED'].includes(s.status);
          case 'withdrawn':
            return s.status === 'WITHDRAWN';
          default:
            return true;
        }
      });

  const buildFilterUrl = (filter: StatusFilter) => {
    return filter === 'all' ? '/submissions' : `/submissions?status=${filter}`;
  };
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          My Submissions
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Track your talk submissions across all events
        </p>
      </div>

      {submissions.length > 0 ? (
        <>
          {/* Stats Overview */}
          <StatsCardGrid columns={4} className="mb-8">
            <StatsCard
              title="Total Submissions"
              value={stats.total}
              icon={FileText}
              variant="blue"
            />
            <StatsCard
              title="Active"
              value={stats.active}
              icon={Clock}
              variant="orange"
              description="Pending review"
            />
            <StatsCard
              title="Accepted"
              value={stats.accepted}
              icon={CheckCircle}
              variant="green"
            />
            <StatsCard
              title="Not Selected"
              value={stats.rejected}
              icon={XCircle}
              variant="red"
            />
          </StatsCardGrid>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
            <Link href={buildFilterUrl('all')}>
              <Badge 
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                className="cursor-pointer px-3 py-1.5 text-sm"
              >
                All ({stats.total})
              </Badge>
            </Link>
            <Link href={buildFilterUrl('active')}>
              <Badge 
                variant={statusFilter === 'active' ? 'default' : 'outline'}
                className="cursor-pointer px-3 py-1.5 text-sm"
              >
                <span className="w-2 h-2 rounded-full bg-amber-500 mr-2" />
                Active ({stats.active})
              </Badge>
            </Link>
            <Link href={buildFilterUrl('accepted')}>
              <Badge 
                variant={statusFilter === 'accepted' ? 'default' : 'outline'}
                className="cursor-pointer px-3 py-1.5 text-sm"
              >
                <span className="w-2 h-2 rounded-full bg-green-500 mr-2" />
                Accepted ({stats.accepted})
              </Badge>
            </Link>
            <Link href={buildFilterUrl('rejected')}>
              <Badge 
                variant={statusFilter === 'rejected' ? 'default' : 'outline'}
                className="cursor-pointer px-3 py-1.5 text-sm"
              >
                <span className="w-2 h-2 rounded-full bg-red-500 mr-2" />
                Not Selected ({stats.rejected})
              </Badge>
            </Link>
            {stats.withdrawn > 0 && (
              <Link href={buildFilterUrl('withdrawn')}>
                <Badge 
                  variant={statusFilter === 'withdrawn' ? 'default' : 'outline'}
                  className="cursor-pointer px-3 py-1.5 text-sm"
                >
                  Withdrawn ({stats.withdrawn})
                </Badge>
              </Link>
            )}
          </div>
          
          {/* Submissions List */}
          <div className="space-y-3">
            {filteredSubmissions.length > 0 ? (
              filteredSubmissions.map((submission) => (
                <SubmissionCard key={submission.id} submission={submission} />
              ))
            ) : (
              <div className="text-center py-12">
                <p className="text-slate-500 dark:text-slate-400">
                  No submissions match this filter
                </p>
              </div>
            )}
          </div>
        </>
      ) : (
        <EmptyState />
      )}
    </div>
  );
}

interface SubmissionCardProps {
  submission: {
    id: string;
    title: string;
    status: string;
    createdAt: Date;
    event: {
      id: string;
      name: string;
      slug: string;
      startDate: Date | null;
    };
    track: {
      id: string;
      name: string;
      color: string | null;
    } | null;
    format: {
      id: string;
      name: string;
      durationMin: number;
    } | null;
    _count: {
      reviews: number;
      messages: number;
    };
  };
}

function SubmissionCard({ submission }: SubmissionCardProps) {
  const config = statusConfig[submission.status] || statusConfig.PENDING;
  const StatusIcon = config.icon;
  
  return (
    <Link href={`/events/${submission.event.slug}/submissions/${submission.id}`}>
      <Card className={cn(
        "hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 border-l-4",
        submission.status === 'ACCEPTED' && "border-l-green-500",
        submission.status === 'REJECTED' && "border-l-red-500",
        submission.status === 'WITHDRAWN' && "border-l-slate-400 opacity-60",
        ['PENDING', 'UNDER_REVIEW'].includes(submission.status) && "border-l-amber-500",
        submission.status === 'WAITLISTED' && "border-l-purple-500",
      )}>
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            {/* Status Icon */}
            <div className={cn("p-2.5 rounded-lg flex-shrink-0", config.bgColor)}>
              <StatusIcon className={cn("h-5 w-5", config.color)} />
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Badge className={cn("text-xs border-0", config.bgColor, config.color)}>
                  {config.label}
                </Badge>
                {submission.track && (
                  <Badge 
                    variant="outline" 
                    className="text-xs"
                    style={{ 
                      borderColor: submission.track.color || undefined,
                      color: submission.track.color || undefined,
                    }}
                  >
                    {submission.track.name}
                  </Badge>
                )}
                {submission.format && (
                  <Badge variant="secondary" className="text-xs">
                    {submission.format.durationMin}min
                  </Badge>
                )}
              </div>
              
              <h3 className="font-semibold text-slate-900 dark:text-white line-clamp-1 group-hover:text-primary">
                {submission.title}
              </h3>
              
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {submission.event.name}
              </p>
              
              <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDistanceToNow(submission.createdAt, { addSuffix: true })}
                </span>
                {submission._count.messages > 0 && (
                  <span className="flex items-center gap-1 text-primary">
                    <MessageSquare className="h-3 w-3" />
                    {submission._count.messages} message{submission._count.messages !== 1 ? 's' : ''}
                  </span>
                )}
                {submission._count.reviews > 0 && (
                  <span className="flex items-center gap-1">
                    {submission._count.reviews} review{submission._count.reviews !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
            
            {/* Arrow */}
            <ChevronRight className="h-5 w-5 text-slate-400 flex-shrink-0 self-center" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16">
      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
        <FileText className="h-10 w-10 text-slate-400" />
      </div>
      <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
        No submissions yet
      </h3>
      <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md mx-auto">
        Find events with open calls for papers and submit your talk ideas to get started!
      </p>
      <Button asChild size="lg">
        <Link href="/browse">
          <Search className="mr-2 h-5 w-5" />
          Browse Events
        </Link>
      </Button>
    </div>
  );
}
