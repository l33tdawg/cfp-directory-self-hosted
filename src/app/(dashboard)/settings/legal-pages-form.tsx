'use client';

/**
 * Legal Pages Settings Form
 * 
 * Rich text editors for customizing Privacy Policy and Terms of Service content.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { RichTextEditor, RichTextContent } from '@/components/ui/rich-text-editor';
import { useApi } from '@/hooks/use-api';
import { toast } from 'sonner';
import { Loader2, Eye, Edit3, Shield, FileText, ExternalLink } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';

interface LegalPagesFormProps {
  privacyPolicyContent: string | null;
  termsOfServiceContent: string | null;
}

// Default Privacy Policy content (simplified, admin can customize)
const DEFAULT_PRIVACY_POLICY = `<h2>Introduction</h2>
<p>Welcome to our platform. We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Call for Papers (CFP) management platform.</p>

<h2>Information We Collect</h2>
<h3>Account Information</h3>
<ul>
  <li><strong>Email address</strong> — For account identification and communication</li>
  <li><strong>Name</strong> — For display and communication purposes</li>
  <li><strong>Password</strong> — Securely hashed, never stored in plain text</li>
</ul>

<h3>Speaker Profile Information</h3>
<ul>
  <li><strong>Full name and bio</strong> — Displayed to event organizers and reviewers</li>
  <li><strong>Company and position</strong> — Professional context for your submissions</li>
  <li><strong>Location</strong> — For event logistics and regional considerations</li>
  <li><strong>Social links</strong> — LinkedIn, Twitter, GitHub, website (optional)</li>
</ul>

<h3>Submission Content</h3>
<ul>
  <li><strong>Talk titles and abstracts</strong> — The content of your submissions</li>
  <li><strong>Supporting materials</strong> — Slides, documents, and other files you upload</li>
  <li><strong>Messages</strong> — Communications between you and event organizers</li>
</ul>

<h2>How We Use Your Information</h2>
<ul>
  <li><strong>Platform Services:</strong> To provide, operate, and maintain the CFP platform</li>
  <li><strong>Communication:</strong> To send you important updates about your submissions</li>
  <li><strong>Security:</strong> To detect and prevent fraud and security incidents</li>
  <li><strong>Improvement:</strong> To analyze usage patterns and improve our services</li>
</ul>

<h2>Data Protection</h2>
<p>We implement industry-leading security measures to protect your personal information:</p>
<ul>
  <li><strong>Encryption at Rest:</strong> AES-256-GCM encryption for sensitive data</li>
  <li><strong>Encryption in Transit:</strong> TLS 1.3 for all connections</li>
  <li><strong>Secure Authentication:</strong> Passwords hashed with bcrypt</li>
  <li><strong>Access Controls:</strong> Role-based access to your data</li>
</ul>

<h2>Your Rights</h2>
<p>Under applicable data protection laws (including GDPR), you have the following rights:</p>
<ol>
  <li><strong>Right of Access:</strong> Request a copy of your personal data</li>
  <li><strong>Right to Rectification:</strong> Correct inaccurate personal data</li>
  <li><strong>Right to Erasure:</strong> Request deletion of your data</li>
  <li><strong>Right to Data Portability:</strong> Receive your data in a machine-readable format</li>
  <li><strong>Right to Object:</strong> Object to certain processing activities</li>
</ol>

<h2>Contact Us</h2>
<p>If you have questions about this Privacy Policy or wish to exercise your data rights, please contact the platform administrator.</p>`;

// Default Terms of Service content (simplified, admin can customize)
const DEFAULT_TERMS_OF_SERVICE = `<h2>1. Acceptance of Terms</h2>
<p>By creating an account or using this platform, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms, you may not access or use our platform.</p>

<h2>2. Description of Service</h2>
<p>This is a Call for Papers management platform that enables:</p>
<ul>
  <li><strong>Speakers</strong> to submit talk proposals to events</li>
  <li><strong>Event organizers</strong> to manage events and review submissions</li>
  <li><strong>Reviewers</strong> to evaluate and score talk proposals</li>
  <li><strong>Communication</strong> between speakers and organizers</li>
</ul>

<h2>3. User Accounts</h2>
<h3>Account Registration</h3>
<ul>
  <li>You must provide accurate and complete information when creating an account</li>
  <li>You are responsible for maintaining the security of your account credentials</li>
  <li>You must notify us immediately of any unauthorized access to your account</li>
  <li>You are responsible for all activities that occur under your account</li>
</ul>

<h3>Account Termination</h3>
<p>We reserve the right to suspend or terminate your account at our discretion if you violate these terms or engage in conduct that we determine to be harmful to the platform or other users.</p>

<h2>4. User Conduct</h2>
<p>When using this platform, you agree not to:</p>
<ul>
  <li>Submit false, misleading, or fraudulent information</li>
  <li>Impersonate any person or entity</li>
  <li>Harass, abuse, or harm other users</li>
  <li>Upload malicious content, malware, or viruses</li>
  <li>Attempt to gain unauthorized access to the platform or other users' accounts</li>
  <li>Use automated systems to access the platform without permission</li>
  <li>Violate any applicable laws or regulations</li>
</ul>

<h2>5. Content Ownership</h2>
<h3>Your Content</h3>
<p>You retain ownership of all content you submit to the platform, including talk proposals, abstracts, slides, and other materials. By submitting content, you grant us a non-exclusive license to store, display, and process your content as necessary to provide our services.</p>

<h3>Platform Content</h3>
<p>The platform, including its design, code, and features, is protected by intellectual property laws. You may not copy, modify, distribute, or reverse engineer any part of the platform without our written permission.</p>

<h2>6. Disclaimer of Warranties</h2>
<p>THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY OR FITNESS FOR A PARTICULAR PURPOSE.</p>

<h2>7. Limitation of Liability</h2>
<p>TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE PLATFORM.</p>

<h2>8. Changes to Terms</h2>
<p>We reserve the right to modify these Terms of Service at any time. We will notify users of significant changes by posting a notice on the platform or sending an email. Your continued use of the platform after changes are posted constitutes your acceptance of the modified terms.</p>

<h2>9. Contact</h2>
<p>If you have any questions about these Terms of Service, please contact the platform administrator.</p>`;

export function LegalPagesForm({ privacyPolicyContent, termsOfServiceContent }: LegalPagesFormProps) {
  const router = useRouter();
  const api = useApi();
  const [privacyPolicy, setPrivacyPolicy] = useState(privacyPolicyContent || '');
  const [termsOfService, setTermsOfService] = useState(termsOfServiceContent || '');
  const [activeTab, setActiveTab] = useState<'privacy' | 'terms' | 'preview'>('privacy');
  const [previewType, setPreviewType] = useState<'privacy' | 'terms'>('privacy');

  const handleSubmit = async () => {
    const { error } = await api.patch('/api/settings', {
      privacyPolicyContent: privacyPolicy,
      termsOfServiceContent: termsOfService,
    });

    if (error) {
      return;
    }

    toast.success('Legal pages saved successfully');
    router.refresh();
  };

  const handleResetPrivacy = () => {
    if (confirm('Reset Privacy Policy to default content? This will replace your current content.')) {
      setPrivacyPolicy(DEFAULT_PRIVACY_POLICY);
    }
  };

  const handleResetTerms = () => {
    if (confirm('Reset Terms of Service to default content? This will replace your current content.')) {
      setTermsOfService(DEFAULT_TERMS_OF_SERVICE);
    }
  };

  const handleClearPrivacy = () => {
    if (confirm('Clear Privacy Policy content? The page will show the built-in default content when empty.')) {
      setPrivacyPolicy('');
    }
  };

  const handleClearTerms = () => {
    if (confirm('Clear Terms of Service content? The page will show the built-in default content when empty.')) {
      setTermsOfService('');
    }
  };

  return (
    <div className="space-y-6">
      <Alert>
        <AlertDescription>
          Customize your Privacy Policy and Terms of Service pages. When left empty, the platform will display 
          default content. Your custom content will be displayed on the public pages accessible from the site footer.
        </AlertDescription>
      </Alert>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'privacy' | 'terms' | 'preview')}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="privacy" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Privacy Policy
          </TabsTrigger>
          <TabsTrigger value="terms" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Terms of Service
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Preview
          </TabsTrigger>
        </TabsList>

        {/* Privacy Policy Tab */}
        <TabsContent value="privacy" className="mt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-slate-900 dark:text-white">Privacy Policy Content</h3>
                <p className="text-sm text-slate-500">
                  Custom content for your Privacy Policy page.{' '}
                  <Link href="/privacy" target="_blank" className="text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1">
                    View live page <ExternalLink className="h-3 w-3" />
                  </Link>
                </p>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={handleClearPrivacy}>
                  Clear
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={handleResetPrivacy}>
                  Load Default
                </Button>
              </div>
            </div>
            
            <RichTextEditor
              content={privacyPolicy}
              onChange={setPrivacyPolicy}
              placeholder="Enter your Privacy Policy content... Leave empty to use the built-in default."
              className="min-h-[400px]"
            />

            {!privacyPolicy && (
              <p className="text-sm text-slate-500 italic">
                No custom content set. The page will display the built-in default Privacy Policy.
              </p>
            )}
          </div>
        </TabsContent>

        {/* Terms of Service Tab */}
        <TabsContent value="terms" className="mt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-slate-900 dark:text-white">Terms of Service Content</h3>
                <p className="text-sm text-slate-500">
                  Custom content for your Terms of Service page.{' '}
                  <Link href="/terms" target="_blank" className="text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1">
                    View live page <ExternalLink className="h-3 w-3" />
                  </Link>
                </p>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={handleClearTerms}>
                  Clear
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={handleResetTerms}>
                  Load Default
                </Button>
              </div>
            </div>
            
            <RichTextEditor
              content={termsOfService}
              onChange={setTermsOfService}
              placeholder="Enter your Terms of Service content... Leave empty to use the built-in default."
              className="min-h-[400px]"
            />

            {!termsOfService && (
              <p className="text-sm text-slate-500 italic">
                No custom content set. The page will display the built-in default Terms of Service.
              </p>
            )}
          </div>
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="mt-6">
          <div className="space-y-4">
            {/* Preview type selector */}
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Preview:</span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={previewType === 'privacy' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPreviewType('privacy')}
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Privacy Policy
                </Button>
                <Button
                  type="button"
                  variant={previewType === 'terms' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPreviewType('terms')}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Terms of Service
                </Button>
              </div>
            </div>

            <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-800">
              <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                <span className="text-xs text-slate-500 uppercase tracking-wider">Preview</span>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-1">
                  {previewType === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}
                </h3>
                <p className="text-sm text-slate-500">
                  {previewType === 'privacy' 
                    ? (privacyPolicy ? 'Showing custom content' : 'Showing built-in default (no custom content set)')
                    : (termsOfService ? 'Showing custom content' : 'Showing built-in default (no custom content set)')
                  }
                </p>
              </div>
              
              <div className="p-6 max-h-[500px] overflow-y-auto bg-white dark:bg-slate-900">
                <div className="prose prose-slate dark:prose-invert max-w-none">
                  {previewType === 'privacy' ? (
                    privacyPolicy ? (
                      <RichTextContent content={privacyPolicy} />
                    ) : (
                      <RichTextContent content={DEFAULT_PRIVACY_POLICY} />
                    )
                  ) : (
                    termsOfService ? (
                      <RichTextContent content={termsOfService} />
                    ) : (
                      <RichTextContent content={DEFAULT_TERMS_OF_SERVICE} />
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Separator />

      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">
          Changes will be visible on the public pages immediately after saving.
        </p>
        <Button onClick={handleSubmit} disabled={api.isLoading}>
          {api.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Legal Pages
        </Button>
      </div>
    </div>
  );
}
