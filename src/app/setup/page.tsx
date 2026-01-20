/**
 * Setup Wizard Page
 * 
 * First-run setup for creating the initial admin and organization.
 * Redirects to home if setup is already complete.
 */

// Force dynamic rendering - this page checks database
export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db/prisma';
import { SetupWizard } from './setup-wizard';

export const metadata = {
  title: 'Setup - CFP Directory',
  description: 'Complete the initial setup for your CFP system',
};

export default async function SetupPage() {
  // Check if setup is already complete
  const adminExists = await prisma.user.count({
    where: { role: 'ADMIN' },
  });

  if (adminExists > 0) {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <SetupWizard />
    </div>
  );
}
