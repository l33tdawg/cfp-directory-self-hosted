/**
 * Public Event Detail Page
 * 
 * Displays full event information and CFP details without requiring authentication.
 * Users can view all details and click "Submit a Talk" to register/login and submit.
 */

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db/prisma';
import { auth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar, 
  MapPin, 
  Globe, 
  Clock, 
  Users, 
  FileText,
  ExternalLink,
  ArrowLeft,
  Send,
  CheckCircle2,
  Info,
  Gift,
  BookOpen
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 text-white">
        <div className="container mx-auto px-4 py-8">
          <Link 
            href="/" 
            className="inline-flex items-center text-white/80 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Events
          </Link>
          
          <div className="max-w-4xl">
            {/* Status Badge */}
            <div className="flex flex-wrap gap-2 mb-4">
              {isCfpOpen && (
                <Badge className="bg-green-500 text-white border-0 px-3 py-1">
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse mr-2" />
                  CFP Open
                </Badge>
              )}
              {isCfpUpcoming && (
                <Badge className="bg-blue-400 text-white border-0 px-3 py-1">
                  CFP Opens Soon
                </Badge>
              )}
              {isCfpClosed && (
                <Badge variant="secondary" className="px-3 py-1">
                  CFP Closed
                </Badge>
              )}
              {event.isVirtual && (
                <Badge variant="outline" className="border-white/30 text-white px-3 py-1">
                  <Globe className="h-3 w-3 mr-1" />
                  Virtual
                </Badge>
              )}
            </div>

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              {event.name}
            </h1>

            {/* Key Info Row */}
            <div className="flex flex-wrap gap-6 text-white/90 mb-6">
              {startDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  <span>{formatDateRange(startDate, endDate)}</span>
                </div>
              )}
              {event.isVirtual ? (
                <div className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  <span>Online Event</span>
                </div>
              ) : event.venueCity && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  <span>{event.venueCity}{event.country ? `, ${event.country}` : ''}</span>
                </div>
              )}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-3">
              {isCfpOpen && (
                <Button size="lg" className="bg-white text-indigo-600 hover:bg-white/90" asChild>
                  <Link href={session ? `/dashboard/events/${event.slug}/submit` : `/auth/signin?callbackUrl=/dashboard/events/${event.slug}/submit`}>
                    <Send className="h-5 w-5 mr-2" />
                    Submit Your Talk
                  </Link>
                </Button>
              )}
              {event.websiteUrl && (
                <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10" asChild>
                  <a href={event.websiteUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-5 w-5 mr-2" />
                    Event Website
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CFP Deadline Banner */}
      {isCfpOpen && cfpClosesAt && (
        <div className={`py-3 px-4 text-center font-medium ${
          daysUntilClose !== null && daysUntilClose <= 7 
            ? 'bg-orange-500 text-white' 
            : 'bg-green-500 text-white'
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
      <div className="container mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* About */}
            {event.description && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Info className="h-5 w-5 text-blue-500" />
                    About This Event
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div 
                    className="prose prose-slate dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: event.description }}
                  />
                </CardContent>
              </Card>
            )}

            {/* CFP Guidelines */}
            {event.cfpGuidelines && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-indigo-500" />
                    Submission Guidelines
                  </CardTitle>
                  <CardDescription>
                    Please review these guidelines before submitting your proposal
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div 
                    className="prose prose-slate dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: event.cfpGuidelines }}
                  />
                </CardContent>
              </Card>
            )}

            {/* Speaker Benefits */}
            {event.speakerBenefits && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gift className="h-5 w-5 text-green-500" />
                    Speaker Benefits
                  </CardTitle>
                  <CardDescription>
                    What we offer to our speakers
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div 
                    className="prose prose-slate dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: event.speakerBenefits }}
                  />
                </CardContent>
              </Card>
            )}

            {/* Tracks */}
            {event.tracks.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Tracks</CardTitle>
                  <CardDescription>
                    Submit your talk to one of these tracks
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {event.tracks.map((track) => (
                      <div 
                        key={track.id}
                        className="p-4 rounded-lg border border-slate-200 dark:border-slate-700"
                        style={{ borderLeftColor: track.color || undefined, borderLeftWidth: track.color ? '4px' : undefined }}
                      >
                        <h4 className="font-medium text-slate-900 dark:text-white">
                          {track.name}
                        </h4>
                        {track.description && (
                          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                            {track.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Session Formats */}
            {event.formats.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Session Formats</CardTitle>
                  <CardDescription>
                    Available presentation formats
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {event.formats.map((format) => (
                      <div 
                        key={format.id}
                        className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-between"
                      >
                        <h4 className="font-medium text-slate-900 dark:text-white">
                          {format.name}
                        </h4>
                        {format.durationMin && (
                          <Badge variant="secondary">
                            {format.durationMin} min
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Quick Info Card */}
            <Card>
              <CardHeader>
                <CardTitle>Event Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Date */}
                {startDate && (
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-slate-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {formatDateRange(startDate, endDate)}
                      </p>
                      <p className="text-sm text-slate-500">Event Date</p>
                    </div>
                  </div>
                )}

                <Separator />

                {/* Location */}
                <div className="flex items-start gap-3">
                  {event.isVirtual ? (
                    <>
                      <Globe className="h-5 w-5 text-slate-400 mt-0.5" />
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">
                          Virtual Event
                        </p>
                        <p className="text-sm text-slate-500">Online</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <MapPin className="h-5 w-5 text-slate-400 mt-0.5" />
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">
                          {event.venueName || event.venueCity || 'Location TBD'}
                        </p>
                        <p className="text-sm text-slate-500">
                          {[event.venueCity, event.country].filter(Boolean).join(', ') || 'Venue'}
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {cfpOpensAt && cfpClosesAt && (
                  <>
                    <Separator />
                    
                    {/* CFP Timeline */}
                    <div className="flex items-start gap-3">
                      <Clock className="h-5 w-5 text-slate-400 mt-0.5" />
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">
                          CFP Timeline
                        </p>
                        <div className="text-sm text-slate-500 mt-1 space-y-1">
                          <p className="flex justify-between">
                            <span>Opens:</span>
                            <span>{format(cfpOpensAt, 'MMM d, yyyy')}</span>
                          </p>
                          <p className="flex justify-between">
                            <span>Closes:</span>
                            <span>{format(cfpClosesAt, 'MMM d, yyyy')}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <Separator />

                {/* Stats */}
                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">
                      {event._count.submissions} Submissions
                    </p>
                    <p className="text-sm text-slate-500">Received so far</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Submit CTA Card */}
            {isCfpOpen && (
              <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-0">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <Send className="h-12 w-12 mx-auto mb-4 opacity-80" />
                    <h3 className="text-xl font-bold mb-2">Ready to Submit?</h3>
                    <p className="text-white/80 mb-4">
                      Share your expertise with our community
                    </p>
                    <Button 
                      size="lg" 
                      className="w-full bg-white text-indigo-600 hover:bg-white/90"
                      asChild
                    >
                      <Link href={session ? `/dashboard/events/${event.slug}/submit` : `/auth/signin?callbackUrl=/dashboard/events/${event.slug}/submit`}>
                        Submit Your Talk
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* CFP Upcoming Card */}
            {isCfpUpcoming && cfpOpensAt && (
              <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <Clock className="h-12 w-12 mx-auto mb-4 text-blue-500" />
                    <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">
                      CFP Opens Soon
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-2">
                      Submissions open on
                    </p>
                    <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                      {format(cfpOpensAt, 'MMMM d, yyyy')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
