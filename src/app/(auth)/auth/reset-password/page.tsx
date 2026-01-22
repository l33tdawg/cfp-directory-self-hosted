/**
 * Reset Password Page
 */

import { Suspense } from 'react';
import { LockKeyhole } from 'lucide-react';
import { ResetPasswordForm } from './reset-password-form';

export const metadata = {
  title: 'Set New Password',
  description: 'Set a new password for your account',
};

export default function ResetPasswordPage() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30">
          <LockKeyhole className="h-5 w-5 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white">
            Set new password
          </h2>
          <p className="text-sm text-white/50">
            Enter your new password below
          </p>
        </div>
      </div>
      <Suspense fallback={
        <div className="h-64 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
        </div>
      }>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
