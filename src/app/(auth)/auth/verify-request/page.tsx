/**
 * Email Verification Request Page
 * 
 * Displayed after speaker registration to prompt email verification.
 * Wrapped in Suspense to support useSearchParams in the client component.
 */

import { Suspense } from 'react';
import { VerifyRequestContent } from './verify-request-content';

export const metadata = {
  title: 'Verify Your Email',
  description: 'Please check your email to verify your account',
};

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-6 h-6 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
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
