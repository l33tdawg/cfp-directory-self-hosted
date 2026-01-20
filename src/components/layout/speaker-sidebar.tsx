'use client';

/**
 * Speaker Sidebar Component
 * 
 * Navigation sidebar for speakers to manage their talks,
 * submissions, and profile.
 */

import Link from 'next/link';
import { 
  LayoutDashboard,
  FileText, 
  User,
  Mic2,
  Calendar,
  MessageSquare,
  Library,
} from 'lucide-react';
import { SidebarNav, NavItem } from './sidebar-nav';

const speakerNavItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "Overview of your speaking activity"
  },
  {
    title: "Browse Events",
    href: "/browse",
    icon: Calendar,
    description: "Find events with open CFPs"
  },
  {
    title: "My Talks",
    href: "/talks",
    icon: Mic2,
    description: "Manage your talk proposals"
  },
  {
    title: "My Submissions",
    href: "/submissions",
    icon: FileText,
    description: "Track your talk submissions"
  },
  {
    title: "Profile",
    href: "/profile",
    icon: User,
    description: "Manage your speaker profile"
  }
];

interface SpeakerSidebarProps {
  userName?: string;
}

export function SpeakerSidebar({ userName = 'Speaker' }: SpeakerSidebarProps) {
  return (
    <SidebarNav
      items={speakerNavItems}
      title="Speaker Dashboard"
      subtitle="Find and apply to speaking opportunities"
      userName={userName}
      userRole="Speaker"
      gradientFrom="from-blue-600"
      gradientTo="to-indigo-600"
      avatarBg="bg-blue-600"
    >
      {/* Help Section */}
      <div className="mt-8 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-lg">
        <p className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-2">
          Tips for Speakers
        </p>
        <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">
          Complete your profile to stand out to event organizers.
        </p>
        <Link 
          href="/profile"
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          Update Profile →
        </Link>
      </div>
    </SidebarNav>
  );
}
