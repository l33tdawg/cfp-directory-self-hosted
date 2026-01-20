/**
 * Forgot Password Page
 */

import { ForgotPasswordForm } from './forgot-password-form';

export const metadata = {
  title: 'Reset Password',
  description: 'Reset your password',
};

export default function ForgotPasswordPage() {
  return (
    <div>
      <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-2 text-center">
        Reset your password
      </h2>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 text-center">
        Enter your email address and we&apos;ll send you a link to reset your password.
      </p>
      <ForgotPasswordForm />
    </div>
  );
}
