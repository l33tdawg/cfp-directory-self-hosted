'use client';

/**
 * Dashboard Header Component
 * 
 * Enhanced header with site branding, navigation links,
 * role indicator, and user menu.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { MobileNav } from './mobile-nav';
import { UserButton } from '@/components/auth/user-button';
import { ThemeToggle } from './theme-toggle';
import {
  LayoutDashboard,
  Calendar,
  FileText,
  Settings,
  Globe
} from 'lucide-react';

type UserRole = 'SPEAKER' | 'ORGANIZER' | 'REVIEWER' | 'ADMIN';

interface DashboardHeaderProps {
  siteName?: string;
  userName?: string;
  userRole?: UserRole;
  federationEnabled?: boolean;
}

const roleColors = {
  SPEAKER: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  ORGANIZER: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  REVIEWER: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  ADMIN: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
};

export function DashboardHeader({ 
  siteName = 'CFP Directory',
  userName = 'User',
  userRole = 'SPEAKER',
  federationEnabled = false
}: DashboardHeaderProps) {
  const pathname = usePathname();
  const isAdmin = userRole === 'ADMIN';
  const isOrganizerOrAdmin = ['ADMIN', 'ORGANIZER'].includes(userRole);

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/events', label: 'Events', icon: Calendar },
    { href: '/submissions', label: 'Submissions', icon: FileText },
    ...(isOrganizerOrAdmin ? [{ href: '/settings', label: 'Settings', icon: Settings }] : []),
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-slate-900/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Left: Mobile Nav + Logo */}
        <div className="flex items-center gap-4">
          <MobileNav 
            userName={userName} 
            userRole={userRole} 
            siteName={siteName}
            federationEnabled={federationEnabled}
          />
          
          <Link 
            href="/dashboard" 
            className="flex items-center gap-2"
          >
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
              <Calendar className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-lg text-slate-900 dark:text-white hidden sm:inline-block">
              {siteName}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1 ml-8">
            {navLinks.map((link) => {
              const isActive = pathname === link.href || 
                              (link.href !== '/dashboard' && pathname.startsWith(link.href));
              
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                    isActive
                      ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  )}
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: Role Badge + Theme Toggle + User Menu */}
        <div className="flex items-center gap-3">
          {/* Federation Indicator */}
          {federationEnabled && (
            <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
              <Globe className="h-3 w-3" />
              <span className="text-xs font-medium">Federated</span>
            </div>
          )}
          
          {/* Role Badge */}
          <span className={cn(
            "hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
            roleColors[userRole]
          )}>
            {userRole.charAt(0) + userRole.slice(1).toLowerCase()}
          </span>

          <ThemeToggle />
          
          <UserButton />
        </div>
      </div>
    </header>
  );
}
