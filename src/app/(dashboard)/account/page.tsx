/**
 * Account Settings Page
 * 
 * User account settings including password change.
 * Available to all authenticated users.
 */

import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  User, 
  Key,
  Shield,
  Sparkles,
  Mail,
  Calendar,
} from 'lucide-react';
import { ChangePasswordForm } from '@/components/auth/change-password-form';

export const metadata = {
  title: 'Account Settings',
};

export default async function AccountPage() {
  const user = await getCurrentUser();
  
  // Get full user details
  const userDetails = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      passwordHash: true,
      createdAt: true,
    },
  });

  const hasPassword = !!userDetails?.passwordHash;
  const memberSince = userDetails?.createdAt 
    ? new Intl.DateTimeFormat('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }).format(userDetails.createdAt)
    : 'Unknown';

  // Map USER role to SPEAKER for display
  const displayRole = user.role === 'USER' ? 'Speaker' : user.role.charAt(0) + user.role.slice(1).toLowerCase();
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      {/* Header Section */}
      <div className="mb-8">
        <div className="space-y-4">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100/80 dark:bg-slate-900/30 text-slate-700 dark:text-slate-300 text-sm font-medium backdrop-blur-sm border border-slate-200/50 dark:border-slate-800/50">
            <User className="h-4 w-4" />
            <span>Account Settings</span>
            <Sparkles className="h-4 w-4" />
          </div>
          
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">
              <span className="bg-gradient-to-r from-slate-700 via-indigo-600 to-purple-600 bg-clip-text text-transparent dark:from-slate-200 dark:via-indigo-400 dark:to-purple-400">
                Account
              </span>
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
              Manage your account settings and security preferences
            </p>
          </div>
        </div>
      </div>
      
      <Tabs defaultValue="security" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 h-auto p-1 bg-slate-100/80 dark:bg-slate-800/80">
          <TabsTrigger value="overview" className="flex items-center gap-2 py-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900">
            <User className="h-4 w-4" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2 py-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900">
            <Shield className="h-4 w-4" />
            <span>Security</span>
          </TabsTrigger>
        </TabsList>
        
        {/* Account Overview */}
        <TabsContent value="overview">
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                  <User className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <CardTitle>Account Information</CardTitle>
                  <CardDescription>
                    Your account details and status
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                <div className="flex items-center gap-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                  <div className="p-2 rounded-full bg-slate-200 dark:bg-slate-700">
                    <Mail className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Email</p>
                    <p className="text-base font-medium text-slate-900 dark:text-white">{user.email}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                  <div className="p-2 rounded-full bg-slate-200 dark:bg-slate-700">
                    <Shield className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Role</p>
                    <p className="text-base font-medium text-slate-900 dark:text-white">{displayRole}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                  <div className="p-2 rounded-full bg-slate-200 dark:bg-slate-700">
                    <Calendar className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Member Since</p>
                    <p className="text-base font-medium text-slate-900 dark:text-white">{memberSince}</p>
                  </div>
                </div>
              </div>
              
              <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  To update your name or profile information, visit your{' '}
                  <a href="/profile" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                    profile page
                  </a>.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Security Settings */}
        <TabsContent value="security">
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <Key className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <CardTitle>Change Password</CardTitle>
                  <CardDescription>
                    Update your password to keep your account secure
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {hasPassword ? (
                <ChangePasswordForm />
              ) : (
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-6 text-center">
                  <Shield className="h-10 w-10 text-slate-400 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-1">
                    Social Login Account
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Your account uses social login and doesn&apos;t have a password.
                    You sign in using your connected social account.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Security Tips */}
          <div className="mt-6 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4">
            <h3 className="text-sm font-medium text-slate-900 dark:text-white mb-2">
              Security Tips
            </h3>
            <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1 list-disc list-inside">
              <li>Use a unique password you don&apos;t use elsewhere</li>
              <li>Include uppercase, lowercase, numbers, and symbols</li>
              <li>Consider using a password manager</li>
              <li>Change your password periodically</li>
            </ul>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
