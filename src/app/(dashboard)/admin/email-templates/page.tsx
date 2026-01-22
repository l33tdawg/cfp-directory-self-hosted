/**
 * Admin Email Templates Page
 * 
 * Manage system email templates with rich text editing.
 */

import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Mail, Sparkles } from 'lucide-react';
import { EmailTemplateManagement } from '@/components/admin/email-template-management';

export const metadata = {
  title: 'Email Templates',
};

export const dynamic = 'force-dynamic';

export default async function AdminEmailTemplatesPage() {
  const user = await getCurrentUser();
  
  if (user.role !== 'ADMIN') {
    redirect('/dashboard?error=unauthorized');
  }

  // Get all templates grouped by category
  const rawTemplates = await prisma.emailTemplate.findMany({
    orderBy: [
      { category: 'asc' },
      { name: 'asc' },
    ],
  });

  // Transform to match expected types (variables is Json in Prisma, Record<string, string> in component)
  const templates = rawTemplates.map(t => ({
    ...t,
    variables: (t.variables as Record<string, string>) || {},
  }));

  // Count unique categories
  const uniqueCategories = new Set(templates.map(t => t.category || 'general'));

  // Get stats
  const stats = {
    total: templates.length,
    enabled: templates.filter(t => t.enabled).length,
    disabled: templates.filter(t => !t.enabled).length,
    categories: uniqueCategories.size,
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header Section */}
      <div className="mb-8">
        <div className="space-y-4">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-100/80 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 text-sm font-medium backdrop-blur-sm border border-teal-200/50 dark:border-teal-800/50">
            <Mail className="h-4 w-4" />
            <span>Email Management</span>
            <Sparkles className="h-4 w-4" />
          </div>
          
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">
              <span className="bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 bg-clip-text text-transparent">
                Email Templates
              </span>
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
              Customize the content of system emails sent to users and speakers
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl border shadow-lg p-6">
        <EmailTemplateManagement 
          initialTemplates={templates}
          stats={stats}
        />
      </div>
    </div>
  );
}
