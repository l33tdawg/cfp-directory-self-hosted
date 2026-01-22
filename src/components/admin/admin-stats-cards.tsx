'use client';

/**
 * Admin Stats Cards
 * 
 * Statistics overview cards for the admin dashboard.
 */

import { Card, CardContent } from '@/components/ui/card';
import { Users, Calendar, FileText, UserCheck, TrendingUp } from 'lucide-react';
import Link from 'next/link';

interface AdminStatsCardsProps {
  stats: {
    totalUsers: number;
    totalEvents: number;
    totalSubmissions: number;
    totalReviewers: number;
    pendingSubmissions: number;
    recentUsers: number;
  };
}

export function AdminStatsCards({ stats }: AdminStatsCardsProps) {
  const cards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      href: '/admin/users',
      color: 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400',
      trend: stats.recentUsers > 0 ? `+${stats.recentUsers} this week` : undefined,
    },
    {
      title: 'Total Events',
      value: stats.totalEvents,
      icon: Calendar,
      href: '/admin/events',
      color: 'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400',
    },
    {
      title: 'Submissions',
      value: stats.totalSubmissions,
      icon: FileText,
      href: '/submissions',
      color: 'bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400',
    },
    {
      title: 'Reviewers',
      value: stats.totalReviewers,
      icon: UserCheck,
      href: '/admin/users?role=REVIEWER',
      color: 'bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400',
    },
  ];

  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Link key={card.title} href={card.href}>
            <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer group h-full">
              <CardContent className="pt-3 px-3 pb-3 sm:pt-5 sm:px-5 sm:pb-4">
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className={`p-2 sm:p-3 rounded-lg sm:rounded-xl ${card.color}`}>
                    <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                      {card.value.toLocaleString()}
                    </p>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 truncate">
                      {card.title}
                    </p>
                    {card.trend && (
                      <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1 mt-0.5 sm:mt-1">
                        <TrendingUp className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{card.trend}</span>
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
