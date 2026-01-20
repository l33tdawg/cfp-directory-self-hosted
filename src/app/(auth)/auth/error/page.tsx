/**
 * Auth Error Page
 * 
 * Displays authentication errors with helpful messages.
 */

import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Authentication Error',
  description: 'An error occurred during authentication',
};

const errorMessages: Record<string, string> = {
  Configuration: 'There is a problem with the server configuration.',
  AccessDenied: 'You do not have permission to sign in.',
  Verification: 'The verification link may have expired or already been used.',
  Default: 'An error occurred during authentication.',
  CredentialsSignin: 'Invalid email or password.',
  SessionRequired: 'You must be signed in to access this page.',
  OAuthSignin: 'Error in constructing an authorization URL.',
  OAuthCallback: 'Error in handling the response from the OAuth provider.',
  OAuthCreateAccount: 'Could not create OAuth provider account.',
  EmailCreateAccount: 'Could not create email provider account.',
  Callback: 'Error in the OAuth callback handler route.',
  OAuthAccountNotLinked: 'This email is already associated with another account. Please sign in using your original method.',
  EmailSignin: 'Error sending the verification email.',
};

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const error = params.error || 'Default';
  const errorMessage = errorMessages[error] || errorMessages.Default;
  
  return (
    <div className="text-center space-y-6">
      <div className="flex justify-center">
        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
        </div>
      </div>
      
      <div>
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">
          Authentication Error
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {errorMessage}
        </p>
      </div>
      
      <div className="space-y-3">
        <Button asChild className="w-full">
          <Link href="/auth/signin">Try again</Link>
        </Button>
        
        <Link
          href="/"
          className="block text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          Go to homepage
        </Link>
      </div>
      
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-6 p-3 rounded-lg bg-slate-100 dark:bg-slate-700 text-left">
          <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
            Error code: {error}
          </p>
        </div>
      )}
    </div>
  );
}
