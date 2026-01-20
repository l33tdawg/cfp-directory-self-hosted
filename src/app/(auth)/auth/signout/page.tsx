/**
 * Sign Out Page
 */

import { SignOutForm } from './signout-form';

export const metadata = {
  title: 'Sign Out',
  description: 'Sign out of your account',
};

export default function SignOutPage() {
  return (
    <div className="text-center space-y-6">
      <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
        Sign out
      </h2>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Are you sure you want to sign out?
      </p>
      <SignOutForm />
    </div>
  );
}
