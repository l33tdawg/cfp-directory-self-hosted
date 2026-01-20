'use client';

/**
 * Dashboard Layout Client Component
 * 
 * Client-side wrapper for the dashboard layout that handles
 * role-specific sidebar rendering and responsive behavior.
 */

import { DashboardHeader } from '@/components/layout/dashboard-header';
import { SpeakerSidebar } from '@/components/layout/speaker-sidebar';
import { OrganizerSidebar } from '@/components/layout/organizer-sidebar';
import { ReviewerSidebar } from '@/components/layout/reviewer-sidebar';
import { AdminSidebar } from '@/components/layout/admin-sidebar';

type UserRole = 'SPEAKER' | 'ORGANIZER' | 'REVIEWER' | 'ADMIN';

interface DashboardLayoutClientProps {
  children: React.ReactNode;
  siteName: string;
  userName: string;
  userRole: UserRole;
  federationEnabled: boolean;
}

export function DashboardLayoutClient({
  children,
  siteName,
  userName,
  userRole,
  federationEnabled,
}: DashboardLayoutClientProps) {
  // Render role-specific sidebar
  const renderSidebar = () => {
    switch (userRole) {
      case 'ADMIN':
        return (
          <AdminSidebar 
            userName={userName} 
            federationEnabled={federationEnabled} 
          />
        );
      case 'ORGANIZER':
        return (
          <OrganizerSidebar 
            userName={userName} 
          />
        );
      case 'REVIEWER':
        return (
          <ReviewerSidebar 
            userName={userName} 
          />
        );
      case 'SPEAKER':
      default:
        return (
          <SpeakerSidebar 
            userName={userName} 
          />
        );
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Header - Fixed at top */}
      <DashboardHeader
        siteName={siteName}
        userName={userName}
        userRole={userRole}
        federationEnabled={federationEnabled}
      />
      
      {/* Main Layout with Sidebar */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar - Hidden on mobile, shown on lg+ */}
        <div className="hidden lg:flex lg:flex-shrink-0">
          {renderSidebar()}
        </div>
        
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900">
          {children}
        </main>
      </div>
    </div>
  );
}
