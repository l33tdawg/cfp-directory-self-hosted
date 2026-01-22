/**
 * Invite User Page
 * 
 * Dedicated page for inviting new users to the platform.
 */

import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { InviteUserForm } from '@/components/admin/invite-user-form';

export const metadata = {
  title: 'Invite User',
};

export default async function InviteUserPage() {
  const currentUser = await getCurrentUser();
  
  if (currentUser.role !== 'ADMIN') {
    redirect('/dashboard?error=unauthorized');
  }
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      {/* Back Link */}
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link href="/admin/users">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Users
          </Link>
        </Button>
      </div>
      
      {/* Header */}
      <div className="space-y-4 mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100/80 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium backdrop-blur-sm border border-blue-200/50 dark:border-blue-800/50">
          <UserPlus className="h-4 w-4" />
          <span>User Invitation</span>
        </div>
        
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Invite New User
            </span>
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-300">
            Send an invitation email to add a new user to your platform
          </p>
        </div>
      </div>
      
      {/* Invite Form Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Send Invitation
          </CardTitle>
          <CardDescription>
            The invited user will receive an email with instructions to join the platform.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InviteUserForm />
        </CardContent>
      </Card>
    </div>
  );
}
