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
} from 'lucide-react';
import { SiteSettingsForm } from './site-settings-form';
import { FederationSettingsForm } from './federation/federation-settings-form';
import { LandingPageForm } from './landing-page-form';
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
        <TabsList className="grid w-full grid-cols-5 h-auto p-1 bg-slate-100/80 dark:bg-slate-800/80">
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
        
        {/* Federation Settings */}
        <TabsContent value="federation" className="space-y-6">
          {/* Federation Value Proposition - Hero Section */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-8 text-white shadow-xl">
            {/* Background decoration */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCAyLTRzLTItMi00LTJjLTIgMC00IDItNCAyczIgMiA0IDJjMiAwIDItMiAyLTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
            
            <div className="relative">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
                  <Sparkles className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium text-white/90">Federation Network</span>
              </div>
              
              <h2 className="text-2xl sm:text-3xl font-bold mb-3">
                Connect to 10,000+ Speakers Worldwide
              </h2>
              <p className="text-lg text-white/90 mb-6 max-w-2xl">
                Stop hunting for speakers. Let them find you. Federation connects your self-hosted 
                instance to CFP Directory&apos;s global network of conference speakers actively looking for speaking opportunities.
              </p>
              
              {/* Value Props Grid */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                  <div className="text-3xl mb-2">🎯</div>
                  <h3 className="font-semibold mb-1">Instant Reach</h3>
                  <p className="text-sm text-white/80">Your CFP visible to thousands of qualified speakers the moment you publish</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                  <div className="text-3xl mb-2">📋</div>
                  <h3 className="font-semibold mb-1">Rich Profiles</h3>
                  <p className="text-sm text-white/80">Complete speaker profiles with bios, photos, talk history, and materials sync automatically</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                  <div className="text-3xl mb-2">💬</div>
                  <h3 className="font-semibold mb-1">Direct Messaging</h3>
                  <p className="text-sm text-white/80">Message speakers directly from your dashboard. They reply from theirs.</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                  <div className="text-3xl mb-2">🔄</div>
                  <h3 className="font-semibold mb-1">Real-time Sync</h3>
                  <p className="text-sm text-white/80">Status updates flow both ways. Speakers stay informed without extra emails.</p>
                </div>
              </div>
              
              {/* Pricing & CTA */}
              <div className="flex flex-wrap items-center gap-6">
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">$99</span>
                    <span className="text-white/80">/year</span>
                  </div>
                  <p className="text-sm text-white/70">Less than $9/month for unlimited events</p>
                </div>
                <a 
                  href="https://cfp.directory/pricing" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white text-indigo-700 font-semibold rounded-lg hover:bg-white/90 transition-colors shadow-lg"
                >
                  Get Federation License
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
          
          {/* Security & Trust Banner */}
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <Shield className="h-8 w-8 text-green-600 dark:text-green-400" />
              <div>
                <h4 className="font-medium text-green-900 dark:text-green-100">End-to-End Encrypted</h4>
                <p className="text-xs text-green-700 dark:text-green-300">RSA-2048 + AES-256-GCM</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <Key className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              <div>
                <h4 className="font-medium text-blue-900 dark:text-blue-100">Your Keys, Your Data</h4>
                <p className="text-xs text-blue-700 dark:text-blue-300">Private key never leaves your server</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
              <Settings className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              <div>
                <h4 className="font-medium text-purple-900 dark:text-purple-100">Full Control</h4>
                <p className="text-xs text-purple-700 dark:text-purple-300">Disable anytime, keep your data</p>
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
