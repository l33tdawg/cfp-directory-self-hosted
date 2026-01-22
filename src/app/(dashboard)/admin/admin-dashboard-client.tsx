'use client';

/**
 * Admin Dashboard Client Component
 * 
 * Client-side wrapper with customizable, draggable and resizable sections.
 * Uses react-grid-layout for drag-and-drop and resize functionality.
 */

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Shield, Settings, BarChart3 } from 'lucide-react';
import { 
  AdminStatsCards, 
  SystemHealthCard, 
  PendingItemsCard, 
  RecentActivityFeed,
  QuickActionsCard 
} from '@/components/admin';
import { DashboardGrid, DashboardWidget } from '@/components/dashboard/dashboard-grid';
import type { 
  AdminStats, 
  SystemHealth, 
  PendingItems, 
  RecentActivity 
} from '@/lib/health-checks';

interface AdminDashboardClientProps {
  userName: string;
  stats: AdminStats;
  health: SystemHealth;
  pendingItems: PendingItems;
  recentActivity: RecentActivity[];
}

// Define the dashboard widgets
const DASHBOARD_WIDGETS: DashboardWidget[] = [
  { id: 'stats', title: 'Statistics', minW: 6, minH: 2, maxH: 3 },
  { id: 'quick-actions', title: 'Quick Actions', minW: 3, minH: 2 },
  { id: 'pending-items', title: 'Pending Items', minW: 3, minH: 2 },
  { id: 'system-health', title: 'System Health', minW: 3, minH: 2 },
  { id: 'recent-activity', title: 'Recent Activity', minW: 3, minH: 2 },
];

export function AdminDashboardClient({
  userName,
  stats,
  health,
  pendingItems,
  recentActivity,
}: AdminDashboardClientProps) {
  const [mounted, setMounted] = useState(false);

  // Handle client-side hydration - this pattern is intentional for SSR
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Memoize the widget content
  const widgetContent = useMemo(() => [
    // Stats Widget
    <div key="stats" className="h-full p-4">
      <AdminStatsCards stats={stats} />
    </div>,
    
    // Quick Actions Widget
    <div key="quick-actions" className="h-full">
      <QuickActionsCard />
    </div>,
    
    // Pending Items Widget
    <div key="pending-items" className="h-full">
      <PendingItemsCard items={pendingItems} />
    </div>,
    
    // System Health Widget
    <div key="system-health" className="h-full">
      <SystemHealthCard health={health} />
    </div>,
    
    // Recent Activity Widget
    <div key="recent-activity" className="h-full">
      <RecentActivityFeed activities={recentActivity} />
    </div>,
  ], [stats, pendingItems, health, recentActivity]);

  // Show loading skeleton during SSR/hydration
  if (!mounted) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl animate-pulse">
        <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-xl mb-8" />
        <div className="h-24 bg-slate-200 dark:bg-slate-800 rounded-xl mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          </div>
          <div className="space-y-6">
            <div className="h-48 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

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
              Welcome back, {userName}. Here&apos;s what&apos;s happening on your platform.
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
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
      </div>

      {/* Draggable & Resizable Dashboard Grid */}
      <DashboardGrid widgets={DASHBOARD_WIDGETS} storageKey="admin-dashboard-grid-layout">
        {widgetContent}
      </DashboardGrid>
    </div>
  );
}
