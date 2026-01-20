/**
 * Admin Dashboard Page
 * 
 * Main admin dashboard with system overview, stats, and quick actions.
 * Uses client component for customizable, draggable sections.
 */

import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { 
  getSystemHealth, 
  getAdminStats, 
  getPendingItems, 
  getRecentActivity 
} from '@/lib/health-checks';
import { AdminDashboardClient } from './admin-dashboard-client';

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
    <AdminDashboardClient
      userName={user.name || 'Admin'}
      stats={stats}
      health={health}
      pendingItems={pendingItems}
      recentActivity={recentActivity}
    />
  );
}
