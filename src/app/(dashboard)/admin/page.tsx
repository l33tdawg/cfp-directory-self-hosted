/**
 * Admin Dashboard Page
 * 
 * Redirects to the main dashboard which now includes admin features.
 * All admin functionality is consolidated in /dashboard for admins.
 */

import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Admin Dashboard',
};

export default async function AdminDashboardPage() {
  // Redirect to the main dashboard - admin features are shown there for admin users
  redirect('/dashboard');
}
