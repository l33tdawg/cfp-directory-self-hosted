'use client';

/**
 * Mobile Navigation Component
 * 
 * Provides a slide-out navigation menu for mobile devices.
 * Shows role-appropriate navigation items.
 */

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { 
  Menu,
  LayoutDashboard,
  Calendar,
  FileText,
  Settings,
  User,
  LogOut,
  X,
  ClipboardCheck,
  Link2,
  Globe
} from 'lucide-react';

type UserRole = 'SPEAKER' | 'ORGANIZER' | 'REVIEWER' | 'ADMIN';

interface MobileNavProps {
  userName?: string;
  userRole?: UserRole;
  siteName?: string;
  federationEnabled?: boolean;
}

const roleColors = {
  SPEAKER: {
    gradient: 'from-blue-600 to-indigo-600',
    badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
  },
  ORGANIZER: {
    gradient: 'from-orange-600 to-amber-600',
    badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
  },
  REVIEWER: {
    gradient: 'from-green-600 to-emerald-600',
    badge: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
  },
  ADMIN: {
    gradient: 'from-purple-600 to-pink-600',
    badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
  }
};

const getNavItems = (role: UserRole, federationEnabled: boolean) => {
  const baseItems = [
    { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { title: 'Events', href: '/events', icon: Calendar },
    { title: 'Submissions', href: '/submissions', icon: FileText },
  ];

  if (role === 'ADMIN') {
    return [
      ...baseItems,
      { title: 'Settings', href: '/settings', icon: Settings },
      ...(federationEnabled ? [{ title: 'Federation', href: '/settings/federation', icon: Link2 }] : []),
    ];
  }

  if (role === 'ORGANIZER') {
    return [
      ...baseItems,
      { title: 'Settings', href: '/settings', icon: Settings },
    ];
  }

  if (role === 'REVIEWER') {
    return [
      { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { title: 'Reviews', href: '/submissions', icon: ClipboardCheck },
      { title: 'Profile', href: '/profile', icon: User },
    ];
  }

  // Speaker
  return [
    { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { title: 'Browse Events', href: '/browse', icon: Calendar },
    { title: 'My Submissions', href: '/submissions', icon: FileText },
    { title: 'Profile', href: '/profile', icon: User },
  ];
};

export function MobileNav({ 
  userName = 'User', 
  userRole = 'SPEAKER',
  siteName = 'CFP Directory',
  federationEnabled = false 
}: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const navItems = getNavItems(userRole, federationEnabled);
  const colors = roleColors[userRole];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="text-left">{siteName}</SheetTitle>
        </SheetHeader>
        
        <div className="flex flex-col h-full">
          {/* User Info */}
          <div className="p-4 border-b">
            <div className="flex items-center">
              <div className={cn("h-10 w-10 rounded-full flex items-center justify-center text-white mr-3 bg-gradient-to-r", colors.gradient)}>
                <User className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">{userName}</p>
                <span className={cn("text-xs px-2 py-0.5 rounded-full", colors.badge)}>
                  {userRole.charAt(0) + userRole.slice(1).toLowerCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = pathname === item.href || 
                              (item.href !== '/' && pathname.startsWith(item.href + '/'));
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors",
                    isActive
                      ? `bg-gradient-to-r ${colors.gradient} text-white`
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                  )}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.title}
                </Link>
              );
            })}
          </nav>

          {/* Footer Actions */}
          <div className="p-4 border-t mt-auto">
            <Link
              href="/auth/signout"
              onClick={() => setOpen(false)}
              className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950 transition-colors"
            >
              <LogOut className="mr-3 h-5 w-5" />
              Sign Out
            </Link>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
