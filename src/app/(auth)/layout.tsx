/**
 * Authentication Layout
 * 
 * A clean, centered layout for all authentication pages.
 */

import { config } from '@/lib/env';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            {config.app.name}
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Conference Call for Papers
          </p>
        </div>
        
        {/* Auth Card */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-8">
          {children}
        </div>
        
        {/* Footer */}
        <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
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
    </div>
  );
}
