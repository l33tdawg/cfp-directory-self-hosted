/**
 * Welcome Page
 * 
 * Displayed after a new user registers, with special messaging for the first admin.
 * Redirects users to onboarding to complete their speaker profile.
 */

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CheckCircle, ShieldCheck, ArrowRight, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';

export const metadata = {
  title: 'Welcome',
  description: 'Welcome to CFP Directory Self-Hosted',
};

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ admin?: string }>;
}) {
  const params = await searchParams;
  const isAdmin = params.admin === 'true';
  
  // Check if user needs to complete onboarding
  const session = await auth();
  let needsOnboarding = false;
  
  if (session?.user?.id) {
    const profile = await prisma.speakerProfile.findUnique({
      where: { userId: session.user.id },
      select: { onboardingCompleted: true },
    });
    needsOnboarding = !profile?.onboardingCompleted;
  }
  
  // If not admin and needs onboarding, redirect directly
  if (!isAdmin && needsOnboarding) {
    redirect('/onboarding/speaker');
  }
  
  return (
    <div className="text-center space-y-6">
      <div className="flex justify-center">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
          isAdmin 
            ? 'bg-blue-100 dark:bg-blue-900/30' 
            : 'bg-green-100 dark:bg-green-900/30'
        }`}>
          {isAdmin ? (
            <ShieldCheck className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          ) : (
            <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
          )}
        </div>
      </div>
      
      <div>
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">
          {isAdmin ? 'Welcome, Administrator!' : 'Welcome!'}
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {isAdmin 
            ? 'Your account has been created with administrator privileges. You have full access to manage CFP Directory Self-Hosted.'
            : 'Your account has been created successfully. You can now submit talks and track your submissions.'
          }
        </p>
      </div>
      
      {isAdmin && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-left">
          <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
            Getting Started
          </h3>
          <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-2">
            <li className="flex items-start gap-2">
              <span className="font-medium">1.</span>
              <span>Complete your speaker profile</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-medium">2.</span>
              <span>Set up your first event with CFP details</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-medium">3.</span>
              <span>Invite team members to help review submissions</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-medium">4.</span>
              <span>Publish your CFP and start receiving submissions</span>
            </li>
          </ul>
        </div>
      )}
      
      <div className="space-y-3 pt-2">
        {needsOnboarding ? (
          <Button asChild className="w-full">
            <Link href="/onboarding/speaker">
              <User className="mr-2 h-4 w-4" />
              Complete Your Profile
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        ) : (
          <Button asChild className="w-full">
            <Link href="/dashboard">
              Go to Dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        )}
        
        {isAdmin && (
          <Button asChild variant="outline" className="w-full">
            <Link href="/settings">
              Admin Settings
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
