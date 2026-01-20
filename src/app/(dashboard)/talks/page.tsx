/**
 * Talks Library Page
 * 
 * Lists all user's reusable talk proposals.
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus, Search, Archive, FileText, Clock, Tag } from 'lucide-react';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDuration, getTalkTypeLabel } from '@/lib/validations/talk';

export const metadata = {
  title: 'My Talks',
  description: 'Manage your reusable talk proposals',
};

export default async function TalksPage() {
  const session = await auth();
  
  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  const talks = await prisma.talk.findMany({
    where: { 
      userId: session.user.id,
      isArchived: false,
    },
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: {
        select: { submissions: true },
      },
    },
  });

  const archivedCount = await prisma.talk.count({
    where: { 
      userId: session.user.id,
      isArchived: true,
    },
  });

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Talks</h1>
          <p className="text-muted-foreground mt-1">
            Manage your reusable talk proposals. Submit them to multiple events.
          </p>
        </div>
        <Button asChild>
          <Link href="/talks/new">
            <Plus className="mr-2 h-4 w-4" />
            New Talk
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Talks</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{talks.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {talks.reduce((sum, t) => sum + t._count.submissions, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Archived</CardTitle>
            <Archive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{archivedCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Talks List */}
      {talks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No talks yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first talk proposal to submit to events.
            </p>
            <Button asChild>
              <Link href="/talks/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Talk
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {talks.map((talk) => (
            <Link key={talk.id} href={`/talks/${talk.id}`}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-xl">{talk.title}</CardTitle>
                      <CardDescription className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Badge variant="outline">
                            {getTalkTypeLabel(talk.type)}
                          </Badge>
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDuration(talk.durationMin)}
                        </span>
                        <span>
                          {talk._count.submissions} submission{talk._count.submissions !== 1 ? 's' : ''}
                        </span>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {talk.abstract}
                  </p>
                  {talk.tags.length > 0 && (
                    <div className="flex items-center gap-2 mt-3">
                      <Tag className="h-3 w-3 text-muted-foreground" />
                      <div className="flex flex-wrap gap-1">
                        {talk.tags.slice(0, 5).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {talk.tags.length > 5 && (
                          <Badge variant="secondary" className="text-xs">
                            +{talk.tags.length - 5} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
