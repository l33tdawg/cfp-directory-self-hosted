/**
 * Settings Page
 * 
 * Site settings and administration for the self-hosted CFP system.
 * Redesigned with modern UI matching other admin pages.
 */

import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Settings, 
  Building2, 
  Key, 
  Shield, 
  Layout, 
  Mail, 
  Sparkles,
  ExternalLink,
  FileText,
} from 'lucide-react';
import { SiteSettingsForm } from './site-settings-form';
import { FederationSettingsForm } from './federation/federation-settings-form';
import { LandingPageForm } from './landing-page-form';
import { SmtpSettingsForm } from './smtp-settings-form';

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

  // Get email template count
  const emailTemplateCount = await prisma.emailTemplate.count();
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Header Section */}
      <div className="mb-8">
        <div className="space-y-4">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100/80 dark:bg-slate-900/30 text-slate-700 dark:text-slate-300 text-sm font-medium backdrop-blur-sm border border-slate-200/50 dark:border-slate-800/50">
            <Settings className="h-4 w-4" />
            <span>System Configuration</span>
            <Sparkles className="h-4 w-4" />
          </div>
          
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">
              <span className="bg-gradient-to-r from-slate-700 via-indigo-600 to-purple-600 bg-clip-text text-transparent dark:from-slate-200 dark:via-indigo-400 dark:to-purple-400">
                Settings
              </span>
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
              Configure your CFP Directory instance, email settings, and user management
            </p>
          </div>
        </div>
      </div>
      
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 h-auto p-1 bg-slate-100/80 dark:bg-slate-800/80">
          <TabsTrigger value="general" className="flex items-center gap-2 py-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">General</span>
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2 py-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900">
            <Mail className="h-4 w-4" />
            <span className="hidden sm:inline">Email</span>
          </TabsTrigger>
          <TabsTrigger value="landing" className="flex items-center gap-2 py-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900">
            <Layout className="h-4 w-4" />
            <span className="hidden sm:inline">Landing</span>
          </TabsTrigger>
          <TabsTrigger value="federation" className="flex items-center gap-2 py-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900">
            <Key className="h-4 w-4" />
            <span className="hidden sm:inline">Federation</span>
          </TabsTrigger>
        </TabsList>
        
        {/* General Settings */}
        <TabsContent value="general">
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                  <Building2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <CardTitle>Organization Settings</CardTitle>
                  <CardDescription>
                    Configure your organization&apos;s details and branding
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <SiteSettingsForm settings={settings} />
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Email Settings */}
        <TabsContent value="email" className="space-y-6">
          {/* SMTP Configuration */}
          <SmtpSettingsForm />
          
          {/* Email Templates Link */}
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900/30">
                    <FileText className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                  </div>
                  <div>
                    <CardTitle>Email Templates</CardTitle>
                    <CardDescription>
                      Customize the content of system emails
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="secondary">
                  {emailTemplateCount} templates
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Manage email templates for welcome messages, submission notifications, 
                status updates, and more. Each template supports rich text editing and 
                variable placeholders.
              </p>
              <Link href="/admin/email-templates">
                <Button>
                  <FileText className="h-4 w-4 mr-2" />
                  Manage Email Templates
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Landing Page */}
        <TabsContent value="landing">
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
                  <Layout className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <CardTitle>Landing Page</CardTitle>
                  <CardDescription>
                    Customize the content and layout of your public landing page
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <LandingPageForm 
                currentContent={settings.landingPageContent} 
                currentSections={settings.landingPageSections as object[] | null}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Federation Settings */}
        <TabsContent value="federation" className="space-y-6">
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                    <Key className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <CardTitle>Federation Settings</CardTitle>
                    <CardDescription>
                      Connect to CFP Directory&apos;s speaker network
                    </CardDescription>
                  </div>
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
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border">
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
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 text-sm inline-flex items-center gap-1"
                >
                  Learn more about federation licenses
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
