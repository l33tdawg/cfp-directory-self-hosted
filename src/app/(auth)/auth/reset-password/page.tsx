/**
 * Reset Password Page
 */

import { Suspense } from 'react';
import { ResetPasswordForm } from './reset-password-form';

export const metadata = {
  title: 'Set New Password',
  description: 'Set a new password for your account',
};

export default function ResetPasswordPage() {
  return (
    <div>
      <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-2 text-center">
        Set new password
      </h2>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 text-center">
        Enter your new password below.
      </p>
      <Suspense fallback={<div className="h-64 flex items-center justify-center">Loading...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
