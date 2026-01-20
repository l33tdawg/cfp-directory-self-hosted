/**
 * Sign Up Page
 */

import { SignUpForm } from './signup-form';

export const metadata = {
  title: 'Create Account',
  description: 'Create a new account',
};

export default function SignUpPage() {
  return (
    <div>
      <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-6 text-center">
        Create your account
      </h2>
      <SignUpForm />
    </div>
  );
}
