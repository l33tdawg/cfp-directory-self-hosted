/**
 * Auth Error Page
 * 
 * Displays authentication errors with helpful messages.
 */

import Link from 'next/link';
import { AlertCircle, Home } from 'lucide-react';
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
  // Email verification errors
  MissingToken: 'The verification link is invalid. Please request a new one.',
  InvalidToken: 'This verification link is invalid or has already been used.',
  TokenExpired: 'This verification link has expired. Please request a new one.',
  UserNotFound: 'The user associated with this verification link was not found.',
  VerificationFailed: 'An error occurred while verifying your email. Please try again.',
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
        <div className="w-16 h-16 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center">
          <AlertCircle className="h-8 w-8 text-red-400" />
        </div>
      </div>
      
      <div>
        <h2 className="text-xl font-semibold text-white mb-2">
          Authentication Error
        </h2>
        <p className="text-sm text-white/60">
          {errorMessage}
        </p>
      </div>
      
      <div className="space-y-3 pt-2">
        <Button 
          asChild 
          className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white border-0"
        >
          <Link href="/auth/signin">Try again</Link>
        </Button>
        
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 text-sm text-white/50 hover:text-white/70 transition-colors"
        >
          <Home className="h-4 w-4" />
          Go to homepage
        </Link>
      </div>
      
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-6 p-3 rounded-lg bg-slate-800/50 border border-white/5 text-left">
          <p className="text-xs font-mono text-white/40">
            Error code: {error}
          </p>
        </div>
      )}
    </div>
  );
}
