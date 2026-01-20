/**
 * Onboarding Layout
 * 
 * Simple layout for onboarding pages with centered content.
 */

import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Complete Your Profile',
  description: 'Set up your speaker profile to start submitting talks',
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12">
      <div className="container max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {children}
      </div>
    </div>
  );
}
