'use client';

/**
 * Plugin Logs Viewer Component
 *
 * Displays plugin logs with level filtering, pagination,
 * and the ability to clear logs.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  Trash2,
  Loader2,
  AlertCircle,
  Info,
  AlertTriangle,
  Bug,
  Filter,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface PluginLog {
  id: string;
  pluginId: string;
  level: string;
  message: string;
  metadata: unknown;
  createdAt: string;
}

interface PluginLogsViewerProps {
  pluginId: string;
  pluginName: string;
}

const LEVEL_CONFIG = {
  debug: {
    icon: Bug,
    color: 'text-slate-500',
    bg: 'bg-slate-100 dark:bg-slate-800',
    badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  },
  info: {
    icon: Info,
    color: 'text-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-950',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  },
  warn: {
    icon: AlertTriangle,
    color: 'text-yellow-500',
    bg: 'bg-yellow-50 dark:bg-yellow-950',
    badge:
      'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  },
  error: {
    icon: AlertCircle,
    color: 'text-red-500',
    bg: 'bg-red-50 dark:bg-red-950',
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  },
} as const;

export function PluginLogsViewer({
  pluginId,
  pluginName,
}: PluginLogsViewerProps) {
  const [logs, setLogs] = useState<PluginLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 25;

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (levelFilter !== 'all') {
        params.set('level', levelFilter);
      }

      const response = await fetch(
        `/api/admin/plugins/${pluginId}/logs?${params}`
      );
      if (!response.ok) throw new Error('Failed to fetch logs');

      const data = await response.json();
      setLogs(data.logs);
      setTotalPages(data.pagination.totalPages);
      setTotal(data.pagination.total);
    } catch {
      toast.error('Failed to load plugin logs');
    } finally {
      setIsLoading(false);
    }
  }, [pluginId, page, levelFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleClearLogs = async () => {
    setIsClearing(true);
    try {
      const response = await fetch(
        `/api/admin/plugins/${pluginId}/logs`,
        { method: 'DELETE' }
      );
      if (!response.ok) throw new Error('Failed to clear logs');

      const data = await response.json();
      toast.success(`Cleared ${data.deletedCount} log entries`);
      setLogs([]);
      setTotal(0);
      setTotalPages(1);
      setPage(1);
    } catch {
      toast.error('Failed to clear logs');
    } finally {
      setIsClearing(false);
    }
  };

  const handleFilterChange = (value: string) => {
    setLevelFilter(value);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Select value={levelFilter} onValueChange={handleFilterChange}>
            <SelectTrigger className="w-[140px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="debug">Debug</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warn">Warning</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {total} log{total !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLogs}
            disabled={isLoading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={total === 0 || isClearing}
                className="text-red-600 hover:text-red-700"
              >
                {isClearing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Clear Logs
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear Plugin Logs</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all log entries for{' '}
                  <strong>{pluginName}</strong>. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleClearLogs}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Clear All Logs
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Log Entries */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12">
          <Info className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
          <p className="text-slate-500 dark:text-slate-400">No log entries found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => {
            const config =
              LEVEL_CONFIG[log.level as keyof typeof LEVEL_CONFIG] ||
              LEVEL_CONFIG.info;
            const Icon = config.icon;

            return (
              <div
                key={log.id}
                className={`rounded-md border border-slate-200 dark:border-slate-800 p-3 ${config.bg}`}
              >
                <div className="flex items-start gap-3">
                  <Icon className={`h-4 w-4 mt-0.5 ${config.color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={config.badge}>{log.level}</Badge>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {formatDistanceToNow(new Date(log.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-200 break-words">
                      {log.message}
                    </p>
                    {log.metadata != null && (
                      <pre className="mt-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 rounded p-2 overflow-x-auto">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <span className="text-sm text-slate-500 dark:text-slate-400">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
