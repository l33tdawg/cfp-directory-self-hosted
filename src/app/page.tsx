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
import { decryptPiiFields, REVIEWER_PROFILE_PII_FIELDS } from '@/lib/security/encryption';
import { PoweredByFooter } from '@/components/ui/powered-by-footer';
import { PublicEventsList } from '@/components/public/events-list';
import { ReviewTeamSection } from '@/components/public/review-team-section';
import { LandingPageContent } from '@/components/public/landing-page-content';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { Calendar, UserPlus } from 'lucide-react';
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
  // Only show reviewers with completed profiles that should appear on team page
  const reviewerProfiles = await prisma.reviewerProfile.findMany({
    where: {
      showOnTeamPage: true,
      onboardingCompleted: true,
    },
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
      displayOrder: true,
      user: {
        select: {
          image: true,
        },
      },
    },
    orderBy: [
      { displayOrder: 'asc' },
      { fullName: 'asc' },
    ],
  });

  // Map to the expected format and decrypt PII fields
  const mappedReviewers = reviewerProfiles.map((r) => {
    const decrypted = decryptPiiFields(
      r as unknown as Record<string, unknown>,
      REVIEWER_PROFILE_PII_FIELDS
    );
    return {
      id: r.id,
      fullName: (decrypted.fullName as string) || 'Reviewer',
      designation: decrypted.designation as string | null,
      company: decrypted.company as string | null,
      bio: decrypted.bio as string | null,
      photoUrl: (decrypted.photoUrl as string) || r.user?.image || null,
      expertiseAreas: r.expertiseAreas || [],
      linkedinUrl: decrypted.linkedinUrl as string | null,
      twitterHandle: decrypted.twitterHandle as string | null,
      githubUsername: decrypted.githubUsername as string | null,
      websiteUrl: decrypted.websiteUrl as string | null,
    };
  });

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 dark:bg-slate-950">
      {/* Header - Glassmorphism */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-slate-200 dark:border-white/10">
        <div className="absolute inset-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl" />
        <div className="relative container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            {siteSettings?.logoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={siteSettings.logoUrl}
                alt={siteSettings.name || ''}
                className="h-10 w-10 rounded-xl object-cover ring-2 ring-slate-200 dark:ring-white/10 group-hover:ring-slate-300 dark:group-hover:ring-white/20 transition-all"
              />
            ) : (
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-white" />
              </div>
            )}
            <span className="font-bold text-xl text-slate-900 dark:text-white group-hover:text-slate-700 dark:group-hover:text-white/90 transition-colors">
              {siteSettings?.name || config.app.name}
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {isAuthenticated ? (
              <Button asChild className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white/90 shadow-lg shadow-slate-900/10 dark:shadow-white/10">
                <Link href="/dashboard">
                  Dashboard
                </Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" asChild className="text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10">
                  <Link href="/auth/signin">
                    Sign In
                  </Link>
                </Button>
                <Button asChild className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white border-0 shadow-lg shadow-violet-500/25">
                  <Link href="/auth/signup">
                    Get Started
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>
      
      {/* Main Content - Sections rendered dynamically based on configuration */}
      <main className="flex-1 pt-16">
        {enabledSections.map((section) => {
          switch (section.id) {
            case 'hero':
              return (
                <section key="hero" className="relative min-h-[80vh] flex items-center overflow-hidden">
                  {/* Animated Gradient Background */}
                  <div className="absolute inset-0 bg-slate-100 dark:bg-slate-950">
                    {/* Aurora gradient orbs */}
                    <div className="absolute top-0 -left-40 w-96 h-96 bg-violet-500/20 dark:bg-violet-500/30 rounded-full blur-[128px] animate-pulse" />
                    <div className="absolute top-20 right-0 w-80 h-80 bg-fuchsia-500/15 dark:bg-fuchsia-500/20 rounded-full blur-[128px] animate-pulse" style={{ animationDelay: '1s' }} />
                    <div className="absolute bottom-0 left-1/3 w-72 h-72 bg-cyan-500/15 dark:bg-cyan-500/20 rounded-full blur-[128px] animate-pulse" style={{ animationDelay: '2s' }} />
                    <div className="absolute -bottom-20 right-1/4 w-96 h-96 bg-violet-600/15 dark:bg-violet-600/20 rounded-full blur-[128px] animate-pulse" style={{ animationDelay: '0.5s' }} />
                    {/* Grid overlay */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
                  </div>
                  
                  <div className="relative container mx-auto px-4 py-16 md:py-24">
                    <div className="max-w-4xl mx-auto">
                      {siteSettings?.landingPageContent ? (
                        <>
                          {/* Custom content from WYSIWYG editor */}
                          <LandingPageContent content={siteSettings.landingPageContent} />
                          
                          {/* CTAs below custom content */}
                          <div className="flex flex-wrap justify-center gap-4 mt-10">
                            {isAuthenticated ? (
                              <>
                                <Button size="lg" className="h-14 px-8 text-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white border-0 shadow-2xl shadow-violet-500/30 transition-all hover:shadow-violet-500/40 hover:scale-105" asChild>
                                  <Link href="/dashboard">
                                    Go to Dashboard
                                  </Link>
                                </Button>
                                <Button size="lg" className="h-14 px-8 text-lg bg-slate-900/10 dark:bg-white/10 border border-slate-900/20 dark:border-white/20 text-slate-900 dark:text-white hover:bg-slate-900/20 dark:hover:bg-white/20 hover:border-slate-900/30 dark:hover:border-white/30 backdrop-blur-sm" asChild>
                                  <Link href="#events">
                                    View Events
                                  </Link>
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button size="lg" className="h-14 px-8 text-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white border-0 shadow-2xl shadow-violet-500/30 transition-all hover:shadow-violet-500/40 hover:scale-105" asChild>
                                  <Link href="/auth/signup">
                                    <UserPlus className="mr-2 h-5 w-5" />
                                    Submit a Talk
                                  </Link>
                                </Button>
                                <Button size="lg" className="h-14 px-8 text-lg bg-slate-900/10 dark:bg-white/10 border border-slate-900/20 dark:border-white/20 text-slate-900 dark:text-white hover:bg-slate-900/20 dark:hover:bg-white/20 hover:border-slate-900/30 dark:hover:border-white/30 backdrop-blur-sm" asChild>
                                  <Link href="#events">
                                    View CFP Details
                                  </Link>
                                </Button>
                              </>
                            )}
                          </div>
                          
                          {/* Stats below CTAs */}
                          {(events.length > 0 || mappedReviewers.length > 0) && (
                            <div className="mt-12 grid grid-cols-2 md:grid-cols-3 gap-8 max-w-xl mx-auto">
                              {events.length > 0 && (
                                <div className="text-center">
                                  <div className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">{events.length}</div>
                                  <div className="text-sm text-slate-500 dark:text-white/50 mt-1">{events.length === 1 ? 'Event' : 'Events'}</div>
                                </div>
                              )}
                              {openCfpEvents.length > 0 && (
                                <div className="text-center">
                                  <div className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">{openCfpEvents.length}</div>
                                  <div className="text-sm text-slate-500 dark:text-white/50 mt-1">Open {openCfpEvents.length === 1 ? 'CFP' : 'CFPs'}</div>
                                </div>
                              )}
                              {mappedReviewers.length > 0 && (
                                <div className="text-center">
                                  <div className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">{mappedReviewers.length}</div>
                                  <div className="text-sm text-slate-500 dark:text-white/50 mt-1">{mappedReviewers.length === 1 ? 'Reviewer' : 'Reviewers'}</div>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-center">
                          {/* Status Badge - shows if CFPs are open */}
                          {openCfpEvents.length > 0 ? (
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/5 dark:bg-white/5 border border-slate-900/10 dark:border-white/10 backdrop-blur-sm mb-8">
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                              </span>
                              <span className="text-sm font-medium text-slate-700 dark:text-white/80">
                                {openCfpEvents.length === 1 ? 'CFP Now Open' : `${openCfpEvents.length} Open CFPs`}
                              </span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/5 dark:bg-white/5 border border-slate-900/10 dark:border-white/10 backdrop-blur-sm mb-8">
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                              <span className="text-sm font-medium text-slate-700 dark:text-white/80">Check back for upcoming CFPs</span>
                            </div>
                          )}
                          
                          {/* Main Headline - Uses site name or generic */}
                          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 tracking-tight">
                            <span className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-600 dark:from-white dark:via-white dark:to-white/60 bg-clip-text text-transparent">
                              {siteSettings?.name || 'Call for'}
                            </span>
                            <br />
                            <span className="bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-600 dark:from-violet-400 dark:via-fuchsia-400 dark:to-cyan-400 bg-clip-text text-transparent">
                              {siteSettings?.name ? 'Call for Papers' : 'Papers'}
                            </span>
                          </h1>
                          
                          {/* Subtitle */}
                          <p className="text-xl md:text-2xl text-slate-600 dark:text-white/60 mb-10 max-w-2xl mx-auto leading-relaxed">
                            {siteSettings?.description || 'Submit your talk proposals for our upcoming conference. We welcome speakers of all experience levels.'}
                          </p>
                          
                          {/* CTAs */}
                          {!isAuthenticated && (
                            <div className="flex flex-wrap justify-center gap-4">
                              <Button size="lg" className="h-14 px-8 text-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white border-0 shadow-2xl shadow-violet-500/30 transition-all hover:shadow-violet-500/40 hover:scale-105" asChild>
                                <Link href="/auth/signup">
                                  <UserPlus className="mr-2 h-5 w-5" />
                                  Submit a Talk
                                </Link>
                              </Button>
                              <Button size="lg" className="h-14 px-8 text-lg bg-slate-900/10 dark:bg-white/10 border border-slate-900/20 dark:border-white/20 text-slate-900 dark:text-white hover:bg-slate-900/20 dark:hover:bg-white/20 hover:border-slate-900/30 dark:hover:border-white/30 backdrop-blur-sm" asChild>
                                <Link href="#events">
                                  View CFP Details
                                </Link>
                              </Button>
                            </div>
                          )}
                          
                          {/* Stats - only show if there's meaningful data */}
                          {(events.length > 0 || mappedReviewers.length > 0) && (
                            <div className="mt-16 grid grid-cols-2 md:grid-cols-3 gap-8 max-w-xl mx-auto">
                              {events.length > 0 && (
                                <div className="text-center">
                                  <div className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">{events.length}</div>
                                  <div className="text-sm text-slate-500 dark:text-white/50 mt-1">{events.length === 1 ? 'Event' : 'Events'}</div>
                                </div>
                              )}
                              {openCfpEvents.length > 0 && (
                                <div className="text-center">
                                  <div className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">{openCfpEvents.length}</div>
                                  <div className="text-sm text-slate-500 dark:text-white/50 mt-1">Open {openCfpEvents.length === 1 ? 'CFP' : 'CFPs'}</div>
                                </div>
                              )}
                              {mappedReviewers.length > 0 && (
                                <div className="text-center">
                                  <div className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">{mappedReviewers.length}</div>
                                  <div className="text-sm text-slate-500 dark:text-white/50 mt-1">{mappedReviewers.length === 1 ? 'Reviewer' : 'Reviewers'}</div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Scroll indicator */}
                  <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
                    <div className="w-6 h-10 rounded-full border-2 border-slate-900/20 dark:border-white/20 flex items-start justify-center p-2">
                      <div className="w-1 h-2 bg-slate-900/40 dark:bg-white/40 rounded-full animate-bounce" />
                    </div>
                  </div>
                </section>
              );

            case 'open-cfps':
              if (openCfpEvents.length === 0) return null;
              return (
                <section key="open-cfps" id="events" className="relative py-20 md:py-28">
                  {/* Background */}
                  <div className="absolute inset-0 bg-gradient-to-b from-slate-100 via-slate-50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" />
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
                  
                  <div className="relative container mx-auto px-4">
                    {/* Section Header */}
                    <div className="text-center mb-12">
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                        </span>
                        <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                          {openCfpEvents.length} Open CFP{openCfpEvents.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
                        Open for Submissions
                      </h2>
                      <p className="text-lg text-slate-600 dark:text-white/50 max-w-2xl mx-auto">
                        Don&apos;t miss your chance to speak. Submit your proposals to these events.
                      </p>
                    </div>
                    
                    <PublicEventsList events={openCfpEvents} showCfpStatus />
                  </div>
                </section>
              );

            case 'upcoming-events':
              if (upcomingEvents.length === 0) return null;
              return (
                <section key="upcoming-events" className="relative py-20 md:py-28">
                  <div className="absolute inset-0 bg-slate-200/50 dark:bg-slate-900/50" />
                  
                  <div className="relative container mx-auto px-4">
                    <div className="text-center mb-12">
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 mb-6">
                        <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                          {upcomingEvents.length} Upcoming
                        </span>
                      </div>
                      <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
                        Upcoming Events
                      </h2>
                      <p className="text-lg text-slate-600 dark:text-white/50 max-w-2xl mx-auto">
                        Mark your calendars for these exciting events.
                      </p>
                    </div>
                    
                    <PublicEventsList events={upcomingEvents} />
                  </div>
                </section>
              );

            case 'past-events':
              if (pastEvents.length === 0) return null;
              return (
                <section key="past-events" className="relative py-20 md:py-28">
                  <div className="absolute inset-0 bg-slate-100 dark:bg-slate-950" />
                  
                  <div className="relative container mx-auto px-4">
                    <div className="text-center mb-12">
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/5 dark:bg-white/5 border border-slate-900/10 dark:border-white/10 mb-6">
                        <Calendar className="h-4 w-4 text-slate-400 dark:text-white/40" />
                        <span className="text-sm font-medium text-slate-500 dark:text-white/40">
                          {pastEvents.length} Completed
                        </span>
                      </div>
                      <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
                        Past Events
                      </h2>
                      <p className="text-lg text-slate-600 dark:text-white/50 max-w-2xl mx-auto">
                        Browse our archive of successful events.
                      </p>
                    </div>
                    
                    <PublicEventsList events={pastEvents} isPast />
                  </div>
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
          <section className="relative py-20 md:py-28">
            <div className="absolute inset-0 bg-slate-100 dark:bg-slate-950" />
            <div className="relative container mx-auto px-4">
              <div className="max-w-md mx-auto text-center">
                <div className="relative inline-block">
                  <div className="absolute -inset-4 bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 rounded-full blur-xl" />
                  <div className="relative w-20 h-20 rounded-2xl bg-slate-200/60 dark:bg-slate-900/60 border border-slate-300 dark:border-white/10 flex items-center justify-center mb-6">
                    <Calendar className="h-10 w-10 text-slate-400 dark:text-white/30" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                  No Events Yet
                </h3>
                <p className="text-slate-600 dark:text-white/50 mb-8">
                  {isAuthenticated 
                    ? 'There are no published events at the moment. Check back soon!'
                    : 'There are no published events at the moment. Create an account to be notified when new events are announced.'
                  }
                </p>
                {!isAuthenticated && (
                  <Button asChild className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 border-0 shadow-lg shadow-violet-500/25">
                    <Link href="/auth/signup">
                      <UserPlus className="mr-2 h-4 w-4" />
                      Create Account
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </section>
        )}
      </main>
      
      {/* Footer */}
      <PoweredByFooter />
    </div>
  );
}
