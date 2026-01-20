/**
 * Edit Talk Page
 */

import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
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
    <div className="container max-w-3xl py-8">
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" asChild className="mb-4">
          <Link href={`/talks/${talk.id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Talk
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Edit Talk</h1>
        <p className="text-muted-foreground mt-1">
          Update your talk proposal details.
        </p>
      </div>

      {/* Form */}
      <TalkForm mode="edit" talk={talk} />
    </div>
  );
}
