'use client';

/**
 * Reviewer Sidebar Component
 * 
 * Navigation sidebar for reviewers to manage their review assignments
 * and communicate with organizers.
 */

import Link from 'next/link';
import { 
  LayoutDashboard,
  FileText, 
  MessageSquare,
  User,
  CheckSquare,
  Settings,
  ClipboardCheck
} from 'lucide-react';
import { SidebarNav, NavItem } from './sidebar-nav';

interface ReviewerSidebarProps {
  userName?: string;
  pendingReviews?: number;
}

export function ReviewerSidebar({ 
  userName = 'Reviewer',
  pendingReviews = 0 
}: ReviewerSidebarProps) {
  
  const reviewerNavItems: NavItem[] = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      description: "Review overview"
    },
    {
      title: "My Reviews",
      href: "/submissions",
      icon: ClipboardCheck,
      description: "View assigned submissions",
      badge: pendingReviews > 0 ? pendingReviews : undefined
    },
    {
      title: "Profile",
      href: "/profile",
      icon: User,
      description: "Update your reviewer profile"
    }
  ];

  return (
    <SidebarNav
      items={reviewerNavItems}
      title="Reviewer Dashboard"
      subtitle="Review and evaluate submissions"
      userName={userName}
      userRole="Reviewer"
      gradientFrom="from-green-600"
      gradientTo="to-emerald-600"
      avatarBg="bg-green-600"
    >
      {/* Pending Reviews Alert */}
      {pendingReviews > 0 && (
        <div className="mt-8 p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 rounded-lg">
          <p className="text-xs font-medium text-green-900 dark:text-green-100 mb-2">
            Pending Reviews
          </p>
          <p className="text-2xl font-bold text-green-700 dark:text-green-300">
            {pendingReviews}
          </p>
          <p className="text-xs text-green-600 dark:text-green-400 mb-3">
            Submissions waiting for your review
          </p>
          <Link 
            href="/submissions"
            className="text-xs text-green-600 dark:text-green-400 hover:underline"
          >
            Start Reviewing →
          </Link>
        </div>
      )}

      {/* Reviewer Tips */}
      <div className="mt-8 p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-lg">
        <p className="text-xs font-medium text-slate-900 dark:text-slate-100 mb-2">
          Review Tips
        </p>
        <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
          <li>• Be constructive in feedback</li>
          <li>• Consider speaker experience</li>
          <li>• Check for topic relevance</li>
        </ul>
      </div>
    </SidebarNav>
  );
}
