'use client';

/**
 * Landing Page Content Component
 * 
 * Renders custom rich text content from site settings on the landing page.
 * Supports HTML content created with the TipTap rich text editor.
 * 
 * SECURITY: All HTML content is sanitized using DOMPurify before rendering
 * to prevent XSS attacks. Even though this content is typically set by admins,
 * sanitization provides defense-in-depth against:
 * - Compromised admin accounts persisting malicious payloads
 * - Any injection paths that might affect landingPageContent
 * - Copy/paste of malicious content from external sources
 * 
 * Designed for dark backgrounds (hero section) with large, impactful typography.
 * Uses custom CSS instead of prose modifiers for better control over dark theme colors.
 */

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { sanitizeHtml } from '@/lib/security/html-sanitizer';

interface LandingPageContentProps {
  content: string;
  className?: string;
}

export function LandingPageContent({ content, className }: LandingPageContentProps) {
  // SECURITY: Sanitize HTML to prevent XSS attacks
  // This removes script tags, event handlers, javascript: URLs, etc.
  const sanitizedContent = useMemo(() => {
    if (!content) return '';
    return sanitizeHtml(content);
  }, [content]);
  
  if (!sanitizedContent) {
    return null;
  }

  return (
    <div 
      className={cn(
        "landing-content max-w-none text-center",
        className
      )}
      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
      style={{
        // Custom styles for dark background hero section
      }}
    />
  );
}

// Add these styles to globals.css or include them here via a style tag
// For now, using a CSS-in-JS approach with the component
