/**
 * Admin Events Page
 * 
 * Event management dashboard for administrators.
 */

import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Calendar, TrendingUp } from 'lucide-react';
import { EventsGrid } from '@/components/admin/events-grid';

export const metadata = {
  title: 'Event Management',
};

export const dynamic = 'force-dynamic';

export default async function AdminEventsPage() {
  const user = await getCurrentUser();
  
  if (user.role !== 'ADMIN' && user.role !== 'ORGANIZER') {
    redirect('/dashboard?error=unauthorized');
  }
  
  // Fetch all events with submission stats
  const events = await prisma.event.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      isPublished: true,
      cfpOpensAt: true,
      cfpClosesAt: true,
      startDate: true,
      _count: {
        select: { submissions: true },
      },
    },
    orderBy: [
      { isPublished: 'desc' },
      { cfpClosesAt: 'desc' },
      { createdAt: 'desc' },
    ],
  });
  
  // Fetch submission stats for each event
  const eventsWithStats = await Promise.all(
    events.map(async (event) => {
      const [submissionStats, reviewStats] = await Promise.all([
        // Submission status breakdown
        prisma.submission.groupBy({
          by: ['status'],
          where: { eventId: event.id },
          _count: true,
        }),
        
        // Review stats
        prisma.review.aggregate({
          where: { submission: { eventId: event.id } },
          _count: true,
        }).then(async (reviewCount) => {
          const reviewedSubmissions = await prisma.submission.count({
            where: {
              eventId: event.id,
              reviews: { some: {} },
            },
          });
          return {
            totalReviews: reviewCount._count,
            reviewedSubmissions,
          };
        }),
      ]);
      
      // Convert to object format
      const statsObj = {
        pending: 0,
        accepted: 0,
        rejected: 0,
        underReview: 0,
      };
      
      submissionStats.forEach((stat) => {
        switch (stat.status) {
          case 'PENDING':
            statsObj.pending = stat._count;
            break;
          case 'ACCEPTED':
            statsObj.accepted = stat._count;
            break;
          case 'REJECTED':
            statsObj.rejected = stat._count;
            break;
          case 'UNDER_REVIEW':
            statsObj.underReview = stat._count;
            break;
        }
      });
      
      return {
        ...event,
        submissionStats: statsObj,
        reviewStats,
      };
    })
  );
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header Section */}
      <div className="mb-8">
        <div className="space-y-4">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100/80 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm font-medium backdrop-blur-sm border border-green-200/50 dark:border-green-800/50">
            <Calendar className="h-4 w-4" />
            <span>Event Management</span>
            <TrendingUp className="h-4 w-4" />
          </div>
          
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">
              <span className="bg-gradient-to-r from-green-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
                Events
              </span>
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
              Manage your events, CFPs, and track submission progress
            </p>
          </div>
        </div>
      </div>
      
      {/* Events Grid */}
      <EventsGrid events={eventsWithStats} />
    </div>
  );
}
