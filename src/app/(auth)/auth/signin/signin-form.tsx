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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Success message for verified email */}
      {verified === 'true' && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
            <p className="text-sm text-emerald-600 dark:text-emerald-300">
              Email verified successfully! You can now sign in.
            </p>
          </div>
        </div>
      )}
      
      {/* Already verified message */}
      {verified === 'already' && (
        <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-blue-500 dark:text-blue-400" />
            <p className="text-sm text-blue-600 dark:text-blue-300">
              Your email is already verified. Please sign in.
            </p>
          </div>
        </div>
      )}
      
      {/* Unverified email error with resend link */}
      {unverifiedEmail && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2">
          <div className="flex items-start gap-2">
            <Mail className="h-4 w-4 text-amber-500 dark:text-amber-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-amber-600 dark:text-amber-300">
                Please verify your email before signing in.
              </p>
              <Link
                href={`/auth/verify-request?email=${encodeURIComponent(unverifiedEmail)}`}
                className="text-sm text-amber-700 dark:text-amber-200 underline hover:no-underline"
              >
                Resend verification email
              </Link>
            </div>
          </div>
        </div>
      )}
      
      {/* General auth error (not unverified email) */}
      {authError && !unverifiedEmail && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-500 dark:text-red-400" />
            <p className="text-sm text-red-600 dark:text-red-300">{authError}</p>
          </div>
        </div>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="email" className="text-slate-700 dark:text-white/70">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          disabled={isLoading}
          className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:border-violet-500/50 focus:ring-violet-500/20"
          {...register('email')}
        />
        {errors.email && (
          <p className="text-sm text-red-500 dark:text-red-400">{errors.email.message}</p>
        )}
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password" className="text-slate-700 dark:text-white/70">Password</Label>
          <Link
            href="/auth/forgot-password"
            className="text-sm text-violet-600 dark:text-violet-400 hover:text-violet-500 dark:hover:text-violet-300 transition-colors"
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
            className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:border-violet-500/50 focus:ring-violet-500/20 pr-10"
            {...register('password')}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/40 hover:text-slate-600 dark:hover:text-white/60 transition-colors"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password && (
          <p className="text-sm text-red-500 dark:text-red-400">{errors.password.message}</p>
        )}
      </div>
      
      <Button 
        type="submit" 
        className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white border-0 shadow-lg shadow-violet-500/25" 
        disabled={isLoading}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Sign in
      </Button>
      
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200 dark:border-white/10" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-white dark:bg-slate-900/50 px-2 text-slate-400 dark:text-white/40">or</span>
        </div>
      </div>
      
      <p className="text-center text-sm text-slate-500 dark:text-white/50">
        Don&apos;t have an account?{' '}
        <Link
          href="/auth/signup"
          className="text-violet-600 dark:text-violet-400 hover:text-violet-500 dark:hover:text-violet-300 font-medium transition-colors"
        >
          Sign up
        </Link>
      </p>
    </form>
  );
}
