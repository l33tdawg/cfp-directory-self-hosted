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
import { ReviewTeamSection } from '@/components/public/review-team-section';
import { LandingPageContent } from '@/components/public/landing-page-content';
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
  const isAuthenticated = !!session?.user;
  const isAdmin = session?.user?.role === 'ADMIN';

  // Get site settings
  const siteSettings = await prisma.siteSettings.findUnique({
    where: { id: 'default' },
    select: {
      name: true,
      description: true,
      logoUrl: true,
      websiteUrl: true,
      landingPageContent: true,
      landingPageSections: true,
    },
  });

  // Parse section configuration
  type SectionConfig = { id: string; enabled: boolean; order: number };
  const defaultSections: SectionConfig[] = [
    { id: 'hero', enabled: true, order: 0 },
    { id: 'open-cfps', enabled: true, order: 1 },
    { id: 'upcoming-events', enabled: true, order: 2 },
    { id: 'past-events', enabled: true, order: 3 },
    { id: 'review-team', enabled: true, order: 4 },
  ];
  
  const sectionConfig = (siteSettings?.landingPageSections as SectionConfig[] | null) || defaultSections;
  const enabledSections = sectionConfig
    .filter(s => s.enabled)
    .sort((a, b) => a.order - b.order);
  
  // Helper to check if section is enabled
  const isSectionEnabled = (id: string) => enabledSections.some(s => s.id === id);

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

  // Get reviewers for "Meet our Review Team" section
  // Query users who are reviewers (by role or profile) and should be shown on team page
  const reviewerUsers = await prisma.user.findMany({
    where: {
      OR: [
        { role: 'REVIEWER' },
        { reviewerProfile: { isNot: null } },
        { reviewTeamEvents: { some: {} } },
      ],
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      reviewerProfile: {
        select: {
          id: true,
          fullName: true,
          designation: true,
          company: true,
          bio: true,
          photoUrl: true,
          expertiseAreas: true,
          linkedinUrl: true,
          twitterHandle: true,
          githubUsername: true,
          websiteUrl: true,
          showOnTeamPage: true,
          displayOrder: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  // Filter to only those who should show on team page (or don't have a profile to say otherwise)
  // Then map to the expected format
  const mappedReviewers = reviewerUsers
    .filter((u) => u.reviewerProfile?.showOnTeamPage !== false) // Include if showOnTeamPage is true or null (no profile)
    .sort((a, b) => {
      // Sort by displayOrder if available, then by name
      const orderA = a.reviewerProfile?.displayOrder ?? 999;
      const orderB = b.reviewerProfile?.displayOrder ?? 999;
      if (orderA !== orderB) return orderA - orderB;
      return (a.name || '').localeCompare(b.name || '');
    })
    .map((u) => ({
      id: u.reviewerProfile?.id || u.id,
      fullName: u.reviewerProfile?.fullName || u.name || u.email?.split('@')[0] || 'Reviewer',
      designation: u.reviewerProfile?.designation || null,
      company: u.reviewerProfile?.company || null,
      bio: u.reviewerProfile?.bio || null,
      photoUrl: u.reviewerProfile?.photoUrl || u.image || null,
      expertiseAreas: u.reviewerProfile?.expertiseAreas || [],
      linkedinUrl: u.reviewerProfile?.linkedinUrl || null,
      twitterHandle: u.reviewerProfile?.twitterHandle || null,
      githubUsername: u.reviewerProfile?.githubUsername || null,
      websiteUrl: u.reviewerProfile?.websiteUrl || null,
    }));

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {siteSettings?.logoUrl && (
              /* eslint-disable-next-line @next/next/no-img-element */
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
            {isAuthenticated ? (
              <Button asChild>
                <Link href="/dashboard">
                  Go to Dashboard
                </Link>
              </Button>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>
      </header>
      
      {/* Main Content - Sections rendered dynamically based on configuration */}
      <main className="flex-1">
        {enabledSections.map((section) => {
          switch (section.id) {
            case 'hero':
              return (
                <section key="hero" className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <div className="container mx-auto px-4 py-12 md:py-16">
                    <div className="max-w-3xl">
                      {siteSettings?.landingPageContent ? (
                        <LandingPageContent content={siteSettings.landingPageContent} />
                      ) : (
                        <>
                          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
                            {siteSettings?.description || 'Conference Call for Papers'}
                          </h2>
                          <p className="text-lg text-slate-600 dark:text-slate-400">
                            Browse our events and submit your talk proposals. Create an account to track your submissions and get updates.
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </section>
              );

            case 'open-cfps':
              if (openCfpEvents.length === 0) return null;
              return (
                <section key="open-cfps" className="container mx-auto px-4 py-12">
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
                </section>
              );

            case 'upcoming-events':
              if (upcomingEvents.length === 0) return null;
              return (
                <section key="upcoming-events" className="container mx-auto px-4 py-12">
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">
                    Upcoming Events
                    <span className="text-sm text-slate-500 font-normal ml-2">
                      ({upcomingEvents.length})
                    </span>
                  </h3>
                  <PublicEventsList events={upcomingEvents} />
                </section>
              );

            case 'past-events':
              if (pastEvents.length === 0) return null;
              return (
                <section key="past-events" className="container mx-auto px-4 py-12">
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">
                    Past Events
                    <span className="text-sm text-slate-500 font-normal ml-2">
                      ({pastEvents.length})
                    </span>
                  </h3>
                  <PublicEventsList events={pastEvents} isPast />
                </section>
              );

            case 'review-team':
              return (
                <ReviewTeamSection key="review-team" reviewers={mappedReviewers} isAdmin={isAdmin} />
              );

            default:
              return null;
          }
        })}

        {/* Show empty state if no events and events sections are enabled but empty */}
        {events.length === 0 && 
         (isSectionEnabled('open-cfps') || isSectionEnabled('upcoming-events') || isSectionEnabled('past-events')) && (
          <section className="container mx-auto px-4 py-12">
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 mb-6">
                <Calendar className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                No Events Yet
              </h3>
              <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                {isAuthenticated 
                  ? 'There are no published events at the moment. Check back soon!'
                  : 'There are no published events at the moment. Check back soon or create an account to be notified when new events are announced.'
                }
              </p>
              {!isAuthenticated && (
                <Button asChild className="mt-6">
                  <Link href="/auth/signup">
                    Create Account
                  </Link>
                </Button>
              )}
            </div>
          </section>
        )}
      </main>
      
      {/* Footer */}
      <PoweredByFooter />
    </div>
  );
}
