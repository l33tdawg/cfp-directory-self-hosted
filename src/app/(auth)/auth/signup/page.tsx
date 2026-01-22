/**
 * Sign Up Page
 * 
 * Speaker self-registration page. Only available when public signup is enabled.
 * Other roles (Reviewer, Organizer, Admin) must be invited.
 */

import { Suspense } from 'react';
import { SignUpForm } from './signup-form';
import { Loader2, Mic2 } from 'lucide-react';

export const metadata = {
  title: 'Speaker Registration',
  description: 'Create a speaker account to submit talks to events',
};

function SignUpFormFallback() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
    </div>
  );
}

export default function SignUpPage() {
  return (
    <div>
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Mic2 className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
            Speaker Registration
          </h2>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Create an account to submit talks to our events
        </p>
      </div>
      <Suspense fallback={<SignUpFormFallback />}>
        <SignUpForm />
      </Suspense>
    </div>
  );
}
