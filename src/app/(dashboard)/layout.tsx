/**
 * Dashboard Layout
 * 
 * Layout for authenticated pages with navigation header.
 */

import Link from 'next/link';
import { config } from '@/lib/env';
import { getSiteSettings } from '@/lib/api/auth';
import { UserButton } from '@/components/auth/user-button';
import { auth } from '@/lib/auth';
import { 
  Calendar, 
  FileText, 
  Settings,
  LayoutDashboard,
  Star
} from 'lucide-react';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const settings = await getSiteSettings();
  const isOrganizer = session?.user && ['ADMIN', 'ORGANIZER'].includes(session.user.role);
  const isAdmin = session?.user?.role === 'ADMIN';
  
  const siteName = settings?.name || config.app.name;
  
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo and Nav */}
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="font-bold text-xl text-slate-900 dark:text-white">
              {siteName}
            </Link>
            
            <nav className="hidden md:flex items-center gap-6">
              <Link 
                href="/dashboard" 
                className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
              <Link 
                href="/events" 
                className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
              >
                <Calendar className="h-4 w-4" />
                Events
              </Link>
              <Link 
                href="/submissions" 
                className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
              >
                <FileText className="h-4 w-4" />
                My Submissions
              </Link>
              {isAdmin && (
                <Link 
                  href="/settings" 
                  className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
              )}
            </nav>
          </div>
          
          {/* User Menu */}
          <UserButton />
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>
      
      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 mt-auto">
        <div className="container mx-auto px-4 text-center text-sm text-slate-500 dark:text-slate-400">
          <p>
            Powered by{' '}
            <a 
              href="https://cfp.directory" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              CFP Directory
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
