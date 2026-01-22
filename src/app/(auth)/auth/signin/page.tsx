/**
 * Sign In Page
 */

import { Suspense } from 'react';
import { SignInForm } from './signin-form';
import { LogIn } from 'lucide-react';

export const metadata = {
  title: 'Sign In',
  description: 'Sign in to your account',
};

export default function SignInPage() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-violet-500/20 border border-violet-500/30">
          <LogIn className="h-5 w-5 text-violet-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white">
            Welcome back
          </h2>
          <p className="text-sm text-white/50">
            Sign in to continue to your account
          </p>
        </div>
      </div>
      <Suspense fallback={
        <div className="h-64 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
        </div>
      }>
        <SignInForm />
      </Suspense>
    </div>
  );
}
