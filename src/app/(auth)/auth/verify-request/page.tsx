/**
 * Email Verification Request Page
 * 
 * Displayed after a magic link email is sent.
 */

import Link from 'next/link';
import { Mail, ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Check Your Email',
  description: 'A verification link has been sent to your email',
};

export default function VerifyRequestPage() {
  return (
    <div className="text-center space-y-6">
      <div className="flex justify-center">
        <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          <Mail className="h-8 w-8 text-blue-600 dark:text-blue-400" />
        </div>
      </div>
      
      <div>
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">
          Check your email
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          A sign-in link has been sent to your email address. Click the link to complete your sign in.
        </p>
      </div>
      
      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 text-sm text-slate-600 dark:text-slate-400">
        <p>
          <strong>Note:</strong> The link will expire in 24 hours. If you don&apos;t see the email, check your spam folder.
        </p>
      </div>
      
      <div className="pt-2">
        <Link
          href="/auth/signin"
          className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
