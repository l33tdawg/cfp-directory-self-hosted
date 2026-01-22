/**
 * Email Verification Request Page
 * 
 * Displayed after speaker registration to prompt email verification.
 * Wrapped in Suspense to support useSearchParams in the client component.
 */

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { VerifyRequestContent } from './verify-request-content';

export const metadata = {
  title: 'Verify Your Email',
  description: 'Please check your email to verify your account',
};

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
    </div>
  );
}

export default function VerifyRequestPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <VerifyRequestContent />
    </Suspense>
  );
}
