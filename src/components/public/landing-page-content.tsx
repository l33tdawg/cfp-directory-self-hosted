'use client';

/**
 * Landing Page Content Component
 * 
 * Renders custom rich text content from site settings on the landing page.
 * Supports HTML content created with the TipTap rich text editor.
 */

import { cn } from '@/lib/utils';

interface LandingPageContentProps {
  content: string;
  className?: string;
}

export function LandingPageContent({ content, className }: LandingPageContentProps) {
  if (!content) {
    return null;
  }

  return (
    <div 
      className={cn(
        "prose prose-slate dark:prose-invert max-w-none",
        // Customize prose styles for landing page
        "prose-headings:text-slate-900 dark:prose-headings:text-white",
        "prose-h1:text-3xl prose-h1:md:text-4xl prose-h1:font-bold prose-h1:mb-4",
        "prose-h2:text-2xl prose-h2:font-semibold prose-h2:mt-8 prose-h2:mb-4",
        "prose-h3:text-xl prose-h3:font-semibold prose-h3:mt-6 prose-h3:mb-3",
        "prose-p:text-slate-600 dark:prose-p:text-slate-400 prose-p:leading-relaxed",
        "prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline",
        "prose-ul:my-4 prose-li:text-slate-600 dark:prose-li:text-slate-400",
        "prose-strong:text-slate-900 dark:prose-strong:text-white",
        "prose-blockquote:border-l-blue-500 prose-blockquote:bg-blue-50 dark:prose-blockquote:bg-blue-950 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg",
        "prose-img:rounded-lg prose-img:shadow-md",
        className
      )}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}
