/**
 * Invitation Acceptance Page
 * 
 * Allows invited users to create their account.
 */

import { Suspense } from 'react';
import { InviteForm } from './invite-form';
import { Loader2 } from 'lucide-react';

export const metadata = {
  title: 'Accept Invitation',
  description: 'Create your account from an invitation',
};

function InviteFormFallback() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
    </div>
  );
}

export default function InvitePage() {
  return (
    <div>
      <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-6 text-center">
        Accept Invitation
      </h2>
      <Suspense fallback={<InviteFormFallback />}>
        <InviteForm />
      </Suspense>
    </div>
  );
}
