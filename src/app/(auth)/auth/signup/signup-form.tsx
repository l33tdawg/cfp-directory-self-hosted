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
import { Loader2, Eye, EyeOff, Check, X, UserX, Info, AlertCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
      
      // Redirect to verify-request page with email
      // User must verify email before they can sign in
      const emailParam = encodeURIComponent(data.email);
      router.push(`/auth/verify-request?email=${emailParam}`);
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };
  
  const PasswordRequirement = ({ met, text }: { met: boolean; text: string }) => (
    <div className="flex items-center gap-2 text-sm">
      {met ? (
        <Check className="h-4 w-4 text-emerald-400" />
      ) : (
        <X className="h-4 w-4 text-white/30" />
      )}
      <span className={met ? 'text-emerald-400' : 'text-white/40'}>
        {text}
      </span>
    </div>
  );
  
  // Loading state while checking signup status
  if (isCheckingStatus) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
      </div>
    );
  }
  
  // Signup disabled state
  if (!signupStatus?.allowPublicSignup) {
    return (
      <div className="space-y-6">
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <div className="flex items-start gap-3">
            <UserX className="h-5 w-5 text-amber-400 mt-0.5" />
            <div>
              <h3 className="font-medium text-amber-300">
                Registration is Invite-Only
              </h3>
              <p className="text-sm text-amber-300/70 mt-1">
                Speaker registration is currently disabled. You&apos;ll need an invitation from an organizer to create an account.
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-400 mt-0.5" />
            <div className="space-y-2">
              <h3 className="font-medium text-blue-300">
                How to Get Access
              </h3>
              <ul className="text-sm text-blue-300/70 space-y-1 list-disc list-inside">
                <li>Contact an event organizer to request an invitation</li>
                <li>Check your email for an existing invitation link</li>
                {signupStatus?.contactEmail && (
                  <li>
                    Email us at{' '}
                    <a 
                      href={`mailto:${signupStatus.contactEmail}`}
                      className="text-blue-400 underline hover:no-underline"
                    >
                      {signupStatus.contactEmail}
                    </a>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>

        <div className="text-center space-y-4">
          <p className="text-white/50 text-sm">
            Already have an account or invitation?
          </p>
          <Button asChild className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white border-0">
            <Link href="/auth/signin">Sign In</Link>
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        </div>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="name" className="text-white/70">Name (optional)</Label>
        <Input
          id="name"
          type="text"
          placeholder="Your name"
          autoComplete="name"
          disabled={isLoading}
          className="bg-slate-800/50 border-white/10 text-white placeholder:text-white/30 focus:border-violet-500/50 focus:ring-violet-500/20"
          {...register('name')}
        />
        {errors.name && (
          <p className="text-sm text-red-400">{errors.name.message}</p>
        )}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="email" className="text-white/70">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          disabled={isLoading}
          className="bg-slate-800/50 border-white/10 text-white placeholder:text-white/30 focus:border-violet-500/50 focus:ring-violet-500/20"
          {...register('email')}
        />
        {errors.email && (
          <p className="text-sm text-red-400">{errors.email.message}</p>
        )}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="password" className="text-white/70">Password</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            autoComplete="new-password"
            disabled={isLoading}
            className="bg-slate-800/50 border-white/10 text-white placeholder:text-white/30 focus:border-violet-500/50 focus:ring-violet-500/20 pr-10"
            {...register('password')}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password && (
          <p className="text-sm text-red-400">{errors.password.message}</p>
        )}
        
        {/* Password requirements */}
        {password && (
          <div className="mt-2 p-3 rounded-lg bg-slate-800/50 border border-white/5 space-y-1">
            <PasswordRequirement met={hasMinLength} text="At least 8 characters" />
            <PasswordRequirement met={hasUppercase} text="One uppercase letter" />
            <PasswordRequirement met={hasLowercase} text="One lowercase letter" />
            <PasswordRequirement met={hasNumber} text="One number" />
          </div>
        )}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="confirmPassword" className="text-white/70">Confirm Password</Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder="••••••••"
            autoComplete="new-password"
            disabled={isLoading}
            className="bg-slate-800/50 border-white/10 text-white placeholder:text-white/30 focus:border-violet-500/50 focus:ring-violet-500/20 pr-10"
            {...register('confirmPassword')}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
          >
            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.confirmPassword && (
          <p className="text-sm text-red-400">{errors.confirmPassword.message}</p>
        )}
      </div>
      
      <Button 
        type="submit" 
        className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white border-0 shadow-lg shadow-violet-500/25" 
        disabled={isLoading}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Create Speaker Account
      </Button>
      
      <div className="p-3 rounded-lg bg-slate-800/50 border border-white/5 text-center">
        <p className="text-xs text-white/40">
          <Info className="h-3 w-3 inline mr-1" />
          You&apos;ll be registered as a <span className="text-white/60 font-medium">Speaker</span> and can submit talks to events.
          Organizers, reviewers, and admins must be invited.
        </p>
      </div>
      
      <p className="text-center text-xs text-white/40">
        By creating an account, you agree to our{' '}
        <Link href="/terms" className="text-violet-400 hover:text-violet-300 transition-colors">
          Terms of Service
        </Link>{' '}
        and{' '}
        <Link href="/privacy" className="text-violet-400 hover:text-violet-300 transition-colors">
          Privacy Policy
        </Link>
      </p>
      
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/10" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-slate-900/50 px-2 text-white/40">or</span>
        </div>
      </div>
      
      <p className="text-center text-sm text-white/50">
        Already have an account?{' '}
        <Link
          href="/auth/signin"
          className="text-violet-400 hover:text-violet-300 font-medium transition-colors"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
