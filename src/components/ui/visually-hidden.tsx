/**
 * Visually Hidden Component
 * 
 * Hides content visually while keeping it accessible to screen readers.
 * Useful for providing additional context to assistive technologies.
 */

import { cn } from '@/lib/utils';

interface VisuallyHiddenProps {
  children: React.ReactNode;
  as?: 'span' | 'div' | 'label' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  className?: string;
}

export function VisuallyHidden({ 
  children, 
  as: Component = 'span',
  className,
}: VisuallyHiddenProps) {
  return (
    <Component className={cn('sr-only', className)}>
      {children}
    </Component>
  );
}
