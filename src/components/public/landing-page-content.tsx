'use client';

/**
 * Landing Page Content Component
 * 
 * Renders custom rich text content from site settings on the landing page.
 * Supports HTML content created with the TipTap rich text editor.
 * 
 * Designed for dark backgrounds (hero section) with large, impactful typography.
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
        // Hero-style prose - larger, more impactful
        "prose prose-xl md:prose-2xl max-w-none text-center",
        // H1 - Main headline, very large with gradient
        "prose-h1:text-5xl prose-h1:md:text-6xl prose-h1:lg:text-7xl",
        "prose-h1:font-bold prose-h1:tracking-tight prose-h1:mb-4",
        "prose-h1:bg-gradient-to-r prose-h1:from-white prose-h1:via-white prose-h1:to-white/70",
        "prose-h1:bg-clip-text prose-h1:text-transparent",
        // H2 - Section headers
        "prose-h2:text-3xl prose-h2:md:text-4xl prose-h2:font-bold prose-h2:text-white",
        "prose-h2:mt-12 prose-h2:mb-6",
        // H3 - Subsections
        "prose-h3:text-2xl prose-h3:md:text-3xl prose-h3:font-semibold prose-h3:text-white/90",
        "prose-h3:mt-8 prose-h3:mb-4",
        // Paragraphs - readable on dark bg
        "prose-p:text-xl prose-p:md:text-2xl prose-p:text-white/70 prose-p:leading-relaxed prose-p:mb-6",
        // First paragraph after h1 should be larger (subtitle style)
        "[&>h1+p]:text-2xl [&>h1+p]:md:text-3xl [&>h1+p]:text-white/80 [&>h1+p]:font-medium",
        // Links
        "prose-a:text-violet-400 prose-a:no-underline hover:prose-a:text-violet-300 hover:prose-a:underline",
        // Lists - left-aligned for readability
        "prose-ul:text-left prose-ul:my-6 prose-ul:text-white/70 prose-ul:text-lg prose-ul:md:text-xl",
        "prose-ol:text-left prose-ol:my-6 prose-ol:text-white/70 prose-ol:text-lg prose-ol:md:text-xl",
        "prose-li:text-white/70 prose-li:marker:text-violet-400 prose-li:mb-2",
        // Strong/emphasis
        "prose-strong:text-white prose-strong:font-semibold",
        "prose-em:text-white/80 prose-em:italic",
        // Blockquote - testimonial style
        "prose-blockquote:border-l-4 prose-blockquote:border-violet-500",
        "prose-blockquote:bg-white/5 prose-blockquote:backdrop-blur-sm",
        "prose-blockquote:py-4 prose-blockquote:px-6 prose-blockquote:my-8",
        "prose-blockquote:rounded-r-xl prose-blockquote:text-white/80",
        "prose-blockquote:not-italic prose-blockquote:text-lg prose-blockquote:md:text-xl",
        // Code
        "prose-code:text-violet-300 prose-code:bg-white/10 prose-code:px-2 prose-code:py-1 prose-code:rounded",
        "prose-pre:bg-slate-900/50 prose-pre:border prose-pre:border-white/10 prose-pre:rounded-xl",
        // Images
        "prose-img:rounded-xl prose-img:shadow-2xl prose-img:border prose-img:border-white/10",
        // HR
        "prose-hr:border-white/10 prose-hr:my-12",
        className
      )}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}
