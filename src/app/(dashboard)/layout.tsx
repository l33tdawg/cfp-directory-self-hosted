/**
 * Dashboard Layout
 * 
 * Layout for authenticated pages with role-specific navigation.
 * Includes header, sidebar, and footer components.
 */

import { config } from '@/lib/env';
import { getSiteSettings } from '@/lib/api/auth';
import { auth } from '@/lib/auth';
import { DashboardLayoutClient } from './dashboard-layout-client';
import { PoweredByFooter } from '@/components/ui/powered-by-footer';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const settings = await getSiteSettings();
  
  const siteName = settings?.name || config.app.name;
  const federationEnabled = settings?.federationEnabled || false;
  const userName = session?.user?.name || session?.user?.email?.split('@')[0] || 'User';
  const userRole = (session?.user?.role as 'SPEAKER' | 'ORGANIZER' | 'REVIEWER' | 'ADMIN') || 'SPEAKER';
  
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
      <DashboardLayoutClient
        siteName={siteName}
        userName={userName}
        userRole={userRole}
        federationEnabled={federationEnabled}
      >
        {children}
      </DashboardLayoutClient>
      
      {/* Footer */}
      <PoweredByFooter />
    </div>
  );
}
