'use client';

/**
 * Sign Up Form Component
 * 
 * Speaker self-registration form. Checks if public signup is enabled
 * and shows appropriate messaging when disabled.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signIn } from 'next-auth/react';
import { Loader2, Eye, EyeOff, Check, X, ShieldCheck, UserX, Info } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { signUpSchema, type SignUpInput } from '@/lib/auth/validation';

interface SignupStatus {
  allowPublicSignup: boolean;
  siteName: string;
  contactEmail?: string;
}

export function SignUpForm() {
  const router = useRouter();
  
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [signupStatus, setSignupStatus] = useState<SignupStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFirstUser, setIsFirstUser] = useState(false);
  
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
  });
  
  const password = watch('password', '');
  
  // Check if signup is enabled on mount
  useEffect(() => {
    async function checkSignupStatus() {
      try {
        const response = await fetch('/api/auth/signup-status');
        const data = await response.json();
        setSignupStatus(data);
      } catch {
        setSignupStatus({ allowPublicSignup: false, siteName: 'CFP System' });
      } finally {
        setIsCheckingStatus(false);
      }
    }
    checkSignupStatus();
  }, []);
  
  // Password strength indicators
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  
  const onSubmit = async (data: SignUpInput) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Register the user
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          name: data.name,
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        setError(result.error || 'Registration failed');
        return;
      }
      
      // Track if this was the first user (admin)
      setIsFirstUser(result.isFirstUser);
      
      // Automatically sign in after registration
      const signInResult = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      });
      
      if (signInResult?.error) {
        // Registration succeeded but sign-in failed
        router.push('/auth/signin?registered=true');
      } else {
        // Redirect to welcome page or dashboard
        router.push(result.isFirstUser ? '/auth/welcome?admin=true' : '/dashboard');
        router.refresh();
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };
  
  const PasswordRequirement = ({ met, text }: { met: boolean; text: string }) => (
    <div className="flex items-center gap-2 text-sm">
      {met ? (
        <Check className="h-4 w-4 text-green-500" />
      ) : (
        <X className="h-4 w-4 text-slate-300" />
      )}
      <span className={met ? 'text-green-600 dark:text-green-400' : 'text-slate-500'}>
        {text}
      </span>
    </div>
  );
  
  // Loading state while checking signup status
  if (isCheckingStatus) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }
  
  // Signup disabled state
  if (!signupStatus?.allowPublicSignup) {
    return (
      <div className="space-y-6">
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <UserX className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <h3 className="font-medium text-amber-900 dark:text-amber-100">
                  Registration is Invite-Only
                </h3>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  Speaker registration is currently disabled. You&apos;ll need an invitation from an organizer to create an account.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="space-y-2">
                <h3 className="font-medium text-blue-900 dark:text-blue-100">
                  How to Get Access
                </h3>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
                  <li>Contact an event organizer to request an invitation</li>
                  <li>Check your email for an existing invitation link</li>
                  {signupStatus?.contactEmail && (
                    <li>
                      Email us at{' '}
                      <a 
                        href={`mailto:${signupStatus.contactEmail}`}
                        className="underline hover:no-underline"
                      >
                        {signupStatus.contactEmail}
                      </a>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center space-y-4">
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            Already have an account or invitation?
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild variant="default">
              <Link href="/auth/signin">Sign In</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}
      
      {isFirstUser && (
        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
              You&apos;ll be the administrator!
            </p>
          </div>
        </div>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="name">Name (optional)</Label>
        <Input
          id="name"
          type="text"
          placeholder="Your name"
          autoComplete="name"
          disabled={isLoading}
          {...register('name')}
        />
        {errors.name && (
          <p className="text-sm text-red-500">{errors.name.message}</p>
        )}
      </div>
      
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
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            autoComplete="new-password"
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
        
        {/* Password requirements */}
        {password && (
          <div className="mt-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800 space-y-1">
            <PasswordRequirement met={hasMinLength} text="At least 8 characters" />
            <PasswordRequirement met={hasUppercase} text="One uppercase letter" />
            <PasswordRequirement met={hasLowercase} text="One lowercase letter" />
            <PasswordRequirement met={hasNumber} text="One number" />
          </div>
        )}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder="••••••••"
            autoComplete="new-password"
            disabled={isLoading}
            {...register('confirmPassword')}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.confirmPassword && (
          <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
        )}
      </div>
      
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Create Speaker Account
      </Button>
      
      <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 text-center">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          <Info className="h-3 w-3 inline mr-1" />
          You&apos;ll be registered as a <strong>Speaker</strong> and can submit talks to events.
          Organizers, reviewers, and admins must be invited.
        </p>
      </div>
      
      <p className="text-center text-xs text-slate-500 dark:text-slate-400">
        By creating an account, you agree to our{' '}
        <Link href="/terms" className="text-blue-600 hover:underline">
          Terms of Service
        </Link>{' '}
        and{' '}
        <Link href="/privacy" className="text-blue-600 hover:underline">
          Privacy Policy
        </Link>
      </p>
      
      <div className="text-center text-sm text-slate-600 dark:text-slate-400">
        Already have an account?{' '}
        <Link
          href="/auth/signin"
          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
        >
          Sign in
        </Link>
      </div>
    </form>
  );
}
