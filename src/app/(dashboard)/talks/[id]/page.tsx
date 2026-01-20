/**
 * View Talk Page
 */

import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Edit, Clock, Users, Tag, Send } from 'lucide-react';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDuration, getTalkTypeLabel } from '@/lib/validations/talk';
import { getAudienceTypeLabel } from '@/lib/constants/speaker-options';

export const metadata = {
  title: 'View Talk',
  description: 'View talk details',
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ViewTalkPage({ params }: PageProps) {
  const session = await auth();
  
  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  const { id } = await params;

  const talk = await prisma.talk.findUnique({
    where: { id },
    include: {
      submissions: {
        select: {
          id: true,
          status: true,
          createdAt: true,
          event: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!talk) {
    notFound();
  }

  if (talk.userId !== session.user.id) {
    redirect('/talks');
  }

  const statusColors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    UNDER_REVIEW: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    ACCEPTED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    WAITLISTED: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    WITHDRAWN: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  };

  return (
    <div className="container max-w-4xl py-8">
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/talks">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Talks
          </Link>
        </Button>
        
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {talk.isArchived && (
                <Badge variant="secondary">Archived</Badge>
              )}
              <Badge variant="outline">{getTalkTypeLabel(talk.type)}</Badge>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">{talk.title}</h1>
            <div className="flex items-center gap-4 mt-2 text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {formatDuration(talk.durationMin)}
              </span>
              <span>
                {talk.submissions.length} submission{talk.submissions.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          <Button asChild>
            <Link href={`/talks/${talk.id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Abstract */}
        <Card>
          <CardHeader>
            <CardTitle>Abstract</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{talk.abstract}</p>
          </CardContent>
        </Card>

        {/* Extended Description */}
        {talk.description && (
          <Card>
            <CardHeader>
              <CardTitle>Extended Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{talk.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Outline */}
        {talk.outline && (
          <Card>
            <CardHeader>
              <CardTitle>Talk Outline</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap font-sans">{talk.outline}</pre>
            </CardContent>
          </Card>
        )}

        {/* Target Audience & Prerequisites */}
        <div className="grid gap-6 md:grid-cols-2">
          {talk.targetAudience.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Target Audience
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {talk.targetAudience.map((audience) => (
                    <Badge key={audience} variant="secondary">
                      {getAudienceTypeLabel(audience)}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {talk.prerequisites && (
            <Card>
              <CardHeader>
                <CardTitle>Prerequisites</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{talk.prerequisites}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Tags */}
        {talk.tags.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Tags
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {talk.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Speaker Notes (Private) */}
        {talk.speakerNotes && (
          <Card>
            <CardHeader>
              <CardTitle>Speaker Notes</CardTitle>
              <CardDescription>Private - only visible to you</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{talk.speakerNotes}</p>
            </CardContent>
          </Card>
        )}

        {/* Submissions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  Submissions
                </CardTitle>
                <CardDescription>
                  Events where you&apos;ve submitted this talk
                </CardDescription>
              </div>
              <Button asChild variant="outline">
                <Link href="/events">
                  Submit to Event
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {talk.submissions.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                This talk hasn&apos;t been submitted to any events yet.
              </p>
            ) : (
              <div className="space-y-3">
                {talk.submissions.map((submission) => (
                  <Link
                    key={submission.id}
                    href={`/events/${submission.event.slug}/submissions/${submission.id}`}
                    className="block"
                  >
                    <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                      <div>
                        <p className="font-medium">{submission.event.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Submitted {new Date(submission.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge className={statusColors[submission.status]}>
                        {submission.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
