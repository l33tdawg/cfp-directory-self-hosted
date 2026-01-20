'use client';

/**
 * Activity Feed Component
 * 
 * Displays a list of recent activities, submissions, or events.
 */

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  LucideIcon, 
  ArrowRight, 
  Clock,
  Calendar,
  FileText,
  ClipboardCheck,
  Users,
  Star,
  MessageSquare,
  Bell,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// Icon map for string-based icon references (allows Server Components to pass icon names)
const iconMap: Record<string, LucideIcon> = {
  calendar: Calendar,
  'file-text': FileText,
  'clipboard-check': ClipboardCheck,
  users: Users,
  star: Star,
  'message-square': MessageSquare,
  bell: Bell,
  'check-circle': CheckCircle,
  'x-circle': XCircle,
  'alert-circle': AlertCircle,
  clock: Clock,
};

export interface ActivityItem {
  id: string;
  title: string;
  subtitle?: string;
  href?: string;
  /** Icon name as string (e.g., 'calendar', 'file-text', 'clipboard-check') */
  icon?: string;
  badge?: {
    label: string;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  };
  timestamp?: Date | string;
  action?: {
    label: string;
    href: string;
  };
}

interface ActivityFeedProps {
  title?: string;
  description?: string;
  items: ActivityItem[];
  emptyMessage?: string;
  emptyAction?: {
    label: string;
    href: string;
  };
  maxHeight?: number;
  showTimestamps?: boolean;
  className?: string;
}

export function ActivityFeed({
  title = 'Recent Activity',
  description,
  items,
  emptyMessage = 'No recent activity',
  emptyAction,
  maxHeight = 400,
  showTimestamps = true,
  className,
}: ActivityFeedProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {items.length > 0 ? (
          <ScrollArea className="pr-4" style={{ maxHeight }}>
            <div className="space-y-3">
              {items.map((item) => (
                <ActivityItemRow 
                  key={item.id} 
                  item={item} 
                  showTimestamp={showTimestamps}
                />
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-8">
            <p className="text-slate-500 dark:text-slate-400 mb-4">
              {emptyMessage}
            </p>
            {emptyAction && (
              <Button asChild size="sm">
                <Link href={emptyAction.href}>{emptyAction.label}</Link>
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ActivityItemRow({
  item,
  showTimestamp,
}: {
  item: ActivityItem;
  showTimestamp: boolean;
}) {
  const Icon = item.icon ? iconMap[item.icon] : undefined;
  
  const content = (
    <div className={cn(
      "flex items-start gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors",
      item.href && "hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
    )}>
      {Icon && (
        <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 flex-shrink-0">
          <Icon className="h-4 w-4 text-slate-600 dark:text-slate-400" />
        </div>
      )}
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium text-slate-900 dark:text-white truncate">
              {item.title}
            </p>
            {item.subtitle && (
              <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                {item.subtitle}
              </p>
            )}
          </div>
          
          {item.badge && (
            <Badge variant={item.badge.variant || 'secondary'} className="flex-shrink-0">
              {item.badge.label}
            </Badge>
          )}
        </div>
        
        {(showTimestamp && item.timestamp) || item.action ? (
          <div className="flex items-center justify-between mt-2">
            {showTimestamp && item.timestamp && (
              <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
              </div>
            )}
            
            {item.action && (
              <Link
                href={item.action.href}
                className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                {item.action.label}
                <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );

  if (item.href) {
    return (
      <Link href={item.href} className="block">
        {content}
      </Link>
    );
  }

  return content;
}

/**
 * Compact list version without cards
 */
export function ActivityList({
  items,
  showTimestamps = true,
  className,
}: {
  items: ActivityItem[];
  showTimestamps?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {items.map((item) => {
        const Icon = item.icon ? iconMap[item.icon] : undefined;
        
        return (
          <Link
            key={item.id}
            href={item.href || '#'}
            className="flex items-center gap-3 p-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            {Icon && (
              <Icon className="h-4 w-4 text-slate-500 flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                {item.title}
              </p>
            </div>
            {item.badge && (
              <Badge variant={item.badge.variant || 'secondary'} className="flex-shrink-0 text-xs">
                {item.badge.label}
              </Badge>
            )}
            {showTimestamps && item.timestamp && (
              <span className="text-xs text-slate-500 flex-shrink-0">
                {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
