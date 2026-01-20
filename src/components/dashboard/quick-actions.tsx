'use client';

/**
 * Quick Actions Component
 * 
 * Displays a grid of quick action buttons for common tasks.
 * Supports role-specific actions.
 */

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Plus,
  Calendar,
  ClipboardCheck,
  Settings,
  Eye,
  FileText,
  Users,
  Send,
  Star,
  Shield,
  type LucideIcon,
} from 'lucide-react';

// Map of icon names to icon components
const iconMap: Record<string, LucideIcon> = {
  plus: Plus,
  calendar: Calendar,
  'clipboard-check': ClipboardCheck,
  settings: Settings,
  eye: Eye,
  'file-text': FileText,
  users: Users,
  send: Send,
  star: Star,
  shield: Shield,
};

export type QuickActionIconName = keyof typeof iconMap;

export interface QuickAction {
  title: string;
  description?: string;
  href: string;
  icon: QuickActionIconName;
  variant?: 'default' | 'blue' | 'green' | 'orange' | 'purple';
}

interface QuickActionsProps {
  title?: string;
  description?: string;
  actions: QuickAction[];
  columns?: 1 | 2 | 3;
  className?: string;
}

const variantStyles = {
  default: {
    bg: 'hover:bg-slate-50 dark:hover:bg-slate-800',
    icon: 'text-slate-600 dark:text-slate-400',
    iconBg: 'bg-slate-100 dark:bg-slate-800',
  },
  blue: {
    bg: 'hover:bg-blue-50 dark:hover:bg-blue-950',
    icon: 'text-blue-600 dark:text-blue-400',
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
  },
  green: {
    bg: 'hover:bg-green-50 dark:hover:bg-green-950',
    icon: 'text-green-600 dark:text-green-400',
    iconBg: 'bg-green-100 dark:bg-green-900/30',
  },
  orange: {
    bg: 'hover:bg-orange-50 dark:hover:bg-orange-950',
    icon: 'text-orange-600 dark:text-orange-400',
    iconBg: 'bg-orange-100 dark:bg-orange-900/30',
  },
  purple: {
    bg: 'hover:bg-purple-50 dark:hover:bg-purple-950',
    icon: 'text-purple-600 dark:text-purple-400',
    iconBg: 'bg-purple-100 dark:bg-purple-900/30',
  },
};

export function QuickActions({
  title = 'Quick Actions',
  description,
  actions,
  columns = 2,
  className,
}: QuickActionsProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className={cn("grid gap-3", gridCols[columns])}>
          {actions.map((action) => {
            const styles = variantStyles[action.variant || 'default'];
            const Icon = iconMap[action.icon] || FileText;
            
            return (
              <Link
                key={action.href}
                href={action.href}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors",
                  styles.bg
                )}
              >
                <div className={cn("p-2.5 rounded-lg", styles.iconBg)}>
                  <Icon className={cn("h-5 w-5", styles.icon)} />
                </div>
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">
                    {action.title}
                  </p>
                  {action.description && (
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {action.description}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Compact Quick Actions as buttons
 */
export function QuickActionButtons({
  actions,
  className,
}: {
  actions: QuickAction[];
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {actions.map((action) => {
        const styles = variantStyles[action.variant || 'default'];
        const Icon = iconMap[action.icon] || FileText;
        
        return (
          <Button
            key={action.href}
            variant="outline"
            asChild
            className="gap-2"
          >
            <Link href={action.href}>
              <Icon className={cn("h-4 w-4", styles.icon)} />
              {action.title}
            </Link>
          </Button>
        );
      })}
    </div>
  );
}
