'use client';

/**
 * Activity Log Component
 * 
 * Displays a filterable list of activity logs.
 */

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
// Button available for export functionality
// import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Activity, 
  User, 
  Calendar, 
  FileText, 
  Star, 
  Settings,
  Search,
  Filter,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { formatActivityAction, type ActivityAction } from '@/lib/activity-logger';

interface ActivityLogEntry {
  id: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata: unknown;
  ipAddress: string | null;
  createdAt: Date;
  user?: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  } | null;
}

interface ActivityLogProps {
  logs: ActivityLogEntry[];
  showFilters?: boolean;
}

// Icon mapping for activity types (available for enhanced icon selection)
const actionIcons: Record<string, typeof Activity> = {
  user: User,
  calendar: Calendar,
  'file-text': FileText,
  star: Star,
  settings: Settings,
  activity: Activity,
};
void actionIcons; // Reserved for future use

function getIconForAction(action: string): typeof Activity {
  if (action.startsWith('USER_')) return User;
  if (action.startsWith('EVENT_')) return Calendar;
  if (action.startsWith('SUBMISSION_')) return FileText;
  if (action.startsWith('REVIEW_')) return Star;
  if (action.startsWith('SETTINGS_') || action.startsWith('FEDERATION_')) return Settings;
  return Activity;
}

function getColorForAction(action: string): string {
  if (action.includes('CREATED') || action.includes('ACCEPTED') || action.includes('PUBLISHED') || action.includes('ENABLED')) {
    return 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300';
  }
  if (action.includes('DELETED') || action.includes('REJECTED') || action.includes('REMOVED') || action.includes('DISABLED')) {
    return 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300';
  }
  if (action.includes('UPDATED') || action.includes('CHANGED')) {
    return 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300';
  }
  return 'bg-gray-100 text-gray-700 dark:bg-gray-900/50 dark:text-gray-300';
}

export function ActivityLog({ logs, showFilters = true }: ActivityLogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  
  // Filter logs
  const filteredLogs = logs.filter(log => {
    // Entity type filter
    if (entityFilter !== 'all' && log.entityType !== entityFilter) {
      return false;
    }
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        log.action.toLowerCase().includes(query) ||
        log.user?.name?.toLowerCase().includes(query) ||
        log.user?.email?.toLowerCase().includes(query) ||
        log.entityType.toLowerCase().includes(query)
      );
    }
    
    return true;
  });
  
  return (
    <div className="space-y-4">
      {showFilters && (
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search activity..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="w-[160px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="User">Users</SelectItem>
              <SelectItem value="Event">Events</SelectItem>
              <SelectItem value="Submission">Submissions</SelectItem>
              <SelectItem value="Review">Reviews</SelectItem>
              <SelectItem value="Settings">Settings</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      
      {/* Results count */}
      <div className="text-sm text-slate-500">
        Showing {filteredLogs.length} of {logs.length} activities
      </div>
      
      {/* Activity List */}
      {filteredLogs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Activity className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
            <p className="text-slate-500 dark:text-slate-400">
              {logs.length === 0 ? 'No activity recorded yet' : 'No matching activities found'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredLogs.map((log) => {
            const Icon = getIconForAction(log.action);
            const colorClass = getColorForAction(log.action);
            const initials = log.user?.name
              ? log.user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
              : log.user?.email?.[0]?.toUpperCase() || 'S';
            
            return (
              <Card key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`p-2 rounded-lg ${colorClass}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-slate-900 dark:text-white">
                          {formatActivityAction(log.action as ActivityAction)}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {log.entityType}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                        {log.user ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={log.user.image || undefined} />
                              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                            </Avatar>
                            <span>{log.user.name || log.user.email}</span>
                          </div>
                        ) : (
                          <span className="italic">System</span>
                        )}
                        
                        <span title={format(new Date(log.createdAt), 'PPpp')}>
                          {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      
                      {(() => {
                        const metadata = log.metadata;
                        if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null;
                        const entries = Object.entries(metadata as Record<string, unknown>);
                        if (entries.length === 0) return null;
                        return (
                          <div className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                            {entries.map(([key, value]) => (
                              <span key={key} className="mr-3">
                                {key}: {String(value)}
                              </span>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
