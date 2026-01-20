'use client';

/**
 * Landing Page Content Component
 * 
 * Renders custom rich text content from site settings on the landing page.
 * Supports HTML content created with the TipTap rich text editor.
 * 
 * Designed for dark backgrounds (hero section).
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
        // Base prose with inverted colors for dark background
        "prose prose-lg max-w-none",
        // All text should be white/light for dark hero background
        "prose-headings:text-white prose-headings:font-bold",
        "prose-h1:text-4xl prose-h1:md:text-5xl prose-h1:lg:text-6xl prose-h1:mb-6 prose-h1:leading-tight",
        "prose-h2:text-2xl prose-h2:md:text-3xl prose-h2:font-semibold prose-h2:mt-10 prose-h2:mb-4 prose-h2:text-white/90",
        "prose-h3:text-xl prose-h3:md:text-2xl prose-h3:font-semibold prose-h3:mt-8 prose-h3:mb-3 prose-h3:text-white/80",
        "prose-p:text-white/70 prose-p:leading-relaxed prose-p:text-lg",
        "prose-a:text-violet-400 prose-a:no-underline hover:prose-a:text-violet-300 hover:prose-a:underline",
        "prose-ul:my-4 prose-ul:text-white/70",
        "prose-ol:my-4 prose-ol:text-white/70",
        "prose-li:text-white/70 prose-li:marker:text-violet-400",
        "prose-strong:text-white prose-strong:font-semibold",
        "prose-em:text-white/80",
        "prose-blockquote:border-l-violet-500 prose-blockquote:bg-white/5 prose-blockquote:py-3 prose-blockquote:px-5 prose-blockquote:rounded-r-lg prose-blockquote:text-white/80 prose-blockquote:not-italic",
        "prose-code:text-violet-300 prose-code:bg-white/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm",
        "prose-pre:bg-slate-900/50 prose-pre:border prose-pre:border-white/10",
        "prose-img:rounded-xl prose-img:shadow-2xl prose-img:border prose-img:border-white/10",
        "prose-hr:border-white/10",
        className
      )}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}
