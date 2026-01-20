'use client';

/**
 * Quick Actions Card
 * 
 * Common admin actions for quick access.
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Calendar,
  UserPlus,
  Settings,
  FileText,
  Users,
  Zap
} from 'lucide-react';
import Link from 'next/link';

export function QuickActionsCard() {
  const actions = [
    {
      label: 'Create Event',
      description: 'Set up a new CFP',
      href: '/events/new',
      icon: Calendar,
      variant: 'default' as const,
    },
    {
      label: 'Invite User',
      description: 'Add team member',
      href: '/admin/users/invite',
      icon: UserPlus,
      variant: 'outline' as const,
    },
    {
      label: 'View Submissions',
      description: 'Review pending talks',
      href: '/submissions',
      icon: FileText,
      variant: 'outline' as const,
    },
    {
      label: 'Manage Users',
      description: 'User administration',
      href: '/admin/users',
      icon: Users,
      variant: 'outline' as const,
    },
    {
      label: 'Settings',
      description: 'Site configuration',
      href: '/settings',
      icon: Settings,
      variant: 'outline' as const,
    },
  ];

  return (
    <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/50">
            <Zap className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.label}
              variant={action.variant}
              className="w-full justify-start h-auto py-3"
              asChild
            >
              <Link href={action.href}>
                <Icon className="h-4 w-4 mr-3" />
                <div className="text-left">
                  <div className="font-medium">{action.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {action.description}
                  </div>
                </div>
              </Link>
            </Button>
          );
        })}
      </CardContent>
    </Card>
  );
}
