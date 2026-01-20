/**
 * Home Page
 * 
 * Landing page that:
 * - Redirects to /setup if no admin exists (fresh install)
 * - Redirects authenticated users to dashboard
 * - Shows public events list for unauthenticated users
 */

// Force dynamic rendering - this page checks database for setup status
export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { config } from '@/lib/env';
import { PoweredByFooter } from '@/components/ui/powered-by-footer';
import { PublicEventsList } from '@/components/public/events-list';
import { Calendar, LogIn, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default async function Home() {
  // Check if setup is complete (has at least one admin)
  const adminCount = await prisma.user.count({
    where: { role: 'ADMIN' },
  });

  // If no admin exists, redirect to setup
  if (adminCount === 0) {
    redirect('/setup');
  }

  const session = await auth();
  
  // Redirect authenticated users to dashboard
  if (session?.user) {
    redirect('/dashboard');
  }

  // Get site settings
  const siteSettings = await prisma.siteSettings.findUnique({
    where: { id: 'default' },
    select: {
      name: true,
      description: true,
      logoUrl: true,
      websiteUrl: true,
    },
  });

  // Get published events
  const now = new Date();
  const events = await prisma.event.findMany({
    where: { isPublished: true },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      location: true,
      startDate: true,
      endDate: true,
      cfpOpensAt: true,
      cfpClosesAt: true,
      _count: {
        select: { submissions: true },
      },
    },
    orderBy: [
      { startDate: 'asc' },
    ],
  });

  // Categorize events
  const openCfpEvents = events.filter(
    (e) => e.cfpOpensAt && e.cfpClosesAt && now >= e.cfpOpensAt && now <= e.cfpClosesAt
  );
  const upcomingEvents = events.filter(
    (e) => e.startDate && e.startDate > now && !openCfpEvents.includes(e)
  );
  const pastEvents = events.filter(
    (e) => e.startDate && e.startDate <= now
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {siteSettings?.logoUrl && (
              <img
                src={siteSettings.logoUrl}
                alt={siteSettings.name || ''}
                className="h-8 w-8 rounded-lg object-cover"
              />
            )}
            <h1 className="font-bold text-xl text-slate-900 dark:text-white">
              {siteSettings?.name || config.app.name}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link href="/auth/signin">
                <LogIn className="mr-2 h-4 w-4" />
                Sign In
              </Link>
            </Button>
            <Button asChild>
              <Link href="/auth/signup">
                <UserPlus className="mr-2 h-4 w-4" />
                Create Account
              </Link>
            </Button>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="container mx-auto px-4 py-12 md:py-16">
            <div className="max-w-3xl">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
                {siteSettings?.description || 'Conference Call for Papers'}
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400">
                Browse our events and submit your talk proposals. Create an account to track your submissions and get updates.
              </p>
            </div>
          </div>
        </section>

        {/* Events */}
        <section className="container mx-auto px-4 py-12">
          {events.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 mb-6">
                <Calendar className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                No Events Yet
              </h3>
              <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                There are no published events at the moment. Check back soon or create an account to be notified when new events are announced.
              </p>
              <Button asChild className="mt-6">
                <Link href="/auth/signup">
                  Create Account
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-12">
              {/* Open CFP Events */}
              {openCfpEvents.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-6">
                    <span className="inline-block w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                      Open for Submissions
                    </h3>
                    <span className="text-sm text-slate-500">
                      ({openCfpEvents.length})
                    </span>
                  </div>
                  <PublicEventsList events={openCfpEvents} showCfpStatus />
                </div>
              )}

              {/* Upcoming Events */}
              {upcomingEvents.length > 0 && (
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">
                    Upcoming Events
                    <span className="text-sm text-slate-500 font-normal ml-2">
                      ({upcomingEvents.length})
                    </span>
                  </h3>
                  <PublicEventsList events={upcomingEvents} />
                </div>
              )}

              {/* Past Events */}
              {pastEvents.length > 0 && (
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">
                    Past Events
                    <span className="text-sm text-slate-500 font-normal ml-2">
                      ({pastEvents.length})
                    </span>
                  </h3>
                  <PublicEventsList events={pastEvents} isPast />
                </div>
              )}
            </div>
          )}
        </section>
      </main>
      
      {/* Footer */}
      <PoweredByFooter />
    </div>
  );
}
