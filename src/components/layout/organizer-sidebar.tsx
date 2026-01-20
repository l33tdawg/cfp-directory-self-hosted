'use client';

/**
 * Organizer Sidebar Component
 * 
 * Navigation sidebar for event organizers to manage their events,
 * submissions, and team.
 */

import Link from 'next/link';
import { 
  LayoutDashboard,
  Calendar,
  Users,
  Settings,
  FileText,
  BarChart3,
  ClipboardCheck,
  Plus,
  MessageSquare
} from 'lucide-react';
import { SidebarNav, NavItem } from './sidebar-nav';

interface OrganizerSidebarProps {
  userName?: string;
  eventCount?: number;
  pendingSubmissions?: number;
}

export function OrganizerSidebar({ 
  userName = 'Organizer',
  eventCount = 0,
  pendingSubmissions = 0
}: OrganizerSidebarProps) {
  
  const organizerNavItems: NavItem[] = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      description: "Overview of your events"
    },
    {
      title: "Events",
      href: "/events",
      icon: Calendar,
      description: "Manage your events"
    },
    {
      title: "Submissions",
      href: "/submissions",
      icon: FileText,
      description: "Review talk proposals",
      badge: pendingSubmissions > 0 ? pendingSubmissions : undefined
    },
    {
      title: "Settings",
      href: "/settings",
      icon: Settings,
      description: "Site and federation settings"
    }
  ];

  return (
    <SidebarNav
      items={organizerNavItems}
      title="Organizer Dashboard"
      subtitle="Manage your events and submissions"
      userName={userName}
      userRole="Organizer"
      gradientFrom="from-orange-600"
      gradientTo="to-amber-600"
      avatarBg="bg-orange-600"
    >
      {/* Quick Actions */}
      <div className="mt-8">
        <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
          Quick Actions
        </h3>
        <div className="space-y-2">
          <Link
            href="/events/new"
            className="flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 group"
          >
            <Plus className="mr-3 h-4 w-4 text-orange-600 dark:text-orange-400" />
            <span className="text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white">
              Create Event
            </span>
          </Link>
        </div>
      </div>

      {/* Stats */}
      {eventCount > 0 && (
        <div className="mt-8 p-4 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950 dark:to-amber-950 rounded-lg">
          <p className="text-xs font-medium text-orange-900 dark:text-orange-100 mb-2">
            Your Events
          </p>
          <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
            {eventCount}
          </p>
          <p className="text-xs text-orange-600 dark:text-orange-400">
            Active events
          </p>
        </div>
      )}

      {/* Help Section */}
      <div className="mt-8 p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-lg">
        <p className="text-xs font-medium text-slate-900 dark:text-slate-100 mb-2">
          Need Help?
        </p>
        <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
          Check out the documentation to learn about all features.
        </p>
        <a 
          href="https://github.com/l33tdawg/cfp-directory-self-hosted#readme"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-orange-600 dark:text-orange-400 hover:underline"
        >
          View Documentation →
        </a>
      </div>
    </SidebarNav>
  );
}
