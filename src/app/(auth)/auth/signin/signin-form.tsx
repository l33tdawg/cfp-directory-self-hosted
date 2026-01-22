'use client';

/**
 * Sign In Form Component
 * 
 * Handles email verification messages and redirects speakers
 * to onboarding if they haven't completed it.
 */

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signIn } from 'next-auth/react';
import { Loader2, Eye, EyeOff, CheckCircle, AlertCircle, Mail } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signInSchema, type SignInInput } from '@/lib/auth/validation';

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  const error = searchParams.get('error');
  const verified = searchParams.get('verified');
  
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(
    error === 'CredentialsSignin' ? 'Invalid email or password' : null
  );
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
  });
  
  const onSubmit = async (data: SignInInput) => {
    setIsLoading(true);
    setAuthError(null);
    setUnverifiedEmail(null);
    
    try {
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      });
      
      if (result?.error) {
        // Handle specific error for unverified email
        if (result.error === 'EMAIL_NOT_VERIFIED') {
          setUnverifiedEmail(data.email);
          setAuthError('Please verify your email before signing in.');
        } else {
          setAuthError(result.error === 'CredentialsSignin' ? 'Invalid email or password' : result.error);
        }
      } else {
        // Check if speaker needs onboarding
        const response = await fetch('/api/speaker-profile/onboarding-status');
        if (response.ok) {
          const { needsOnboarding, role } = await response.json();
          if (role === 'SPEAKER' && needsOnboarding) {
            router.push('/onboarding/speaker');
            router.refresh();
            return;
          }
        }
        
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setAuthError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Success message for verified email */}
      {verified === 'true' && (
        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <p className="text-sm text-green-600 dark:text-green-400">
              Email verified successfully! You can now sign in.
            </p>
          </div>
        </div>
      )}
      
      {/* Already verified message */}
      {verified === 'already' && (
        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <p className="text-sm text-blue-600 dark:text-blue-400">
              Your email is already verified. Please sign in.
            </p>
          </div>
        </div>
      )}
      
      {/* Unverified email error with resend link */}
      {unverifiedEmail && (
        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 space-y-2">
          <div className="flex items-start gap-2">
            <Mail className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Please verify your email before signing in.
              </p>
              <Link
                href={`/auth/verify-request?email=${encodeURIComponent(unverifiedEmail)}`}
                className="text-sm text-amber-800 dark:text-amber-200 underline hover:no-underline"
              >
                Resend verification email
              </Link>
            </div>
          </div>
        </div>
      )}
      
      {/* General auth error (not unverified email) */}
      {authError && !unverifiedEmail && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <p className="text-sm text-red-600 dark:text-red-400">{authError}</p>
          </div>
        </div>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          disabled={isLoading}
          {...register('email')}
        />
        {errors.email && (
          <p className="text-sm text-red-500">{errors.email.message}</p>
        )}
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link
            href="/auth/forgot-password"
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            autoComplete="current-password"
            disabled={isLoading}
            {...register('password')}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password && (
          <p className="text-sm text-red-500">{errors.password.message}</p>
        )}
      </div>
      
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Sign in
      </Button>
      
      <div className="text-center text-sm text-slate-600 dark:text-slate-400">
        Don&apos;t have an account?{' '}
        <Link
          href="/auth/signup"
          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
        >
          Sign up
        </Link>
      </div>
    </form>
  );
}
