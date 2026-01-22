/**
 * Verify Request Content Component
 * 
 * Client component with resend functionality.
 */

'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mail, ArrowLeft, Loader2, CheckCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function VerifyRequestContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  // Handle cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleResend = async () => {
    if (!email || cooldown > 0) return;
    
    setIsResending(true);
    setResendError(null);
    setResendSuccess(false);
    
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setResendError(data.error || 'Failed to resend verification email');
      } else {
        setResendSuccess(true);
        setCooldown(60); // 60 second cooldown
      }
    } catch {
      setResendError('An unexpected error occurred');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="text-center space-y-6">
      <div className="flex justify-center">
        <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          <Mail className="h-8 w-8 text-blue-600 dark:text-blue-400" />
        </div>
      </div>
      
      <div>
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">
          Verify your email
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          We&apos;ve sent a verification link to{' '}
          {email ? (
            <span className="font-medium text-slate-900 dark:text-white">{email}</span>
          ) : (
            'your email address'
          )}
        </p>
      </div>
      
      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 text-sm text-slate-600 dark:text-slate-400 text-left space-y-3">
        <p className="font-medium text-slate-900 dark:text-white">Next steps:</p>
        <ol className="list-decimal list-inside space-y-2">
          <li>Check your email inbox (and spam folder)</li>
          <li>Click the verification link in the email</li>
          <li>Sign in to complete your speaker profile</li>
        </ol>
        <p className="text-xs pt-2 border-t border-slate-200 dark:border-slate-700">
          The link will expire in 24 hours.
        </p>
      </div>
      
      {/* Resend Section */}
      {email && (
        <div className="pt-2 space-y-3">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Didn&apos;t receive the email?
          </p>
          
          {resendSuccess && (
            <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">Verification email sent!</span>
            </div>
          )}
          
          {resendError && (
            <p className="text-sm text-red-600 dark:text-red-400">{resendError}</p>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleResend}
            disabled={isResending || cooldown > 0}
          >
            {isResending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : cooldown > 0 ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Resend in {cooldown}s
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Resend verification email
              </>
            )}
          </Button>
        </div>
      )}
      
      <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
        <Link
          href="/auth/signin"
          className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
