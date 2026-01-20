'use client';

/**
 * Pending Items Card
 * 
 * Shows items that need admin attention.
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
// Button available for action items
// import { Button } from '@/components/ui/button';
import { 
  AlertCircle, 
  FileText, 
  UserX, 
  Calendar,
  ClipboardList,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';

interface PendingItemsCardProps {
  items: {
    pendingSubmissions: number;
    incompleteOnboarding: number;
    openCfpEvents: number;
    unassignedReviews: number;
  };
}

export function PendingItemsCard({ items }: PendingItemsCardProps) {
  const pendingItems = [
    {
      label: 'Submissions awaiting review',
      count: items.pendingSubmissions,
      icon: FileText,
      href: '/submissions?status=pending',
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    },
    {
      label: 'Unassigned for review',
      count: items.unassignedReviews,
      icon: ClipboardList,
      href: '/submissions?unassigned=true',
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-100 dark:bg-red-900/30',
    },
    {
      label: 'Speakers pending onboarding',
      count: items.incompleteOnboarding,
      icon: UserX,
      href: '/admin/users?onboarding=incomplete',
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      label: 'Events with open CFPs',
      count: items.openCfpEvents,
      icon: Calendar,
      href: '/events?cfp=open',
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
    },
  ];

  const totalPending = items.pendingSubmissions + items.unassignedReviews;
  const hasPendingItems = totalPending > 0 || items.incompleteOnboarding > 0;

  return (
    <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${
            hasPendingItems 
              ? 'bg-orange-100 dark:bg-orange-900/50' 
              : 'bg-green-100 dark:bg-green-900/50'
          }`}>
            <AlertCircle className={`h-5 w-5 ${
              hasPendingItems
                ? 'text-orange-600 dark:text-orange-400'
                : 'text-green-600 dark:text-green-400'
            }`} />
          </div>
          <div>
            <CardTitle className="text-lg">Pending Items</CardTitle>
            <CardDescription>
              {hasPendingItems 
                ? 'Items requiring your attention' 
                : 'All caught up!'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {pendingItems.map((item) => {
          const Icon = item.icon;
          if (item.count === 0) return null;
          
          return (
            <Link 
              key={item.label} 
              href={item.href}
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${item.bgColor}`}>
                  <Icon className={`h-4 w-4 ${item.color}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {item.count} {item.label}
                  </p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
            </Link>
          );
        })}
        
        {!hasPendingItems && (
          <div className="text-center py-6 text-slate-500 dark:text-slate-400">
            <p className="text-sm">No pending items requiring attention</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
