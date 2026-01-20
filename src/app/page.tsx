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
      isVirtual: true,
      venueCity: true,
      country: true,
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
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            {siteSettings?.logoUrl && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={siteSettings.logoUrl}
                alt={siteSettings.name || ''}
                className="h-9 w-9 rounded-xl object-cover shadow-sm"
              />
            )}
            <h1 className="font-bold text-xl text-slate-900 dark:text-white">
              {siteSettings?.name || config.app.name}
            </h1>
          </Link>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Button asChild className="shadow-sm">
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
                <Button asChild className="shadow-sm">
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
                <section key="hero" className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
                  {/* Background Pattern */}
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NDEgMC0xOCA4LjA1OS0xOCAxOHM4LjA1OSAxOCAxOCAxOGM5Ljk0MSAwIDE4LTguMDU5IDE4LTE4cy04LjA1OS0xOC0xOC0xOHptMCAzMmMtNy43MzIgMC0xNC02LjI2OC0xNC0xNHM2LjI2OC0xNCAxNC0xNHMxNCA2LjI2OCAxNCAxNC02LjI2OCAxNC0xNCAxNHoiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iLjAyIi8+PC9nPjwvc3ZnPg==')] opacity-50" />
                  
                  <div className="relative container mx-auto px-4 py-16 md:py-24">
                    <div className="max-w-3xl">
                      {siteSettings?.landingPageContent ? (
                        <div className="prose prose-invert prose-lg max-w-none">
                          <LandingPageContent content={siteSettings.landingPageContent} />
                        </div>
                      ) : (
                        <>
                          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-sm font-medium mb-6">
                            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                            Now accepting submissions
                          </div>
                          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                            {siteSettings?.description || 'Call for Papers'}
                          </h2>
                          <p className="text-xl text-slate-300 mb-8 leading-relaxed">
                            Share your expertise with our community. Browse upcoming events and submit your talk proposals today.
                          </p>
                          {!isAuthenticated && (
                            <div className="flex flex-wrap gap-4">
                              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/25" asChild>
                                <Link href="/auth/signup">
                                  <UserPlus className="mr-2 h-5 w-5" />
                                  Create Account
                                </Link>
                              </Button>
                              <Button size="lg" variant="outline" className="border-slate-600 text-white hover:bg-slate-800" asChild>
                                <Link href="#events">
                                  Browse Events
                                </Link>
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </section>
              );

            case 'open-cfps':
              if (openCfpEvents.length === 0) return null;
              return (
                <section key="open-cfps" id="events" className="container mx-auto px-4 py-12 md:py-16">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30">
                      <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                        Open for Submissions
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {openCfpEvents.length} event{openCfpEvents.length !== 1 ? 's' : ''} accepting proposals
                      </p>
                    </div>
                  </div>
                  <PublicEventsList events={openCfpEvents} showCfpStatus />
                </section>
              );

            case 'upcoming-events':
              if (upcomingEvents.length === 0) return null;
              return (
                <section key="upcoming-events" className="container mx-auto px-4 py-12 md:py-16 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30">
                      <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                        Upcoming Events
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {upcomingEvents.length} event{upcomingEvents.length !== 1 ? 's' : ''} coming soon
                      </p>
                    </div>
                  </div>
                  <PublicEventsList events={upcomingEvents} />
                </section>
              );

            case 'past-events':
              if (pastEvents.length === 0) return null;
              return (
                <section key="past-events" className="container mx-auto px-4 py-12 md:py-16 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800">
                      <Calendar className="w-5 h-5 text-slate-500" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                        Past Events
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {pastEvents.length} completed event{pastEvents.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
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
