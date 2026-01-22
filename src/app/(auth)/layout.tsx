/**
 * Authentication Layout
 * 
 * A clean, centered layout for all authentication pages.
 * Uses the same dark theme as the rest of the site.
 */

import Link from 'next/link';
import { config } from '@/lib/env';
import { PoweredByFooter } from '@/components/ui/powered-by-footer';
import { Presentation } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      {/* Background gradient effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-bl from-violet-500/10 via-transparent to-transparent" />
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-fuchsia-500/10 via-transparent to-transparent" />
      </div>
      
      {/* Content */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Logo/Brand */}
          <Link href="/" className="block text-center mb-8 group">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-white/10 mb-4 group-hover:border-white/20 transition-colors">
              <Presentation className="h-8 w-8 text-violet-400" />
            </div>
            <h1 className="text-2xl font-bold text-white group-hover:text-white/90 transition-colors">
              {config.app.name}
            </h1>
            <p className="mt-1 text-sm text-white/50">
              Conference Call for Papers
            </p>
          </Link>
          
          {/* Auth Card */}
          <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/10 p-8 shadow-2xl shadow-black/20">
            {children}
          </div>
          
          {/* Footer */}
          <PoweredByFooter variant="minimal" className="mt-8" />
        </div>
      </div>
    </div>
  );
}
