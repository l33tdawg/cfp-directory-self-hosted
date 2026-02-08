'use client';

/**
 * Admin Sidebar Component
 * 
 * Navigation sidebar for administrators to manage the entire platform,
 * including users, events, and system settings.
 */

import Link from 'next/link';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Settings,
  Shield,
  Globe,
  BarChart3,
  FileText,
  MessageSquare,
  Server,
  Link2,
  Tags,
  Puzzle,
} from 'lucide-react';
import { SidebarNav, NavItem } from './sidebar-nav';
import { AdminSidebarSlot } from '../plugins/admin-sidebar-slot';

interface AdminSidebarProps {
  userName?: string;
  federationEnabled?: boolean;
}

export function AdminSidebar({ 
  userName = 'Admin',
  federationEnabled = false
}: AdminSidebarProps) {
  
  const adminNavItems: NavItem[] = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      description: "Platform overview & stats"
    },
    {
      title: "Users",
      href: "/admin/users",
      icon: Users,
      description: "User management"
    },
    {
      title: "Events",
      href: "/admin/events",
      icon: Calendar,
      description: "Manage all events"
    },
    {
      title: "Submissions",
      href: "/submissions",
      icon: FileText,
      description: "All submissions"
    },
    {
      title: "Messages",
      href: "/messages",
      icon: MessageSquare,
      description: "Submission messages inbox"
    },
    {
      title: "Reviewers",
      href: "/admin/reviewers",
      icon: Shield,
      description: "Review team management"
    },
    {
      title: "Topics",
      href: "/admin/topics",
      icon: Tags,
      description: "Manage topic taxonomy"
    },
    {
      title: "Plugins",
      href: "/admin/plugins",
      icon: Puzzle,
      description: "Manage plugins"
    },
    {
      title: "Analytics",
      href: "/admin/analytics",
      icon: BarChart3,
      description: "Platform analytics"
    },
    {
      title: "Settings",
      href: "/settings",
      icon: Settings,
      description: "Site configuration"
    },
    ...(federationEnabled ? [{
      title: "Federation",
      href: "/settings/federation",
      icon: Link2,
      description: "Connect to CFP Directory"
    }] : [])
  ];

  return (
    <SidebarNav
      items={adminNavItems}
      title="Admin Dashboard"
      subtitle="Manage your CFP platform"
      userName={userName}
      userRole="Administrator"
      gradientFrom="from-purple-600"
      gradientTo="to-pink-600"
      avatarBg="bg-purple-600"
    >
      {/* Plugin Sidebar Items */}
      <div className="mt-6">
        <AdminSidebarSlot />
      </div>

      {/* System Status */}
      <div className="mt-8 p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 rounded-lg">
        <div className="flex items-center mb-2">
          <Server className="h-4 w-4 text-purple-600 dark:text-purple-400 mr-2" />
          <p className="text-xs font-medium text-purple-900 dark:text-purple-100">
            System Status
          </p>
        </div>
        <div className="flex items-center">
          <span className="inline-flex h-2 w-2 rounded-full bg-green-500 mr-2" />
          <span className="text-xs text-purple-700 dark:text-purple-300">
            All systems operational
          </span>
        </div>
      </div>

      {/* Federation Status */}
      {federationEnabled && (
        <div className="mt-4 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-lg">
          <div className="flex items-center mb-2">
            <Globe className="h-4 w-4 text-blue-600 dark:text-blue-400 mr-2" />
            <p className="text-xs font-medium text-blue-900 dark:text-blue-100">
              Federation
            </p>
          </div>
          <div className="flex items-center">
            <span className="inline-flex h-2 w-2 rounded-full bg-green-500 mr-2" />
            <span className="text-xs text-blue-700 dark:text-blue-300">
              Connected to CFP Directory
            </span>
          </div>
          <Link 
            href="/settings/federation"
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-2 inline-block"
          >
            Manage Federation →
          </Link>
        </div>
      )}

      {/* Quick Links */}
      <div className="mt-8">
        <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
          Quick Links
        </h3>
        <div className="space-y-2">
          <a
            href="/api/health"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center px-3 py-2 text-sm rounded-md transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 group"
          >
            <Server className="mr-3 h-4 w-4 text-slate-500" />
            <span className="text-xs text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white">
              Health Check
            </span>
          </a>
        </div>
      </div>
    </SidebarNav>
  );
}
