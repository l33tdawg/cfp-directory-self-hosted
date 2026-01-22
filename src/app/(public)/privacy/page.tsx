/**
 * Privacy Policy Page
 * 
 * Public page displaying the platform's privacy policy.
 * Content is tailored for a CFP (Call for Papers) management platform.
 */

import Link from 'next/link';
import { prisma } from '@/lib/db/prisma';
import { config } from '@/lib/env';
import { ArrowLeft, Shield, Lock, Eye, Database, Globe, Mail, Clock, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Privacy Policy',
  description: 'Learn how we collect, use, and protect your personal information.',
};

// Force dynamic rendering to avoid build-time database access
export const dynamic = 'force-dynamic';

export default async function PrivacyPage() {
  // Get site settings for branding
  const siteSettings = await prisma.siteSettings.findUnique({
    where: { id: 'default' },
    select: {
      name: true,
      websiteUrl: true,
    },
  });

  const siteName = siteSettings?.name || config.app.name;
  const siteUrl = siteSettings?.websiteUrl || config.app.url;

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
              <Shield className="h-8 w-8 text-violet-400" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Privacy Policy</h1>
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
                  Welcome to {siteName}. We are committed to protecting your personal information and your right to privacy. 
                  This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our 
                  Call for Papers (CFP) management platform.
                </p>
              </div>
            </section>

            {/* Information We Collect */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-violet-500/20 border border-violet-500/30">
                  <Database className="h-5 w-5 text-violet-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">Information We Collect</h2>
              </div>
              
              <div className="space-y-6">
                <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Account Information</h3>
                  <ul className="space-y-2 text-white/70">
                    <li className="flex items-start gap-2">
                      <span className="text-violet-400 mt-1">•</span>
                      <span><strong className="text-white/90">Email address</strong> — For account identification and communication</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-violet-400 mt-1">•</span>
                      <span><strong className="text-white/90">Name</strong> — For display and communication purposes</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-violet-400 mt-1">•</span>
                      <span><strong className="text-white/90">Password</strong> — Securely hashed, never stored in plain text</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-violet-400 mt-1">•</span>
                      <span><strong className="text-white/90">Profile image</strong> — Optional, for user identification</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Speaker Profile Information</h3>
                  <ul className="space-y-2 text-white/70">
                    <li className="flex items-start gap-2">
                      <span className="text-violet-400 mt-1">•</span>
                      <span><strong className="text-white/90">Full name and bio</strong> — Displayed to event organizers and reviewers</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-violet-400 mt-1">•</span>
                      <span><strong className="text-white/90">Company and position</strong> — Professional context for your submissions</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-violet-400 mt-1">•</span>
                      <span><strong className="text-white/90">Location</strong> — For event logistics and regional considerations</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-violet-400 mt-1">•</span>
                      <span><strong className="text-white/90">Social links</strong> — LinkedIn, Twitter, GitHub, website (optional)</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Submission Content</h3>
                  <ul className="space-y-2 text-white/70">
                    <li className="flex items-start gap-2">
                      <span className="text-violet-400 mt-1">•</span>
                      <span><strong className="text-white/90">Talk titles and abstracts</strong> — The content of your submissions</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-violet-400 mt-1">•</span>
                      <span><strong className="text-white/90">Supporting materials</strong> — Slides, documents, and other files you upload</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-violet-400 mt-1">•</span>
                      <span><strong className="text-white/90">Messages</strong> — Communications between you and event organizers</span>
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            {/* How We Use Your Information */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-fuchsia-500/20 border border-fuchsia-500/30">
                  <Eye className="h-5 w-5 text-fuchsia-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">How We Use Your Information</h2>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-2">Platform Services</h3>
                  <p className="text-white/70 text-sm">
                    To provide, operate, and maintain the CFP platform, process your submissions, 
                    and facilitate communication with event organizers.
                  </p>
                </div>
                <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-2">Communication</h3>
                  <p className="text-white/70 text-sm">
                    To send you important updates about your submissions, account notifications, 
                    and event-related communications.
                  </p>
                </div>
                <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-2">Security</h3>
                  <p className="text-white/70 text-sm">
                    To detect and prevent fraud, abuse, and security incidents, and to protect 
                    the integrity of our platform.
                  </p>
                </div>
                <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-2">Improvement</h3>
                  <p className="text-white/70 text-sm">
                    To analyze usage patterns and improve our services, features, and user experience.
                  </p>
                </div>
              </div>
            </section>

            {/* Data Protection */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30">
                  <Lock className="h-5 w-5 text-emerald-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">Data Protection</h2>
              </div>
              
              <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-6 md:p-8">
                <p className="text-white/70 mb-6">
                  We implement industry-leading security measures to protect your personal information:
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded-lg bg-emerald-500/20 mt-0.5">
                      <Lock className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Encryption at Rest</p>
                      <p className="text-white/60 text-sm">AES-256-GCM encryption for sensitive data</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded-lg bg-emerald-500/20 mt-0.5">
                      <Globe className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Encryption in Transit</p>
                      <p className="text-white/60 text-sm">TLS 1.3 for all connections</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded-lg bg-emerald-500/20 mt-0.5">
                      <Shield className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Secure Authentication</p>
                      <p className="text-white/60 text-sm">Passwords hashed with bcrypt</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded-lg bg-emerald-500/20 mt-0.5">
                      <Database className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Access Controls</p>
                      <p className="text-white/60 text-sm">Role-based access to your data</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Your Rights */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-cyan-500/20 border border-cyan-500/30">
                  <UserCheck className="h-5 w-5 text-cyan-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">Your Rights</h2>
              </div>
              
              <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-6 md:p-8">
                <p className="text-white/70 mb-6">
                  Under applicable data protection laws (including GDPR), you have the following rights:
                </p>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 pb-4 border-b border-white/10">
                    <span className="text-cyan-400 font-bold">1.</span>
                    <div>
                      <p className="text-white font-medium">Right of Access</p>
                      <p className="text-white/60 text-sm">Request a copy of your personal data</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 pb-4 border-b border-white/10">
                    <span className="text-cyan-400 font-bold">2.</span>
                    <div>
                      <p className="text-white font-medium">Right to Rectification</p>
                      <p className="text-white/60 text-sm">Correct inaccurate personal data via your profile settings</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 pb-4 border-b border-white/10">
                    <span className="text-cyan-400 font-bold">3.</span>
                    <div>
                      <p className="text-white font-medium">Right to Erasure</p>
                      <p className="text-white/60 text-sm">Request deletion of your data (subject to legal obligations)</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 pb-4 border-b border-white/10">
                    <span className="text-cyan-400 font-bold">4.</span>
                    <div>
                      <p className="text-white font-medium">Right to Data Portability</p>
                      <p className="text-white/60 text-sm">Receive your data in a machine-readable format</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-cyan-400 font-bold">5.</span>
                    <div>
                      <p className="text-white font-medium">Right to Object</p>
                      <p className="text-white/60 text-sm">Object to certain processing activities</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Data Retention */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-amber-500/20 border border-amber-500/30">
                  <Clock className="h-5 w-5 text-amber-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">Data Retention</h2>
              </div>
              
              <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6">
                <p className="text-white/70 mb-4">
                  We retain your personal data for as long as necessary to provide our services and fulfill 
                  the purposes outlined in this policy. Specific retention periods:
                </p>
                <ul className="space-y-2 text-white/70">
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 mt-1">•</span>
                    <span><strong className="text-white/90">Account data:</strong> Until you request deletion</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 mt-1">•</span>
                    <span><strong className="text-white/90">Submissions:</strong> For the event lifetime plus one year for historical records</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 mt-1">•</span>
                    <span><strong className="text-white/90">Messages:</strong> Two years from creation</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 mt-1">•</span>
                    <span><strong className="text-white/90">Security logs:</strong> 90 days</span>
                  </li>
                </ul>
              </div>
            </section>

            {/* Cookies */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-orange-500/20 border border-orange-500/30">
                  <Globe className="h-5 w-5 text-orange-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">Cookies</h2>
              </div>
              
              <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6">
                <p className="text-white/70 mb-4">
                  We use only essential cookies required for the platform to function:
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-2 text-white/90 font-medium">Cookie</th>
                        <th className="text-left py-2 text-white/90 font-medium">Purpose</th>
                        <th className="text-left py-2 text-white/90 font-medium">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="text-white/70">
                      <tr className="border-b border-white/5">
                        <td className="py-2 font-mono text-xs">authjs.session-token</td>
                        <td className="py-2">Authentication</td>
                        <td className="py-2">Session</td>
                      </tr>
                      <tr className="border-b border-white/5">
                        <td className="py-2 font-mono text-xs">authjs.csrf-token</td>
                        <td className="py-2">CSRF protection</td>
                        <td className="py-2">Session</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-mono text-xs">authjs.callback-url</td>
                        <td className="py-2">Redirect after login</td>
                        <td className="py-2">Session</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* Contact */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-blue-500/20 border border-blue-500/30">
                  <Mail className="h-5 w-5 text-blue-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">Contact Us</h2>
              </div>
              
              <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6">
                <p className="text-white/70 mb-4">
                  If you have questions about this Privacy Policy or wish to exercise your data rights, 
                  please contact the platform administrator.
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
                This privacy policy was last updated on {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.
                We may update this policy from time to time. Changes will be posted on this page.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
