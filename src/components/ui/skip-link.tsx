'use client';

/**
 * Skip Link Component
 * 
 * Accessibility feature that allows keyboard users to skip
 * directly to the main content, bypassing navigation.
 */

import { cn } from '@/lib/utils';

interface SkipLinkProps {
  href?: string;
  children?: React.ReactNode;
  className?: string;
}

export function SkipLink({ 
  href = '#main-content', 
  children = 'Skip to main content',
  className,
}: SkipLinkProps) {
  return (
    <a
      href={href}
      className={cn(
        'skip-link',
        className
      )}
    >
      {children}
    </a>
  );
}

/**
 * Main Content wrapper - adds the target ID for skip link
 */
interface MainContentProps {
  children: React.ReactNode;
  className?: string;
}

export function MainContent({ children, className }: MainContentProps) {
  return (
    <main 
      id="main-content" 
      tabIndex={-1}
      className={cn('outline-none', className)}
    >
      {children}
    </main>
  );
}
