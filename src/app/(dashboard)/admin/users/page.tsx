/**
 * Admin Users Page
 * 
 * User management dashboard for administrators.
 */

import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingUp } from 'lucide-react';
import { UserList } from '@/components/admin/user-list';
import { InviteUserDialog } from '@/components/admin/invite-user-dialog';

export const metadata = {
  title: 'User Management',
};

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const currentUser = await getCurrentUser();
  
  if (currentUser.role !== 'ADMIN') {
    redirect('/dashboard?error=unauthorized');
  }
  
  // Fetch all users with related data
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      createdAt: true,
      speakerProfile: {
        select: { onboardingCompleted: true },
      },
      reviewerProfile: {
        select: { onboardingCompleted: true },
      },
      _count: {
        select: {
          submissions: true,
          reviews: true,
        },
      },
    },
    orderBy: [
      { role: 'asc' },
      { createdAt: 'desc' },
    ],
  });
  
  // Get role distribution
  const roleStats = await prisma.user.groupBy({
    by: ['role'],
    _count: true,
  });
  
  const roleCounts = roleStats.reduce((acc, item) => {
    acc[item.role] = item._count;
    return acc;
  }, {} as Record<string, number>);
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8">
        <div className="space-y-4">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100/80 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium backdrop-blur-sm border border-blue-200/50 dark:border-blue-800/50">
            <Users className="h-4 w-4" />
            <span>User Management</span>
            <TrendingUp className="h-4 w-4" />
          </div>
          
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                Users
              </span>
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
              Manage user accounts, roles, and permissions
            </p>
          </div>
        </div>
        
        <InviteUserDialog />
      </div>
      
      {/* Role Stats */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Badge variant="secondary" className="px-3 py-1">
          Total: {users.length}
        </Badge>
        {roleCounts.ADMIN && (
          <Badge className="bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 px-3 py-1">
            Admins: {roleCounts.ADMIN}
          </Badge>
        )}
        {roleCounts.ORGANIZER && (
          <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 px-3 py-1">
            Organizers: {roleCounts.ORGANIZER}
          </Badge>
        )}
        {roleCounts.REVIEWER && (
          <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 px-3 py-1">
            Reviewers: {roleCounts.REVIEWER}
          </Badge>
        )}
        {roleCounts.SPEAKER && (
          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 px-3 py-1">
            Speakers: {roleCounts.SPEAKER}
          </Badge>
        )}
        {roleCounts.USER && (
          <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-900/50 dark:text-gray-300 px-3 py-1">
            Users: {roleCounts.USER}
          </Badge>
        )}
      </div>
      
      {/* User List */}
      <UserList 
        initialUsers={users} 
        currentUserId={currentUser.id}
        totalCount={users.length}
      />
    </div>
  );
}
