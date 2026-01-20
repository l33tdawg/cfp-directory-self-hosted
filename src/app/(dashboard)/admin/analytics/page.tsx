/**
 * Admin Analytics Page
 * 
 * Platform analytics and activity log.
 */

import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, TrendingUp, Activity, Users, Calendar, FileText } from 'lucide-react';
import { ActivityLog } from '@/components/admin/activity-log';
import { getActivitySummary, getActivityLogs } from '@/lib/activity-logger';
import { subDays } from 'date-fns';

export const metadata = {
  title: 'Analytics',
};

export const dynamic = 'force-dynamic';

export default async function AdminAnalyticsPage() {
  const user = await getCurrentUser();
  
  if (user.role !== 'ADMIN') {
    redirect('/dashboard?error=unauthorized');
  }
  
  // Fetch analytics data
  const [activitySummary, recentLogs, stats] = await Promise.all([
    getActivitySummary(7),
    getActivityLogs({ limit: 50 }),
    // Platform stats
    Promise.all([
      prisma.user.count(),
      prisma.event.count(),
      prisma.submission.count(),
      prisma.review.count(),
      // Weekly growth
      prisma.user.count({
        where: { createdAt: { gte: subDays(new Date(), 7) } },
      }),
      prisma.submission.count({
        where: { createdAt: { gte: subDays(new Date(), 7) } },
      }),
    ]).then(([users, events, submissions, reviews, newUsers, newSubmissions]) => ({
      users,
      events,
      submissions,
      reviews,
      newUsers,
      newSubmissions,
    })),
  ]);
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header Section */}
      <div className="mb-8">
        <div className="space-y-4">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-100/80 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-sm font-medium backdrop-blur-sm border border-indigo-200/50 dark:border-indigo-800/50">
            <BarChart3 className="h-4 w-4" />
            <span>Analytics</span>
            <TrendingUp className="h-4 w-4" />
          </div>
          
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">
              <span className="bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
                Platform Analytics
              </span>
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
              Monitor platform activity and track key metrics
            </p>
          </div>
        </div>
      </div>
      
      {/* Overview Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.users}</p>
                <p className="text-sm text-slate-500">Total Users</p>
                {stats.newUsers > 0 && (
                  <p className="text-xs text-green-600">+{stats.newUsers} this week</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/50">
                <Calendar className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.events}</p>
                <p className="text-sm text-slate-500">Total Events</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/50">
                <FileText className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.submissions}</p>
                <p className="text-sm text-slate-500">Submissions</p>
                {stats.newSubmissions > 0 && (
                  <p className="text-xs text-green-600">+{stats.newSubmissions} this week</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/50">
                <Activity className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activitySummary.totalActions}</p>
                <p className="text-sm text-slate-500">Actions (7d)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Tabs */}
      <Tabs defaultValue="activity" className="space-y-6">
        <TabsList>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Activity Log
          </TabsTrigger>
          <TabsTrigger value="breakdown" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Action Breakdown
          </TabsTrigger>
        </TabsList>
        
        {/* Activity Log Tab */}
        <TabsContent value="activity">
          <ActivityLog logs={recentLogs.logs} />
        </TabsContent>
        
        {/* Action Breakdown Tab */}
        <TabsContent value="breakdown">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Top Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Top Actions (Last 7 Days)</CardTitle>
                <CardDescription>Most frequent activity types</CardDescription>
              </CardHeader>
              <CardContent>
                {activitySummary.actionBreakdown.length === 0 ? (
                  <p className="text-center py-8 text-slate-500">No actions recorded</p>
                ) : (
                  <div className="space-y-3">
                    {activitySummary.actionBreakdown.map((item, index) => (
                      <div key={item.action} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-slate-500 w-6">
                            #{index + 1}
                          </span>
                          <span className="text-sm">
                            {item.action.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <Badge variant="secondary">{item.count}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Summary Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Activity Summary</CardTitle>
                <CardDescription>Platform activity metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Total Actions (7 days)</span>
                  <span className="font-bold">{activitySummary.totalActions}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Action Types</span>
                  <span className="font-bold">{activitySummary.actionBreakdown.length}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Total Reviews</span>
                  <span className="font-bold">{stats.reviews}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Review Rate</span>
                  <span className="font-bold">
                    {stats.submissions > 0 
                      ? `${((stats.reviews / stats.submissions) * 100).toFixed(1)}%`
                      : 'N/A'
                    }
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
