/**
 * Terms of Service Page
 * 
 * Public page displaying the platform's terms of service.
 * Content is customizable from the admin settings panel.
 * Falls back to built-in default content when not customized.
 */

import Link from 'next/link';
import { prisma } from '@/lib/db/prisma';
import { config } from '@/lib/env';
import { ArrowLeft, FileText, Users, Shield, AlertTriangle, Scale, Ban, RefreshCw, Gavel } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sanitizeHtml } from '@/lib/security/html-sanitizer';

export const metadata = {
  title: 'Terms of Service',
  description: 'Terms and conditions for using our Call for Papers platform.',
};

// Force dynamic rendering to avoid build-time database access
export const dynamic = 'force-dynamic';

export default async function TermsPage() {
  // Get site settings for branding and custom content
  const siteSettings = await prisma.siteSettings.findUnique({
    where: { id: 'default' },
    select: {
      name: true,
      websiteUrl: true,
      termsOfServiceContent: true,
    },
  });

  const siteName = siteSettings?.name || config.app.name;
  const siteUrl = siteSettings?.websiteUrl || config.app.url;
  const customContent = siteSettings?.termsOfServiceContent;

  // If custom content exists, render the simplified layout with custom HTML
  if (customContent) {
    return (
      <div className="min-h-screen bg-slate-950">
        {/* Header */}
        <header className="border-b border-white/10 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-50">
          <div className="container mx-auto px-4 h-16 flex items-center">
            <Button variant="ghost" asChild className="text-white/70 hover:text-white hover:bg-white/10">
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Link>
            </Button>
          </div>
        </header>

        {/* Content */}
        <main className="container mx-auto px-4 py-12 md:py-20">
          <div className="max-w-4xl mx-auto">
            {/* Page Header */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-white/10 mb-6">
                <FileText className="h-8 w-8 text-violet-400" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Terms of Service</h1>
              <p className="text-lg text-white/60">
                Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>

            {/* Custom Content - Sanitized to prevent XSS */}
            <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-6 md:p-8">
              <div
                className="prose prose-invert prose-slate max-w-none prose-headings:text-white prose-p:text-white/70 prose-li:text-white/70 prose-strong:text-white/90 prose-a:text-violet-400 hover:prose-a:text-violet-300"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(customContent) }}
              />
            </div>

            {/* Footer Note */}
            <div className="border-t border-white/10 pt-8 mt-12">
              <p className="text-white/50 text-sm text-center">
                These Terms of Service were last updated on {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.
                By using {siteName}, you acknowledge that you have read and agree to these terms.
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Default content (built-in) when no custom content is set

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-white/10 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <Button variant="ghost" asChild className="text-white/70 hover:text-white hover:bg-white/10">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-12 md:py-20">
        <div className="max-w-4xl mx-auto">
          {/* Page Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-white/10 mb-6">
              <FileText className="h-8 w-8 text-violet-400" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Terms of Service</h1>
            <p className="text-lg text-white/60">
              Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>

          {/* Content Sections */}
          <div className="space-y-12">
            {/* Introduction */}
            <section className="prose prose-invert max-w-none">
              <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-6 md:p-8">
                <p className="text-white/70 text-lg leading-relaxed m-0">
                  Welcome to {siteName}. By accessing or using our Call for Papers (CFP) management platform, 
                  you agree to be bound by these Terms of Service. Please read them carefully before using our services.
                </p>
              </div>
            </section>

            {/* Acceptance of Terms */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-violet-500/20 border border-violet-500/30">
                  <FileText className="h-5 w-5 text-violet-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">1. Acceptance of Terms</h2>
              </div>
              
              <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6">
                <p className="text-white/70 mb-4">
                  By creating an account or using {siteName}, you acknowledge that you have read, understood, 
                  and agree to be bound by these Terms of Service and our{' '}
                  <Link href="/privacy" className="text-violet-400 hover:text-violet-300 underline underline-offset-2">
                    Privacy Policy
                  </Link>.
                </p>
                <p className="text-white/70">
                  If you do not agree to these terms, you may not access or use our platform.
                </p>
              </div>
            </section>

            {/* Description of Service */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-fuchsia-500/20 border border-fuchsia-500/30">
                  <Users className="h-5 w-5 text-fuchsia-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">2. Description of Service</h2>
              </div>
              
              <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6">
                <p className="text-white/70 mb-4">
                  {siteName} is a Call for Papers management platform that enables:
                </p>
                <ul className="space-y-2 text-white/70">
                  <li className="flex items-start gap-2">
                    <span className="text-fuchsia-400 mt-1">•</span>
                    <span><strong className="text-white/90">Speakers</strong> to submit talk proposals to events</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-fuchsia-400 mt-1">•</span>
                    <span><strong className="text-white/90">Event organizers</strong> to manage events and review submissions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-fuchsia-400 mt-1">•</span>
                    <span><strong className="text-white/90">Reviewers</strong> to evaluate and score talk proposals</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-fuchsia-400 mt-1">•</span>
                    <span><strong className="text-white/90">Communication</strong> between speakers and organizers</span>
                  </li>
                </ul>
              </div>
            </section>

            {/* User Accounts */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-cyan-500/20 border border-cyan-500/30">
                  <Shield className="h-5 w-5 text-cyan-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">3. User Accounts</h2>
              </div>
              
              <div className="space-y-4">
                <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Account Registration</h3>
                  <ul className="space-y-2 text-white/70">
                    <li className="flex items-start gap-2">
                      <span className="text-cyan-400 mt-1">•</span>
                      <span>You must provide accurate and complete information when creating an account</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-cyan-400 mt-1">•</span>
                      <span>You are responsible for maintaining the security of your account credentials</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-cyan-400 mt-1">•</span>
                      <span>You must notify us immediately of any unauthorized access to your account</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-cyan-400 mt-1">•</span>
                      <span>You are responsible for all activities that occur under your account</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Account Termination</h3>
                  <p className="text-white/70">
                    We reserve the right to suspend or terminate your account at our discretion if you violate 
                    these terms or engage in conduct that we determine to be harmful to the platform or other users.
                  </p>
                </div>
              </div>
            </section>

            {/* User Conduct */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-amber-500/20 border border-amber-500/30">
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">4. User Conduct</h2>
              </div>
              
              <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6">
                <p className="text-white/70 mb-4">
                  When using {siteName}, you agree not to:
                </p>
                <ul className="space-y-2 text-white/70">
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 mt-1">✕</span>
                    <span>Submit false, misleading, or fraudulent information</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 mt-1">✕</span>
                    <span>Impersonate any person or entity</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 mt-1">✕</span>
                    <span>Harass, abuse, or harm other users</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 mt-1">✕</span>
                    <span>Upload malicious content, malware, or viruses</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 mt-1">✕</span>
                    <span>Attempt to gain unauthorized access to the platform or other users&apos; accounts</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 mt-1">✕</span>
                    <span>Use automated systems to access the platform without permission</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 mt-1">✕</span>
                    <span>Violate any applicable laws or regulations</span>
                  </li>
                </ul>
              </div>
            </section>

            {/* Content Ownership */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30">
                  <Scale className="h-5 w-5 text-emerald-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">5. Content Ownership</h2>
              </div>
              
              <div className="space-y-4">
                <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Your Content</h3>
                  <p className="text-white/70">
                    You retain ownership of all content you submit to the platform, including talk proposals, 
                    abstracts, slides, and other materials. By submitting content, you grant {siteName} a 
                    non-exclusive license to store, display, and process your content as necessary to provide 
                    our services.
                  </p>
                </div>

                <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Platform Content</h3>
                  <p className="text-white/70">
                    The platform, including its design, code, and features, is protected by intellectual property 
                    laws. You may not copy, modify, distribute, or reverse engineer any part of the platform 
                    without our written permission.
                  </p>
                </div>
              </div>
            </section>

            {/* Disclaimer of Warranties */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-red-500/20 border border-red-500/30">
                  <Ban className="h-5 w-5 text-red-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">6. Disclaimer of Warranties</h2>
              </div>
              
              <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6">
                <p className="text-white/70 mb-4">
                  THE PLATFORM IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, 
                  EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO:
                </p>
                <ul className="space-y-2 text-white/70">
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-1">•</span>
                    <span>Warranties of merchantability or fitness for a particular purpose</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-1">•</span>
                    <span>Warranties that the service will be uninterrupted or error-free</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-1">•</span>
                    <span>Warranties regarding the accuracy or reliability of any content</span>
                  </li>
                </ul>
              </div>
            </section>

            {/* Limitation of Liability */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-orange-500/20 border border-orange-500/30">
                  <Shield className="h-5 w-5 text-orange-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">7. Limitation of Liability</h2>
              </div>
              
              <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6">
                <p className="text-white/70">
                  TO THE MAXIMUM EXTENT PERMITTED BY LAW, {siteName.toUpperCase()} AND ITS OPERATORS SHALL NOT BE 
                  LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING 
                  BUT NOT LIMITED TO LOSS OF PROFITS, DATA, OR GOODWILL, ARISING FROM YOUR USE OF THE PLATFORM.
                </p>
              </div>
            </section>

            {/* Changes to Terms */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-blue-500/20 border border-blue-500/30">
                  <RefreshCw className="h-5 w-5 text-blue-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">8. Changes to Terms</h2>
              </div>
              
              <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6">
                <p className="text-white/70">
                  We reserve the right to modify these Terms of Service at any time. We will notify users of 
                  significant changes by posting a notice on the platform or sending an email. Your continued 
                  use of the platform after changes are posted constitutes your acceptance of the modified terms.
                </p>
              </div>
            </section>

            {/* Governing Law */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-purple-500/20 border border-purple-500/30">
                  <Gavel className="h-5 w-5 text-purple-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">9. Governing Law</h2>
              </div>
              
              <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6">
                <p className="text-white/70">
                  These Terms of Service shall be governed by and construed in accordance with the laws of the 
                  jurisdiction in which the platform operator is located, without regard to conflict of law principles.
                </p>
              </div>
            </section>

            {/* Contact */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-teal-500/20 border border-teal-500/30">
                  <Users className="h-5 w-5 text-teal-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">10. Contact</h2>
              </div>
              
              <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6">
                <p className="text-white/70 mb-4">
                  If you have any questions about these Terms of Service, please contact the platform administrator.
                </p>
                <p className="text-white/70">
                  For general information about our platform, visit{' '}
                  <Link href="/" className="text-violet-400 hover:text-violet-300 underline underline-offset-2">
                    {siteUrl}
                  </Link>
                </p>
              </div>
            </section>

            {/* Footer Note */}
            <div className="border-t border-white/10 pt-8">
              <p className="text-white/50 text-sm text-center">
                These Terms of Service were last updated on {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.
                By using {siteName}, you acknowledge that you have read and agree to these terms.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
