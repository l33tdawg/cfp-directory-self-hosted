/**
 * Settings Page
 * 
 * Site settings and administration for the self-hosted CFP system.
 * Redesigned with modern UI matching other admin pages.
 */

import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Building2, 
  Key, 
  Shield, 
  Layout, 
  Mail, 
  Sparkles,
  FileText,
  ExternalLink,
  Scale,
} from 'lucide-react';
import { SiteSettingsForm } from './site-settings-form';
import { FederationSettingsForm } from './federation/federation-settings-form';
import { LandingPageForm } from './landing-page-form';
import { LegalPagesForm } from './legal-pages-form';
import { SmtpSettingsForm } from './smtp-settings-form';
import { EmailTemplateManagement } from '@/components/admin/email-template-management';

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

  // Get all email templates grouped by category
  const rawTemplates = await prisma.emailTemplate.findMany({
    orderBy: [
      { category: 'asc' },
      { name: 'asc' },
    ],
  });

  // Transform to match expected types
  const emailTemplates = rawTemplates.map(t => ({
    ...t,
    variables: (t.variables as Record<string, string>) || {},
  }));

  // Count unique categories
  const uniqueCategories = new Set(emailTemplates.map(t => t.category || 'general'));

  // Get email template stats
  const emailTemplateStats = {
    total: emailTemplates.length,
    enabled: emailTemplates.filter(t => t.enabled).length,
    disabled: emailTemplates.filter(t => !t.enabled).length,
    categories: uniqueCategories.size,
  };
  
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
        <TabsList className="grid w-full grid-cols-6 h-auto p-1 bg-slate-100/80 dark:bg-slate-800/80">
          <TabsTrigger value="general" className="flex items-center gap-2 py-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">General</span>
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2 py-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900">
            <Mail className="h-4 w-4" />
            <span className="hidden sm:inline">Email</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2 py-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Templates</span>
          </TabsTrigger>
          <TabsTrigger value="landing" className="flex items-center gap-2 py-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900">
            <Layout className="h-4 w-4" />
            <span className="hidden sm:inline">Landing</span>
          </TabsTrigger>
          <TabsTrigger value="legal" className="flex items-center gap-2 py-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900">
            <Scale className="h-4 w-4" />
            <span className="hidden sm:inline">Legal</span>
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
        </TabsContent>
        
        {/* Email Templates */}
        <TabsContent value="templates">
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900/30">
                  <FileText className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                </div>
                <div>
                  <CardTitle>Email Templates</CardTitle>
                  <CardDescription>
                    Customize the content of system emails sent to users and speakers
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <EmailTemplateManagement 
                initialTemplates={emailTemplates}
                stats={emailTemplateStats}
              />
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
        
        {/* Legal Pages */}
        <TabsContent value="legal">
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                  <Scale className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <CardTitle>Legal Pages</CardTitle>
                  <CardDescription>
                    Customize your Privacy Policy and Terms of Service content
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <LegalPagesForm 
                privacyPolicyContent={settings.privacyPolicyContent} 
                termsOfServiceContent={settings.termsOfServiceContent}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Federation Settings */}
        <TabsContent value="federation" className="space-y-6">
          {/* Federation Info Banner */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4">
            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-md bg-indigo-100 dark:bg-indigo-900/30 shrink-0">
                <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  Federation connects your instance to CFP Directory&apos;s speaker network, 
                  enabling rich profiles, direct messaging, and real-time sync.
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    End-to-end encrypted
                  </span>
                  <span className="flex items-center gap-1">
                    <Key className="h-3 w-3" />
                    Your keys stay local
                  </span>
                  <a 
                    href="https://cfp.directory/pricing" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Learn more
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>
          
          {/* Federation Settings Form */}
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                    <Key className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <CardTitle>Federation Setup</CardTitle>
                    <CardDescription>
                      Configure your connection to CFP Directory&apos;s speaker network
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
