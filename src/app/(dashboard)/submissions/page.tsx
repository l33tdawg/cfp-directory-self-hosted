/**
 * My Submissions Page
 * 
 * Lists all submissions by the current user across all events.
 */

import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { FileText, Calendar, ChevronRight, Search } from 'lucide-react';
import { format } from 'date-fns';

export const metadata = {
  title: 'My Submissions',
};

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  UNDER_REVIEW: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  ACCEPTED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  WAITLISTED: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  WITHDRAWN: 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200',
};

const statusLabels: Record<string, string> = {
  PENDING: 'Pending',
  UNDER_REVIEW: 'Under Review',
  ACCEPTED: 'Accepted',
  REJECTED: 'Not Selected',
  WAITLISTED: 'Waitlisted',
  WITHDRAWN: 'Withdrawn',
};

export default async function SubmissionsPage() {
  const user = await getCurrentUser();
  
  const submissions = await prisma.submission.findMany({
    where: { speakerId: user.id },
    include: {
      event: {
        select: {
          id: true,
          name: true,
          slug: true,
          startDate: true,
          organization: {
            select: {
              name: true,
            },
          },
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
  
  // Group submissions by status
  const groupedSubmissions = {
    active: submissions.filter(s => ['PENDING', 'UNDER_REVIEW'].includes(s.status)),
    decided: submissions.filter(s => ['ACCEPTED', 'REJECTED', 'WAITLISTED'].includes(s.status)),
    withdrawn: submissions.filter(s => s.status === 'WITHDRAWN'),
  };
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          My Submissions
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Track your CFP submissions across all events
        </p>
      </div>
      
      {submissions.length > 0 ? (
        <div className="space-y-8">
          {/* Active Submissions */}
          {groupedSubmissions.active.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Active ({groupedSubmissions.active.length})
              </h2>
              <div className="space-y-4">
                {groupedSubmissions.active.map((submission) => (
                  <SubmissionCard key={submission.id} submission={submission} />
                ))}
              </div>
            </section>
          )}
          
          {/* Decided Submissions */}
          {groupedSubmissions.decided.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Decided ({groupedSubmissions.decided.length})
              </h2>
              <div className="space-y-4">
                {groupedSubmissions.decided.map((submission) => (
                  <SubmissionCard key={submission.id} submission={submission} />
                ))}
              </div>
            </section>
          )}
          
          {/* Withdrawn Submissions */}
          {groupedSubmissions.withdrawn.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 text-slate-500">
                Withdrawn ({groupedSubmissions.withdrawn.length})
              </h2>
              <div className="space-y-4 opacity-60">
                {groupedSubmissions.withdrawn.map((submission) => (
                  <SubmissionCard key={submission.id} submission={submission} />
                ))}
              </div>
            </section>
          )}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <FileText className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
            No submissions yet
          </h3>
          <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
            Find events with open CFPs and submit your talk ideas!
          </p>
          <Button asChild>
            <Link href="/events">
              <Search className="mr-2 h-4 w-4" />
              Browse Events
            </Link>
          </Button>
        </div>
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
      organization: {
        name: string;
      };
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
  return (
    <Link href={`/events/${submission.event.slug}/submissions/${submission.id}`}>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge className={statusColors[submission.status]}>
                  {statusLabels[submission.status]}
                </Badge>
                {submission.track && (
                  <Badge 
                    variant="outline" 
                    style={{ borderColor: submission.track.color || undefined }}
                  >
                    {submission.track.name}
                  </Badge>
                )}
              </div>
              <h3 className="font-medium text-slate-900 dark:text-white truncate">
                {submission.title}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {submission.event.organization.name} • {submission.event.name}
              </p>
              <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Submitted {format(submission.createdAt, 'MMM d, yyyy')}
                </span>
                {submission.format && (
                  <span>{submission.format.name} ({submission.format.durationMin}m)</span>
                )}
                {submission._count.messages > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {submission._count.messages} messages
                  </Badge>
                )}
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-400 flex-shrink-0" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
