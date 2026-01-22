/**
 * Edit Talk Page
 * 
 * Modern, polished page for editing talk proposals.
 */

import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Pencil, Sparkles } from 'lucide-react';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { Button } from '@/components/ui/button';
import { TalkForm } from '@/components/talks/talk-form';

export const metadata = {
  title: 'Edit Talk',
  description: 'Edit your talk proposal',
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditTalkPage({ params }: PageProps) {
  const session = await auth();
  
  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  const { id } = await params;

  const talk = await prisma.talk.findUnique({
    where: { id },
    include: {
      _count: {
        select: { submissions: true },
      },
    },
  });

  if (!talk) {
    notFound();
  }

  if (talk.userId !== session.user.id) {
    redirect('/talks');
  }

  return (
    <div className="min-h-screen">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 dark:from-purple-950/30 dark:via-indigo-950/30 dark:to-blue-950/30 border-b">
        <div className="container max-w-4xl py-8">
          <Button variant="ghost" asChild className="mb-4 -ml-2 text-muted-foreground hover:text-foreground">
            <Link href={`/talks/${talk.id}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Talk
            </Link>
          </Button>
          
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg shadow-purple-500/25">
              <Pencil className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-purple-400 dark:to-indigo-400 bg-clip-text text-transparent">
                Edit Talk
              </h1>
              <p className="text-muted-foreground mt-1 text-lg truncate">
                {talk.title}
              </p>
              <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <span>Rich text formatting available for all content fields</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="container max-w-4xl py-8">
        <TalkForm mode="edit" talk={talk} />
      </div>
    </div>
  );
}
