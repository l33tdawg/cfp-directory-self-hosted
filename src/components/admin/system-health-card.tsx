'use client';

/**
 * System Health Card
 * 
 * Displays system health status for database, storage, email, and federation.
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Database, 
  HardDrive, 
  Mail, 
  Link2,
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  HelpCircle
} from 'lucide-react';
import type { SystemHealth, HealthStatus } from '@/lib/health-checks';

interface SystemHealthCardProps {
  health: SystemHealth;
}

const statusConfig: Record<HealthStatus, {
  dot: string;
  badge: string;
  text: string;
  icon: typeof CheckCircle2;
}> = {
  healthy: {
    dot: 'bg-green-500',
    badge: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
    text: 'Healthy',
    icon: CheckCircle2,
  },
  degraded: {
    dot: 'bg-yellow-500',
    badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300',
    text: 'Degraded',
    icon: AlertTriangle,
  },
  unhealthy: {
    dot: 'bg-red-500',
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
    text: 'Unhealthy',
    icon: AlertCircle,
  },
  unknown: {
    dot: 'bg-gray-500',
    badge: 'bg-gray-100 text-gray-700 dark:bg-gray-900/50 dark:text-gray-300',
    text: 'Unknown',
    icon: HelpCircle,
  },
};

interface HealthRowProps {
  icon: React.ReactNode;
  label: string;
  status: HealthStatus;
  latency?: number;
  message?: string;
}

function HealthRow({ icon, label, status, latency, message }: HealthRowProps) {
  const config = statusConfig[status];
  
  return (
    <div className="flex items-center justify-between group py-2">
      <div className="flex items-center gap-3">
        <div className={`h-2 w-2 rounded-full ${config.dot} ${status === 'healthy' ? 'animate-pulse' : ''}`} />
        <span className="text-slate-600 dark:text-slate-400">{icon}</span>
        <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
        {latency !== undefined && (
          <span className="text-xs text-slate-400 dark:text-slate-500">
            ({latency}ms)
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {message && status !== 'healthy' && (
          <span 
            className="text-xs text-slate-500 dark:text-slate-400 hidden group-hover:inline max-w-[150px] truncate" 
            title={message}
          >
            {message}
          </span>
        )}
        <Badge className={config.badge}>{config.text}</Badge>
      </div>
    </div>
  );
}

export function SystemHealthCard({ health }: SystemHealthCardProps) {
  const OverallIcon = statusConfig[health.overall].icon;
  
  return (
    <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${
            health.overall === 'healthy' 
              ? 'bg-green-100 dark:bg-green-900/50' 
              : health.overall === 'unhealthy'
                ? 'bg-red-100 dark:bg-red-900/50'
                : 'bg-yellow-100 dark:bg-yellow-900/50'
          }`}>
            <OverallIcon className={`h-5 w-5 ${
              health.overall === 'healthy'
                ? 'text-green-600 dark:text-green-400'
                : health.overall === 'unhealthy'
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-yellow-600 dark:text-yellow-400'
            }`} />
          </div>
          <div>
            <CardTitle className="text-lg">System Health</CardTitle>
            <CardDescription>Platform status overview</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        <HealthRow
          icon={<Database className="h-4 w-4" />}
          label="Database"
          status={health.database.status}
          latency={health.database.latency}
          message={health.database.message}
        />
        <HealthRow
          icon={<HardDrive className="h-4 w-4" />}
          label="Storage"
          status={health.storage.status}
          latency={health.storage.latency}
          message={health.storage.message}
        />
        <HealthRow
          icon={<Mail className="h-4 w-4" />}
          label="Email Service"
          status={health.email.status}
          latency={health.email.latency}
          message={health.email.message}
        />
        <HealthRow
          icon={<Link2 className="h-4 w-4" />}
          label="Federation"
          status={health.federation.status}
          latency={health.federation.latency}
          message={health.federation.message}
        />
      </CardContent>
    </Card>
  );
}
