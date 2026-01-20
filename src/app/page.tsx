/**
 * Home Page
 * 
 * Landing page that redirects authenticated users to dashboard,
 * and shows a welcome page for unauthenticated users.
 */

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { config } from '@/lib/env';
import { PoweredByFooter } from '@/components/ui/powered-by-footer';
import { Calendar, FileText, Users, Star, ArrowRight } from 'lucide-react';

export default async function Home() {
  const session = await auth();
  
  // Redirect authenticated users to dashboard
  if (session?.user) {
    redirect('/dashboard');
  }
  
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="w-full border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="font-bold text-xl text-slate-900 dark:text-white">
            {config.app.name}
          </h1>
          <div className="flex items-center gap-4">
            <Link 
              href="/auth/signin" 
              className="text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link 
              href="/auth/signup" 
              className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>
      
      {/* Hero Section */}
      <main className="flex-1">
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6">
              Manage Your Conference Call for Papers
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-300 mb-10">
              A complete platform for accepting, reviewing, and managing talk submissions for your conference or event.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/auth/signup" 
                className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg text-lg font-medium transition-colors"
              >
                Get Started
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link 
                href="/events" 
                className="inline-flex items-center justify-center gap-2 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 px-8 py-3 rounded-lg text-lg font-medium transition-colors"
              >
                Browse Events
              </Link>
            </div>
          </div>
          
          {/* Features Grid */}
          <div className="max-w-5xl mx-auto mt-24 grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard 
              icon={<Calendar className="h-8 w-8" />}
              title="Event Management"
              description="Create and manage multiple events with customizable CFP settings"
            />
            <FeatureCard 
              icon={<FileText className="h-8 w-8" />}
              title="Submission System"
              description="Accept talk proposals with materials, co-speakers, and more"
            />
            <FeatureCard 
              icon={<Star className="h-8 w-8" />}
              title="Review System"
              description="Assign reviewers, score submissions, and collaborate on decisions"
            />
            <FeatureCard 
              icon={<Users className="h-8 w-8" />}
              title="Team Collaboration"
              description="Work together with your organizing team"
            />
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <PoweredByFooter />
    </div>
  );
}

function FeatureCard({ 
  icon, 
  title, 
  description 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
      <div className="text-blue-600 dark:text-blue-400 mb-4">
        {icon}
      </div>
      <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
        {title}
      </h3>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        {description}
      </p>
    </div>
  );
}
