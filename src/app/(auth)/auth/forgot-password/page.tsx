/**
 * Forgot Password Page
 */

import { KeyRound } from 'lucide-react';
import { ForgotPasswordForm } from './forgot-password-form';

export const metadata = {
  title: 'Reset Password',
  description: 'Reset your password',
};

export default function ForgotPasswordPage() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-amber-500/20 border border-amber-500/30">
          <KeyRound className="h-5 w-5 text-amber-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white">
            Reset your password
          </h2>
          <p className="text-sm text-white/50">
            We&apos;ll send you a reset link
          </p>
        </div>
      </div>
      <ForgotPasswordForm />
    </div>
  );
}
