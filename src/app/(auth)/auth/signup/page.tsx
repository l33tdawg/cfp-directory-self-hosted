/**
 * Sign Up Page
 * 
 * Speaker self-registration page. Only available when public signup is enabled.
 * Other roles (Reviewer, Organizer, Admin) must be invited.
 */

import { Suspense } from 'react';
import { SignUpForm } from './signup-form';
import { Mic2 } from 'lucide-react';

export const metadata = {
  title: 'Speaker Registration',
  description: 'Create a speaker account to submit talks to events',
};

function SignUpFormFallback() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-6 h-6 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
    </div>
  );
}

export default function SignUpPage() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-fuchsia-500/20 border border-fuchsia-500/30">
          <Mic2 className="h-5 w-5 text-fuchsia-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white">
            Speaker Registration
          </h2>
          <p className="text-sm text-white/50">
            Create an account to submit talks to events
          </p>
        </div>
      </div>
      <Suspense fallback={<SignUpFormFallback />}>
        <SignUpForm />
      </Suspense>
    </div>
  );
}
