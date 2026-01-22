/**
 * Speaker Profile Page
 * 
 * Allows speakers to view and edit their profile after onboarding.
 */

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { ProfileEditor } from '@/components/profile/profile-editor';

export const metadata = {
  title: 'My Profile',
  description: 'Manage your speaker profile',
};

export default async function ProfilePage() {
  const session = await auth();
  
  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  const [user, profile] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true, image: true },
    }),
    prisma.speakerProfile.findUnique({
      where: { userId: session.user.id },
    }),
  ]);

  if (!user) {
    redirect('/auth/signin');
  }

  // If no profile exists, redirect to onboarding
  if (!profile) {
    redirect('/onboarding/speaker');
  }

  return (
    <div className="container max-w-3xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
        <p className="text-muted-foreground mt-1">
          Update your speaker profile information.
        </p>
      </div>

      <ProfileEditor profile={profile} />
    </div>
  );
}
