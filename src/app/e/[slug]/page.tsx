/**
 * Public Event Detail Page
 * 
 * Displays full event information and CFP details without requiring authentication.
 * Users can view all details and click "Submit a Talk" to register/login and submit.
 * 
 * Updated to match landing page dark theme with glassmorphism styling.
 */

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db/prisma';
import { auth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PoweredByFooter } from '@/components/ui/powered-by-footer';
import { 
  Calendar, 
  MapPin, 
  Globe, 
  Clock, 
  Users, 
  ExternalLink,
  ArrowLeft,
  Send,
  Info,
  Gift,
  BookOpen,
  Sparkles,
  Layers,
  Mic
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function PublicEventPage({ params }: PageProps) {
  const { slug } = await params;
  const session = await auth();
  
  const event = await prisma.event.findUnique({
    where: { slug },
    include: {
      formats: true,
      tracks: true,
      _count: {
        select: { submissions: true },
      },
    },
  });

  // Only show published events publicly
  if (!event || !event.isPublished) {
    notFound();
  }

  const now = new Date();
  const cfpOpensAt = event.cfpOpensAt ? new Date(event.cfpOpensAt) : null;
  const cfpClosesAt = event.cfpClosesAt ? new Date(event.cfpClosesAt) : null;
  const startDate = event.startDate ? new Date(event.startDate) : null;
  const endDate = event.endDate ? new Date(event.endDate) : null;

  const isCfpOpen = cfpOpensAt && cfpClosesAt && now >= cfpOpensAt && now <= cfpClosesAt;
  const isCfpUpcoming = cfpOpensAt && now < cfpOpensAt;
  const isCfpClosed = cfpClosesAt && now > cfpClosesAt;
  const daysUntilClose = cfpClosesAt && isCfpOpen ? differenceInDays(cfpClosesAt, now) : null;

  const formatDateRange = (start: Date | null, end: Date | null) => {
    if (!start) return 'Date TBD';
    if (!end || start.toDateString() === end.toDateString()) {
      return format(start, 'MMMM d, yyyy');
    }
    if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
      return `${format(start, 'MMMM d')} - ${format(end, 'd, yyyy')}`;
    }
    return `${format(start, 'MMMM d')} - ${format(end, 'MMMM d, yyyy')}`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      {/* Header - Glassmorphism */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10">
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl" />
        <div className="relative container mx-auto px-4 h-16 flex items-center justify-between">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            <span>Back to Events</span>
          </Link>
          <div className="flex items-center gap-3">
            {session ? (
              <Button asChild className="bg-white text-slate-900 hover:bg-white/90 shadow-lg shadow-white/10">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" asChild className="text-white/70 hover:text-white hover:bg-white/10">
                  <Link href="/auth/signin">Sign In</Link>
                </Button>
                <Button asChild className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white border-0 shadow-lg shadow-violet-500/25">
                  <Link href="/auth/signup">Get Started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>
      
      <main className="flex-1 pt-16">
        {/* Hero Section */}
        <section className="relative min-h-[50vh] flex items-center overflow-hidden">
          {/* Animated Gradient Background */}
          <div className="absolute inset-0 bg-slate-950">
            <div className="absolute top-0 -left-40 w-96 h-96 bg-violet-500/30 rounded-full blur-[128px] animate-pulse" />
            <div className="absolute top-20 right-0 w-80 h-80 bg-fuchsia-500/20 rounded-full blur-[128px] animate-pulse" style={{ animationDelay: '1s' }} />
            <div className="absolute bottom-0 left-1/3 w-72 h-72 bg-cyan-500/20 rounded-full blur-[128px] animate-pulse" style={{ animationDelay: '2s' }} />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
          </div>
          
          <div className="relative container mx-auto px-4 py-16 md:py-24">
            <div className="max-w-4xl">
              {/* Status Badges */}
              <div className="flex flex-wrap gap-2 mb-6">
                {isCfpOpen && (
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    <span className="text-sm font-medium text-emerald-400">CFP Open</span>
                  </div>
                )}
                {isCfpUpcoming && (
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20">
                    <Clock className="h-4 w-4 text-blue-400" />
                    <span className="text-sm font-medium text-blue-400">CFP Opens Soon</span>
                  </div>
                )}
                {isCfpClosed && (
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
                    <span className="text-sm font-medium text-white/60">CFP Closed</span>
                  </div>
                )}
                {event.isVirtual && (
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20">
                    <Globe className="h-4 w-4 text-violet-400" />
                    <span className="text-sm font-medium text-violet-400">Virtual Event</span>
                  </div>
                )}
              </div>

              {/* Event Title */}
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 tracking-tight">
                {event.name}
              </h1>

              {/* Key Info Row */}
              <div className="flex flex-wrap gap-6 text-white/70 mb-8">
                {startDate && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-violet-400" />
                    <span>{formatDateRange(startDate, endDate)}</span>
                  </div>
                )}
                {event.isVirtual ? (
                  <div className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-violet-400" />
                    <span>Online Event</span>
                  </div>
                ) : event.venueCity && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-violet-400" />
                    <span>{event.venueCity}{event.country ? `, ${event.country}` : ''}</span>
                  </div>
                )}
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-wrap gap-4">
                {isCfpOpen && (
                  <Button size="lg" className="h-14 px-8 text-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white border-0 shadow-2xl shadow-violet-500/30 transition-all hover:shadow-violet-500/40 hover:scale-105" asChild>
                    <Link href={session ? `/dashboard/events/${event.slug}/submit` : `/auth/signin?callbackUrl=/dashboard/events/${event.slug}/submit`}>
                      <Send className="h-5 w-5 mr-2" />
                      Submit Your Talk
                    </Link>
                  </Button>
                )}
                {event.websiteUrl && (
                  <Button size="lg" className="h-14 px-8 text-lg bg-white/10 border border-white/20 text-white hover:bg-white/20 hover:border-white/30 backdrop-blur-sm" asChild>
                    <a href={event.websiteUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-5 w-5 mr-2" />
                      Event Website
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* CFP Deadline Banner */}
        {isCfpOpen && cfpClosesAt && (
          <div className={`py-4 px-4 text-center font-medium ${
            daysUntilClose !== null && daysUntilClose <= 7 
              ? 'bg-gradient-to-r from-orange-500/20 to-rose-500/20 border-y border-orange-500/20 text-orange-400' 
              : 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border-y border-emerald-500/20 text-emerald-400'
          }`}>
            <Clock className="h-4 w-4 inline mr-2" />
            CFP closes {format(cfpClosesAt, 'MMMM d, yyyy')}
            {daysUntilClose !== null && (
              <span className="ml-2">
                ({daysUntilClose === 0 ? 'Last day!' : `${daysUntilClose} day${daysUntilClose === 1 ? '' : 's'} left`})
              </span>
            )}
          </div>
        )}

        {/* Main Content */}
        <section className="relative py-16 md:py-20">
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
          
          <div className="relative container mx-auto px-4">
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Left Column - Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* About */}
                {event.description && (
                  <div className="group relative">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-500/30 to-fuchsia-500/30 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-all duration-500" />
                    <div className="relative p-6 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10 group-hover:border-white/20 transition-all">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center">
                          <Info className="h-5 w-5 text-violet-400" />
                        </div>
                        <h2 className="text-xl font-semibold text-white">About This Event</h2>
                      </div>
                      <div 
                        className="prose prose-invert prose-violet max-w-none text-white/70 prose-headings:text-white prose-strong:text-white prose-a:text-violet-400"
                        dangerouslySetInnerHTML={{ __html: event.description }}
                      />
                    </div>
                  </div>
                )}

                {/* CFP Guidelines */}
                {event.cfpGuidelines && (
                  <div className="group relative">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/30 to-blue-500/30 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-all duration-500" />
                    <div className="relative p-6 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10 group-hover:border-white/20 transition-all">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
                          <BookOpen className="h-5 w-5 text-cyan-400" />
                        </div>
                        <div>
                          <h2 className="text-xl font-semibold text-white">Submission Guidelines</h2>
                          <p className="text-sm text-white/50">Please review before submitting your proposal</p>
                        </div>
                      </div>
                      <div 
                        className="prose prose-invert prose-cyan max-w-none text-white/70 prose-headings:text-white prose-strong:text-white prose-a:text-cyan-400 mt-4"
                        dangerouslySetInnerHTML={{ __html: event.cfpGuidelines }}
                      />
                    </div>
                  </div>
                )}

                {/* Speaker Benefits */}
                {event.speakerBenefits && (
                  <div className="group relative">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/30 to-teal-500/30 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-all duration-500" />
                    <div className="relative p-6 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10 group-hover:border-white/20 transition-all">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
                          <Gift className="h-5 w-5 text-emerald-400" />
                        </div>
                        <div>
                          <h2 className="text-xl font-semibold text-white">Speaker Benefits</h2>
                          <p className="text-sm text-white/50">What we offer to our speakers</p>
                        </div>
                      </div>
                      <div 
                        className="prose prose-invert prose-emerald max-w-none text-white/70 prose-headings:text-white prose-strong:text-white prose-a:text-emerald-400 mt-4"
                        dangerouslySetInnerHTML={{ __html: event.speakerBenefits }}
                      />
                    </div>
                  </div>
                )}

                {/* Tracks */}
                {event.tracks.length > 0 && (
                  <div className="group relative">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500/30 to-rose-500/30 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-all duration-500" />
                    <div className="relative p-6 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10 group-hover:border-white/20 transition-all">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-rose-500/20 flex items-center justify-center">
                          <Layers className="h-5 w-5 text-orange-400" />
                        </div>
                        <div>
                          <h2 className="text-xl font-semibold text-white">Tracks</h2>
                          <p className="text-sm text-white/50">Submit your talk to one of these tracks</p>
                        </div>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {event.tracks.map((track) => (
                          <div 
                            key={track.id}
                            className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all"
                            style={{ borderLeftColor: track.color || undefined, borderLeftWidth: track.color ? '3px' : undefined }}
                          >
                            <h4 className="font-medium text-white">{track.name}</h4>
                            {track.description && (
                              <p className="text-sm text-white/50 mt-1">{track.description}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Session Formats */}
                {event.formats.length > 0 && (
                  <div className="group relative">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-500/30 to-purple-500/30 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-all duration-500" />
                    <div className="relative p-6 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10 group-hover:border-white/20 transition-all">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center">
                          <Mic className="h-5 w-5 text-pink-400" />
                        </div>
                        <div>
                          <h2 className="text-xl font-semibold text-white">Session Formats</h2>
                          <p className="text-sm text-white/50">Available presentation formats</p>
                        </div>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {event.formats.map((fmt) => (
                          <div 
                            key={fmt.id}
                            className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all flex items-center justify-between"
                          >
                            <h4 className="font-medium text-white">{fmt.name}</h4>
                            {fmt.durationMin && (
                              <Badge className="bg-white/10 text-white/70 border border-white/10 hover:bg-white/20">
                                {fmt.durationMin} min
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column - Sidebar */}
              <div className="space-y-6">
                {/* Quick Info Card */}
                <div className="relative">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-500/50 to-fuchsia-500/50 rounded-2xl blur opacity-30" />
                  <div className="relative p-6 rounded-2xl bg-slate-900/80 backdrop-blur-xl border border-white/10">
                    <h3 className="text-lg font-semibold text-white mb-5">Event Details</h3>
                    
                    <div className="space-y-5">
                      {/* Date */}
                      {startDate && (
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-lg bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                            <Calendar className="h-4 w-4 text-violet-400" />
                          </div>
                          <div>
                            <p className="font-medium text-white">{formatDateRange(startDate, endDate)}</p>
                            <p className="text-sm text-white/50">Event Date</p>
                          </div>
                        </div>
                      )}

                      <div className="border-t border-white/10" />

                      {/* Location */}
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                          {event.isVirtual ? (
                            <Globe className="h-4 w-4 text-violet-400" />
                          ) : (
                            <MapPin className="h-4 w-4 text-violet-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-white">
                            {event.isVirtual ? 'Virtual Event' : (event.venueName || event.venueCity || 'Location TBD')}
                          </p>
                          <p className="text-sm text-white/50">
                            {event.isVirtual ? 'Online' : ([event.venueCity, event.country].filter(Boolean).join(', ') || 'Venue')}
                          </p>
                        </div>
                      </div>

                      {cfpOpensAt && cfpClosesAt && (
                        <>
                          <div className="border-t border-white/10" />
                          
                          {/* CFP Timeline */}
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-lg bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                              <Clock className="h-4 w-4 text-violet-400" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-white">CFP Timeline</p>
                              <div className="text-sm text-white/50 mt-1 space-y-1">
                                <p className="flex justify-between">
                                  <span>Opens:</span>
                                  <span className="text-white/70">{format(cfpOpensAt, 'MMM d, yyyy')}</span>
                                </p>
                                <p className="flex justify-between">
                                  <span>Closes:</span>
                                  <span className="text-white/70">{format(cfpClosesAt, 'MMM d, yyyy')}</span>
                                </p>
                              </div>
                            </div>
                          </div>
                        </>
                      )}

                      <div className="border-t border-white/10" />

                      {/* Stats */}
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                          <Users className="h-4 w-4 text-violet-400" />
                        </div>
                        <div>
                          <p className="font-medium text-white">{event._count.submissions} Submissions</p>
                          <p className="text-sm text-white/50">Received so far</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit CTA Card */}
                {isCfpOpen && (
                  <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-2xl blur opacity-50 group-hover:opacity-75 transition-all duration-500" />
                    <div className="relative p-6 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600">
                      <div className="text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/20 flex items-center justify-center">
                          <Send className="h-8 w-8 text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Ready to Submit?</h3>
                        <p className="text-white/80 mb-5">Share your expertise with our community</p>
                        <Button 
                          size="lg" 
                          className="w-full bg-white text-violet-600 hover:bg-white/90 font-semibold shadow-lg"
                          asChild
                        >
                          <Link href={session ? `/dashboard/events/${event.slug}/submit` : `/auth/signin?callbackUrl=/dashboard/events/${event.slug}/submit`}>
                            Submit Your Talk
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* CFP Upcoming Card */}
                {isCfpUpcoming && cfpOpensAt && (
                  <div className="relative">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/50 to-cyan-500/50 rounded-2xl blur opacity-30" />
                    <div className="relative p-6 rounded-2xl bg-slate-900/80 backdrop-blur-xl border border-blue-500/20">
                      <div className="text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-500/20 flex items-center justify-center">
                          <Clock className="h-8 w-8 text-blue-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">CFP Opens Soon</h3>
                        <p className="text-white/50 mb-2">Submissions open on</p>
                        <p className="text-lg font-semibold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                          {format(cfpOpensAt, 'MMMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* CFP Closed Card */}
                {isCfpClosed && (
                  <div className="relative">
                    <div className="relative p-6 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10">
                      <div className="text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center">
                          <Sparkles className="h-8 w-8 text-white/40" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">CFP Closed</h3>
                        <p className="text-white/50">Submissions are no longer accepted for this event.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
      
      {/* Footer */}
      <PoweredByFooter />
    </div>
  );
}
