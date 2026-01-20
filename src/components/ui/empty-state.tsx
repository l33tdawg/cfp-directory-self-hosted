'use client';

/**
 * Empty State Components
 * 
 * Consistent empty state UI patterns for the application.
 */

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Calendar, 
  Users, 
  Search, 
  MessageSquare,
  Settings,
  Inbox,
  FolderOpen,
  type LucideIcon 
} from 'lucide-react';
import Link from 'next/link';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  secondaryAction?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  className?: string;
  variant?: 'default' | 'minimal' | 'card';
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  secondaryAction,
  className,
  variant = 'default',
}: EmptyStateProps) {
  if (variant === 'minimal') {
    return (
      <div className={cn('text-center py-8', className)}>
        <p className="text-muted-foreground">{description}</p>
        {action && (
          <div className="mt-4">
            {action.href ? (
              <Button asChild variant="outline" size="sm">
                <Link href={action.href}>{action.label}</Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={action.onClick}>
                {action.label}
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className={cn(
        'rounded-lg border bg-card p-8 text-center animate-fade-in',
        className
      )}>
        <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <Icon className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="font-medium text-foreground mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
          {description}
        </p>
        {action && (
          action.href ? (
            <Button asChild size="sm">
              <Link href={action.href}>{action.label}</Link>
            </Button>
          ) : (
            <Button size="sm" onClick={action.onClick}>
              {action.label}
            </Button>
          )
        )}
      </div>
    );
  }

  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-16 px-4 animate-fade-in',
      className
    )}>
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center animate-float">
          <Icon className="h-10 w-10 text-muted-foreground" />
        </div>
        <div className="absolute inset-0 w-20 h-20 rounded-full bg-primary/5 animate-ping" />
      </div>
      
      <h3 className="text-xl font-semibold text-foreground mb-2 text-center">
        {title}
      </h3>
      
      <p className="text-muted-foreground text-center max-w-md mb-8">
        {description}
      </p>
      
      <div className="flex flex-col sm:flex-row items-center gap-3">
        {action && (
          action.href ? (
            <Button asChild size="lg" className="btn-hover-lift">
              <Link href={action.href}>{action.label}</Link>
            </Button>
          ) : (
            <Button size="lg" className="btn-hover-lift" onClick={action.onClick}>
              {action.label}
            </Button>
          )
        )}
        {secondaryAction && (
          secondaryAction.href ? (
            <Button asChild variant="outline" size="lg">
              <Link href={secondaryAction.href}>{secondaryAction.label}</Link>
            </Button>
          ) : (
            <Button variant="outline" size="lg" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )
        )}
      </div>
    </div>
  );
}

// Pre-configured empty states for common scenarios

export function EmptySubmissions({ isOrganizer = false }: { isOrganizer?: boolean }) {
  return (
    <EmptyState
      icon={FileText}
      title="No submissions yet"
      description={
        isOrganizer
          ? "No talk submissions have been received for this event yet. Share your CFP to start receiving proposals!"
          : "You haven't submitted any talks yet. Find events with open CFPs and submit your ideas!"
      }
      action={{
        label: isOrganizer ? "Share CFP" : "Browse Events",
        href: isOrganizer ? undefined : "/browse",
      }}
    />
  );
}

export function EmptyEvents({ isOrganizer = false }: { isOrganizer?: boolean }) {
  return (
    <EmptyState
      icon={Calendar}
      title={isOrganizer ? "No events created" : "No events found"}
      description={
        isOrganizer
          ? "Create your first event to start accepting talk submissions."
          : "There are no events matching your criteria. Try adjusting your filters."
      }
      action={
        isOrganizer
          ? { label: "Create Event", href: "/events/new" }
          : { label: "Clear Filters", href: "/events" }
      }
    />
  );
}

export function EmptyReviews() {
  return (
    <EmptyState
      icon={MessageSquare}
      title="No reviews to show"
      description="All submissions have been reviewed! Check back when new submissions arrive."
    />
  );
}

export function EmptySearch({ query }: { query: string }) {
  return (
    <EmptyState
      icon={Search}
      title="No results found"
      description={`We couldn't find anything matching "${query}". Try different keywords or check your spelling.`}
      action={{
        label: "Clear Search",
        href: "?",
      }}
    />
  );
}

export function EmptyTeam() {
  return (
    <EmptyState
      icon={Users}
      title="No team members"
      description="Invite team members to help manage your events and review submissions."
      action={{
        label: "Invite Members",
        href: "#invite",
      }}
    />
  );
}

export function EmptyFolder() {
  return (
    <EmptyState
      icon={FolderOpen}
      title="Nothing here yet"
      description="This section is empty. Items will appear here once they're available."
      variant="card"
    />
  );
}

export function ErrorState({ 
  title = "Something went wrong",
  description = "An error occurred while loading this content. Please try again.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <EmptyState
      icon={Settings}
      title={title}
      description={description}
      action={
        onRetry
          ? { label: "Try Again", onClick: onRetry }
          : { label: "Go Home", href: "/" }
      }
    />
  );
}
