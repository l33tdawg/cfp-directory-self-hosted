/**
 * Create New Talk Page
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { auth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { TalkForm } from '@/components/talks/talk-form';

export const metadata = {
  title: 'New Talk',
  description: 'Create a new talk proposal',
};

export default async function NewTalkPage() {
  const session = await auth();
  
  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  return (
    <div className="container max-w-3xl py-8">
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/talks">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Talks
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Create New Talk</h1>
        <p className="text-muted-foreground mt-1">
          Create a reusable talk proposal that you can submit to multiple events.
        </p>
      </div>

      {/* Form */}
      <TalkForm mode="create" />
    </div>
  );
}
