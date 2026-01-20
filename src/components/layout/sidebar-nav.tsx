'use client';

/**
 * Base Sidebar Navigation Component
 * 
 * Provides shared styling and structure for role-specific sidebars.
 * Used by speaker, organizer, reviewer, and admin sidebars.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LucideIcon, User } from 'lucide-react';

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  description?: string;
  badge?: number | boolean;
}

export interface SidebarNavProps {
  items: NavItem[];
  title: string;
  subtitle: string;
  userName?: string;
  userRole?: string;
  gradientFrom: string;
  gradientTo: string;
  avatarBg: string;
  children?: React.ReactNode;
}

export function SidebarNav({
  items,
  title,
  subtitle,
  userName = 'User',
  userRole = 'User',
  gradientFrom,
  gradientTo,
  avatarBg,
  children,
}: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:block w-64 h-[calc(100vh-4rem)] overflow-y-auto border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
      </div>

      {/* User Info */}
      <div className="mb-6 flex items-center">
        <div className={cn("h-8 w-8 rounded-full flex items-center justify-center text-white mr-3", avatarBg)}>
          <User className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-900 dark:text-white">{userName}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{userRole}</p>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="space-y-2">
        {items.map((item) => {
          const isActive = pathname === item.href || 
                          (item.href !== '/' && pathname.startsWith(item.href + '/'));
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                isActive
                  ? `bg-gradient-to-r ${gradientFrom} ${gradientTo} text-white`
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              <item.icon className="mr-3 h-5 w-5" />
              <span className="flex-1">{item.title}</span>
              {item.badge && typeof item.badge === 'number' && item.badge > 0 && (
                <span className="ml-auto inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                  {item.badge}
                </span>
              )}
              {item.badge && typeof item.badge === 'boolean' && (
                <span className="ml-auto inline-flex h-2 w-2 rounded-full bg-red-500" aria-hidden="true" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Additional Content (help sections, upgrade prompts, etc.) */}
      {children}
    </aside>
  );
}
