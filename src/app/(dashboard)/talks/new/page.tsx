/**
 * Create New Talk Page
 * 
 * Modern, polished page for creating new talk proposals.
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Sparkles, FileText } from 'lucide-react';
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
    <div className="min-h-screen">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/30 dark:via-indigo-950/30 dark:to-purple-950/30 border-b">
        <div className="container max-w-4xl py-8">
          <Button variant="ghost" asChild className="mb-4 -ml-2 text-muted-foreground hover:text-foreground">
            <Link href="/talks">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Talks
            </Link>
          </Button>
          
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25">
              <FileText className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                Create New Talk
              </h1>
              <p className="text-muted-foreground mt-1 text-lg">
                Craft a compelling talk proposal that you can submit to multiple events
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
        <TalkForm mode="create" />
      </div>
    </div>
  );
}
