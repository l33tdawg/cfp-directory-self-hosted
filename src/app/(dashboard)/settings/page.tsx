/**
 * Settings Page
 * 
 * Site settings and administration for the self-hosted CFP system.
 */

import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, Key, Shield } from 'lucide-react';
import { SiteSettingsForm } from './site-settings-form';
import { FederationSettingsForm } from './federation/federation-settings-form';
import { UserManagementSection } from './user-management-section';

export const metadata = {
  title: 'Settings',
};

async function getSiteSettings() {
  let settings = await prisma.siteSettings.findUnique({
    where: { id: 'default' },
  });
  
  if (!settings) {
    settings = await prisma.siteSettings.create({
      data: { id: 'default' },
    });
  }
  
  return settings;
}

export default async function SettingsPage() {
  const user = await getCurrentUser();
  
  // Only admins can access settings
  if (user.role !== 'ADMIN') {
    redirect('/dashboard?error=unauthorized');
  }
  
  const settings = await getSiteSettings();
  
  // Get users for management
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      createdAt: true,
    },
    orderBy: [
      { role: 'asc' },
      { createdAt: 'asc' },
    ],
  });
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          Settings
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Manage your CFP Directory Self-Hosted configuration
        </p>
      </div>
      
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="federation" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            Federation
          </TabsTrigger>
        </TabsList>
        
        {/* General Settings */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Organization Settings</CardTitle>
              <CardDescription>
                Configure your organization&apos;s details and branding
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SiteSettingsForm settings={settings} />
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* User Management */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>
                    Manage users and their roles
                  </CardDescription>
                </div>
                <Badge variant="secondary">
                  {users.length} users
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <UserManagementSection users={users} currentUserId={user.id} />
            </CardContent>
          </Card>
          
          {/* Role Descriptions */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Role Permissions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Badge className="bg-red-500 mt-0.5">ADMIN</Badge>
                <div>
                  <p className="font-medium">Administrator</p>
                  <p className="text-sm text-slate-500">
                    Full access to all settings, users, events, and submissions
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge className="bg-purple-500 mt-0.5">ORGANIZER</Badge>
                <div>
                  <p className="font-medium">Event Organizer</p>
                  <p className="text-sm text-slate-500">
                    Can create and manage events, view all submissions, manage review teams
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge className="bg-blue-500 mt-0.5">REVIEWER</Badge>
                <div>
                  <p className="font-medium">Reviewer</p>
                  <p className="text-sm text-slate-500">
                    Can review submissions for events they are assigned to
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="secondary" className="mt-0.5">USER</Badge>
                <div>
                  <p className="font-medium">Speaker/User</p>
                  <p className="text-sm text-slate-500">
                    Can submit talks to events with open CFPs
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Federation Settings */}
        <TabsContent value="federation">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Federation Settings</CardTitle>
                  <CardDescription>
                    Connect to CFP Directory&apos;s speaker network
                  </CardDescription>
                </div>
                {settings.federationEnabled ? (
                  <Badge className="bg-green-500">Active</Badge>
                ) : (
                  <Badge variant="outline">Inactive</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <FederationSettingsForm settings={settings} />
            </CardContent>
          </Card>
          
          {/* Federation Info */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5" />
                About Federation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-600 dark:text-slate-400">
                Federation allows CFP Directory Self-Hosted to connect with 
                CFP Directory&apos;s global speaker network. With an active license:
              </p>
              <ul className="list-disc list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <li>Speakers from CFP Directory can submit to your events</li>
                <li>Their profiles and materials sync automatically</li>
                <li>Bidirectional messaging between organizers and speakers</li>
                <li>Status updates sync back to speakers&apos; dashboards</li>
              </ul>
              
              {/* Security Section */}
              <div className="pt-4 border-t">
                <h4 className="font-medium text-sm mb-2">End-to-End Encryption</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Speaker data is encrypted using your RSA public key before leaving cfp.directory.
                  Only your server can decrypt it using the private key that never leaves this system.
                </p>
                <ul className="mt-2 text-xs text-slate-500 space-y-1">
                  <li>• RSA-2048 for key exchange</li>
                  <li>• AES-256-GCM for payload encryption</li>
                  <li>• HMAC-SHA256 for webhook integrity</li>
                  <li>• TLS 1.3 for transport security</li>
                </ul>
              </div>
              
              <div className="pt-4 border-t">
                <a 
                  href="https://cfp.directory/pricing" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 text-sm"
                >
                  Learn more about federation licenses →
                </a>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
