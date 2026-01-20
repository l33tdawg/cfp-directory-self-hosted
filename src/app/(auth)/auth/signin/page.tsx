/**
 * Sign In Page
 */

import { Suspense } from 'react';
import { SignInForm } from './signin-form';

export const metadata = {
  title: 'Sign In',
  description: 'Sign in to your account',
};

export default function SignInPage() {
  return (
    <div>
      <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-6 text-center">
        Welcome back
      </h2>
      <Suspense fallback={<div className="h-64 flex items-center justify-center">Loading...</div>}>
        <SignInForm />
      </Suspense>
    </div>
  );
}
