/**
 * Admin Layout
 * 
 * Layout for admin-specific pages.
 * Note: Sidebar is rendered by the parent DashboardLayoutClient based on user role.
 */

import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  
  // Only admins can access admin pages
  if (user.role !== 'ADMIN') {
    redirect('/dashboard?error=unauthorized');
  }
  
  // Just render children - sidebar is handled by parent layout
  return <>{children}</>;
}
