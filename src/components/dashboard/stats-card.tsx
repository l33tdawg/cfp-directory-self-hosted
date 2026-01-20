'use client';

/**
 * Stats Card Component
 * 
 * Enhanced statistics card with icon, value, label, trend indicator,
 * and optional color variants matching cfp.directory's design.
 */

import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Calendar,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Users,
  Star,
  MessageSquare,
  Send,
  Award,
  BarChart3,
  Settings,
  Shield,
  Globe,
  type LucideIcon,
} from 'lucide-react';

// Map of icon names to icon components
const iconMap: Record<string, LucideIcon> = {
  calendar: Calendar,
  'file-text': FileText,
  clock: Clock,
  'check-circle': CheckCircle,
  'x-circle': XCircle,
  users: Users,
  star: Star,
  'message-square': MessageSquare,
  send: Send,
  award: Award,
  'bar-chart': BarChart3,
  settings: Settings,
  shield: Shield,
  globe: Globe,
  'trending-up': TrendingUp,
  'trending-down': TrendingDown,
};

export type IconName = keyof typeof iconMap;

export type StatsCardVariant = 'default' | 'blue' | 'green' | 'orange' | 'purple' | 'red';

export interface StatsCardProps {
  title: string;
  value: number | string;
  icon: IconName;
  description?: string;
  trend?: {
    value: number;
    label?: string;
  };
  variant?: StatsCardVariant;
  href?: string;
  className?: string;
}

const variantStyles: Record<StatsCardVariant, {
  iconBg: string;
  iconColor: string;
  trendUp: string;
  trendDown: string;
}> = {
  default: {
    iconBg: 'bg-slate-100 dark:bg-slate-800',
    iconColor: 'text-slate-600 dark:text-slate-400',
    trendUp: 'text-green-600 dark:text-green-400',
    trendDown: 'text-red-600 dark:text-red-400',
  },
  blue: {
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    iconColor: 'text-blue-600 dark:text-blue-400',
    trendUp: 'text-green-600 dark:text-green-400',
    trendDown: 'text-red-600 dark:text-red-400',
  },
  green: {
    iconBg: 'bg-green-100 dark:bg-green-900/30',
    iconColor: 'text-green-600 dark:text-green-400',
    trendUp: 'text-green-600 dark:text-green-400',
    trendDown: 'text-red-600 dark:text-red-400',
  },
  orange: {
    iconBg: 'bg-orange-100 dark:bg-orange-900/30',
    iconColor: 'text-orange-600 dark:text-orange-400',
    trendUp: 'text-green-600 dark:text-green-400',
    trendDown: 'text-red-600 dark:text-red-400',
  },
  purple: {
    iconBg: 'bg-purple-100 dark:bg-purple-900/30',
    iconColor: 'text-purple-600 dark:text-purple-400',
    trendUp: 'text-green-600 dark:text-green-400',
    trendDown: 'text-red-600 dark:text-red-400',
  },
  red: {
    iconBg: 'bg-red-100 dark:bg-red-900/30',
    iconColor: 'text-red-600 dark:text-red-400',
    trendUp: 'text-green-600 dark:text-green-400',
    trendDown: 'text-red-600 dark:text-red-400',
  },
};

export function StatsCard({
  title,
  value,
  icon,
  description,
  trend,
  variant = 'default',
  href,
  className,
}: StatsCardProps) {
  const styles = variantStyles[variant];
  const Icon = iconMap[icon] || FileText;
  
  const TrendIcon = trend?.value && trend.value > 0 
    ? TrendingUp 
    : trend?.value && trend.value < 0 
      ? TrendingDown 
      : Minus;
  
  const trendColor = trend?.value && trend.value > 0
    ? styles.trendUp
    : trend?.value && trend.value < 0
      ? styles.trendDown
      : 'text-slate-500';

  const content = (
    <Card className={cn(
      "transition-all hover:shadow-md",
      href && "cursor-pointer hover:border-slate-300 dark:hover:border-slate-600",
      className
    )}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {title}
            </p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
            {description && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {description}
              </p>
            )}
            {trend && (
              <div className="flex items-center gap-1">
                <TrendIcon className={cn("h-4 w-4", trendColor)} />
                <span className={cn("text-sm font-medium", trendColor)}>
                  {trend.value > 0 ? '+' : ''}{trend.value}%
                </span>
                {trend.label && (
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {trend.label}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className={cn("p-3 rounded-lg", styles.iconBg)}>
            <Icon className={cn("h-6 w-6", styles.iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <a href={href} className="block">
        {content}
      </a>
    );
  }

  return content;
}

/**
 * Stats Card Grid
 * 
 * Responsive grid layout for multiple stats cards.
 */
export function StatsCardGrid({ 
  children, 
  columns = 4,
  className 
}: { 
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}) {
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={cn("grid gap-4", gridCols[columns], className)}>
      {children}
    </div>
  );
}
