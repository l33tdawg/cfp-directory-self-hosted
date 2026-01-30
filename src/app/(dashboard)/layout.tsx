/**
 * Dashboard Layout
 * 
 * Layout for authenticated pages with role-specific navigation.
 * Includes header, sidebar, and footer components.
 * Redirects users to onboarding if they haven't completed their speaker profile.
 */

import { redirect } from 'next/navigation';
import { config } from '@/lib/env';
import { getSiteSettings } from '@/lib/api/auth';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { DashboardLayoutClient } from './dashboard-layout-client';
import { PoweredByFooter } from '@/components/ui/powered-by-footer';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  
  // Redirect to sign in if not authenticated
  if (!session?.user?.id) {
    redirect('/auth/signin');
  }
  
  // Check if user needs to complete speaker onboarding
  // SECURITY FIX: Apply to both USER and SPEAKER roles to prevent bypassing onboarding
  // ADMIN, ORGANIZER, REVIEWER skip this check
  const userRole = (session.user.role as 'USER' | 'SPEAKER' | 'ORGANIZER' | 'REVIEWER' | 'ADMIN') || 'USER';
  
  // Both USER and SPEAKER roles require onboarding completion
  if (userRole === 'USER' || userRole === 'SPEAKER') {
    const speakerProfile = await prisma.speakerProfile.findUnique({
      where: { userId: session.user.id },
      select: { onboardingCompleted: true },
    });
    
    // Redirect to onboarding if profile is not complete
    if (!speakerProfile?.onboardingCompleted) {
      redirect('/onboarding/speaker');
    }
  }
  
  const settings = await getSiteSettings();
  
  const siteName = settings?.name || config.app.name;
  const federationEnabled = settings?.federationEnabled || false;
  const userName = session?.user?.name || session?.user?.email?.split('@')[0] || 'User';
  
  // Fetch pending reviews count for reviewers
  let pendingReviews = 0;
  if (['REVIEWER', 'ORGANIZER', 'ADMIN'].includes(userRole)) {
    pendingReviews = await prisma.submission.count({
      where: {
        status: { in: ['PENDING', 'UNDER_REVIEW'] },
        reviews: {
          none: { reviewerId: session.user.id },
        },
      },
    });
  }
  
  // Map USER role to SPEAKER for display purposes
  const displayRole = userRole === 'USER' ? 'SPEAKER' : userRole;
  
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
      <DashboardLayoutClient
        siteName={siteName}
        userName={userName}
        userRole={displayRole as 'SPEAKER' | 'ORGANIZER' | 'REVIEWER' | 'ADMIN'}
        federationEnabled={federationEnabled}
        pendingReviews={pendingReviews}
      >
        {children}
      </DashboardLayoutClient>
      
      {/* Footer */}
      <PoweredByFooter />
    </div>
  );
}
