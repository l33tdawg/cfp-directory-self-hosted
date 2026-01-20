'use client';

/**
 * Page Transition Component
 * 
 * Provides smooth entrance animations for page content.
 */

import { cn } from '@/lib/utils';

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
  animation?: 'fade' | 'fade-up' | 'fade-down' | 'scale' | 'slide-left' | 'slide-right';
  delay?: number;
}

export function PageTransition({
  children,
  className,
  animation = 'fade-up',
  delay = 0,
}: PageTransitionProps) {
  const animationClass = {
    fade: 'animate-fade-in',
    'fade-up': 'animate-fade-up',
    'fade-down': 'animate-fade-down',
    scale: 'animate-scale-in',
    'slide-left': 'animate-slide-in-left',
    'slide-right': 'animate-slide-in-right',
  }[animation];

  return (
    <div
      className={cn(animationClass, className)}
      style={{ animationDelay: delay ? `${delay}ms` : undefined }}
    >
      {children}
    </div>
  );
}

/**
 * Staggered children animation wrapper
 */
interface StaggeredChildrenProps {
  children: React.ReactNode;
  className?: string;
  animation?: 'fade' | 'fade-up' | 'scale';
  baseDelay?: number;
  staggerDelay?: number;
}

export function StaggeredChildren({
  children,
  className,
  animation = 'fade-up',
  baseDelay = 0,
  staggerDelay = 50,
}: StaggeredChildrenProps) {
  const animationClass = {
    fade: 'animate-fade-in',
    'fade-up': 'animate-fade-up',
    scale: 'animate-scale-in',
  }[animation];

  return (
    <div className={className}>
      {Array.isArray(children)
        ? children.map((child, index) => (
            <div
              key={index}
              className={animationClass}
              style={{
                animationDelay: `${baseDelay + index * staggerDelay}ms`,
                animationFillMode: 'both',
              }}
            >
              {child}
            </div>
          ))
        : children}
    </div>
  );
}

/**
 * Section transition for content blocks
 */
interface SectionProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
}

export function Section({ children, className, title, description }: SectionProps) {
  return (
    <section className={cn('animate-fade-up', className)}>
      {(title || description) && (
        <div className="mb-6">
          {title && (
            <h2 className="text-2xl font-bold text-foreground">{title}</h2>
          )}
          {description && (
            <p className="text-muted-foreground mt-1">{description}</p>
          )}
        </div>
      )}
      {children}
    </section>
  );
}
