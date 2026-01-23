'use client';

/**
 * Recent Activity Feed
 * 
 * Shows recent system activity for admin overview.
 * Pulls from centralized ActivityLog table.
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Activity, 
  FileText, 
  Star, 
  UserPlus,
  Clock,
  Calendar,
  Settings,
  Shield,
  Upload,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ActivityItem {
  id: string;
  type: 'submission' | 'review' | 'user' | 'security' | 'event' | 'settings' | 'file';
  action?: string;
  title: string;
  subtitle: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
  user?: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  } | null;
}

interface RecentActivityFeedProps {
  activities: ActivityItem[];
}

const typeConfig = {
  submission: {
    icon: FileText,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  review: {
    icon: Star,
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
  },
  user: {
    icon: UserPlus,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  security: {
    icon: Shield,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
  event: {
    icon: Calendar,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
  },
  settings: {
    icon: Settings,
    color: 'text-slate-600 dark:text-slate-400',
    bgColor: 'bg-slate-100 dark:bg-slate-900/30',
  },
  file: {
    icon: Upload,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
  },
};

function getActionBadgeColor(action?: string): string {
  if (!action) return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  
  if (action.includes('CREATED') || action.includes('ACCEPTED') || action.includes('PUBLISHED') || 
      action.includes('ENABLED') || action.includes('VERIFIED')) {
    return 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300';
  }
  if (action.includes('DELETED') || action.includes('REJECTED') || action.includes('REMOVED') || 
      action.includes('DISABLED') || action.includes('FAILED')) {
    return 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300';
  }
  if (action.includes('UPDATED') || action.includes('CHANGED')) {
    return 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300';
  }
  if (action.includes('INVITED') || action.includes('ASSIGNED')) {
    return 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300';
  }
  return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
}

export function RecentActivityFeed({ activities }: RecentActivityFeedProps) {
  return (
    <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/50">
            <Activity className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
            <CardDescription>Latest system activity from activity log</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No recent activity</p>
            <p className="text-xs mt-1">Activity will appear here as users interact with the system</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => {
              const config = typeConfig[activity.type] || typeConfig.user;
              const Icon = config.icon;
              const initials = activity.user?.name
                ? activity.user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                : activity.user?.email?.[0]?.toUpperCase() || 'S';
              
              return (
                <div 
                  key={activity.id} 
                  className="flex items-start gap-3 pb-4 border-b last:border-0 last:pb-0"
                >
                  <div className={`p-2 rounded-lg ${config.bgColor} flex-shrink-0`}>
                    <Icon className={`h-4 w-4 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {activity.title}
                    </p>
                    
                    {/* User info */}
                    <div className="flex items-center gap-2 mt-1">
                      {activity.user ? (
                        <>
                          <Avatar className="h-4 w-4">
                            <AvatarImage src={activity.user.image || undefined} />
                            <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {activity.user.name || activity.user.email?.split('@')[0]}
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-slate-400 italic">System</span>
                      )}
                    </div>
                    
                    {/* Time and badges */}
                    <div className="flex items-center flex-wrap gap-2 mt-1">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-slate-400" />
                        <span className="text-xs text-slate-400">
                          {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                        </span>
                      </div>
                      
                      {/* Action type badge */}
                      {activity.action && (
                        <Badge className={`text-[10px] px-1.5 py-0 ${getActionBadgeColor(activity.action)}`}>
                          {activity.type}
                        </Badge>
                      )}
                      
                      {/* Contextual badges */}
                      {activity.type === 'review' && activity.metadata?.score !== undefined && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          Score: {String(activity.metadata.score)}/5
                        </Badge>
                      )}
                      {activity.metadata?.role !== undefined && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {String(activity.metadata.role)}
                        </Badge>
                      )}
                      {activity.metadata?.emailSent === false && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                          Email failed
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
