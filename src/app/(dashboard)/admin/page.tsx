/**
 * Admin Dashboard Page
 * 
 * Main admin dashboard with system overview, stats, and quick actions.
 */

import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
// Badge available if needed
// import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Shield, Settings, BarChart3 } from 'lucide-react';
import { 
  getSystemHealth, 
  getAdminStats, 
  getPendingItems, 
  getRecentActivity 
} from '@/lib/health-checks';
import { 
  AdminStatsCards, 
  SystemHealthCard, 
  PendingItemsCard, 
  RecentActivityFeed,
  QuickActionsCard 
} from '@/components/admin';

export const metadata = {
  title: 'Admin Dashboard',
};

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();
  
  // Double-check admin access
  if (user.role !== 'ADMIN') {
    redirect('/dashboard?error=unauthorized');
  }
  
  // Fetch all dashboard data in parallel
  const [health, stats, pendingItems, recentActivity] = await Promise.all([
    getSystemHealth(),
    getAdminStats(),
    getPendingItems(),
    getRecentActivity(10),
  ]);
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8">
        <div className="space-y-4">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-indigo-100/80 to-purple-100/80 dark:from-indigo-900/30 dark:to-purple-900/30 text-indigo-700 dark:text-indigo-300 text-sm font-medium backdrop-blur-sm border border-indigo-200/50 dark:border-indigo-800/50">
            <Shield className="h-4 w-4" />
            <span>Admin Dashboard</span>
            <BarChart3 className="h-4 w-4" />
          </div>
          
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">
              <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Platform Overview
              </span>
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
              Welcome back, {user.name || 'Admin'}. Here&apos;s what&apos;s happening on your platform.
            </p>
          </div>
        </div>
        
        <Button 
          asChild 
          size="lg" 
          className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <Link href="/settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            System Settings
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="mb-8">
        <AdminStatsCards stats={stats} />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Actions */}
          <QuickActionsCard />
          
          {/* Pending Items */}
          <PendingItemsCard items={pendingItems} />
        </div>
        
        {/* Right Column - 1/3 width */}
        <div className="space-y-6">
          {/* System Health */}
          <SystemHealthCard health={health} />
          
          {/* Recent Activity */}
          <RecentActivityFeed activities={recentActivity} />
        </div>
      </div>
    </div>
  );
}
