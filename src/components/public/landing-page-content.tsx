'use client';

/**
 * Landing Page Content Component
 * 
 * Renders custom rich text content from site settings on the landing page.
 * Supports HTML content created with the TipTap rich text editor.
 * 
 * Designed for dark backgrounds (hero section) with large, impactful typography.
 * Uses custom CSS instead of prose modifiers for better control over dark theme colors.
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
        "landing-content max-w-none text-center",
        className
      )}
      dangerouslySetInnerHTML={{ __html: content }}
      style={{
        // Custom styles for dark background hero section
      }}
    />
  );
}

// Add these styles to globals.css or include them here via a style tag
// For now, using a CSS-in-JS approach with the component
