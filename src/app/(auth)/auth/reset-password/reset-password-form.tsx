'use client';

/**
 * Reset Password Form Component
 */

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Eye, EyeOff, CheckCircle, Check, X, AlertCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { resetPasswordSchema, type ResetPasswordInput } from '@/lib/auth/validation';

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token: token || '',
    },
  });
  
  const password = watch('password', '');
  
  // Password strength indicators
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  
  // Check if token is missing
  if (!token) {
    return (
      <div className="text-center space-y-4">
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
          <div className="flex items-center justify-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-500 dark:text-red-400" />
            <p className="text-sm text-red-600 dark:text-red-300">
              Invalid or missing reset link. Please request a new password reset.
            </p>
          </div>
        </div>
        <Link
          href="/auth/forgot-password"
          className="inline-block text-violet-600 dark:text-violet-400 hover:text-violet-500 dark:hover:text-violet-300 transition-colors"
        >
          Request new reset link
        </Link>
      </div>
    );
  }
  
  const onSubmit = async (data: ResetPasswordInput) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: data.token,
          password: data.password,
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        setError(result.error || 'Failed to reset password');
        return;
      }
      
      setIsSuccess(true);
      
      // Redirect to sign in after a delay
      setTimeout(() => {
        router.push('/auth/signin?reset=true');
      }, 3000);
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };
  
  const PasswordRequirement = ({ met, text }: { met: boolean; text: string }) => (
    <div className="flex items-center gap-2 text-sm">
      {met ? (
        <Check className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
      ) : (
        <X className="h-4 w-4 text-slate-300 dark:text-white/30" />
      )}
      <span className={met ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-white/40'}>
        {text}
      </span>
    </div>
  );
  
  if (isSuccess) {
    return (
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
            <CheckCircle className="h-6 w-6 text-emerald-500 dark:text-emerald-400" />
          </div>
        </div>
        <div>
          <h3 className="text-lg font-medium text-slate-900 dark:text-white">
            Password reset successful!
          </h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-white/60">
            Your password has been updated. Redirecting you to sign in...
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-500 dark:text-red-400" />
            <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}
      
      <input type="hidden" {...register('token')} />
      
      <div className="space-y-2">
        <Label htmlFor="password" className="text-slate-700 dark:text-white/70">New Password</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            autoComplete="new-password"
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
        
        {/* Password requirements */}
        {password && (
          <div className="mt-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/5 space-y-1">
            <PasswordRequirement met={hasMinLength} text="At least 8 characters" />
            <PasswordRequirement met={hasUppercase} text="One uppercase letter" />
            <PasswordRequirement met={hasLowercase} text="One lowercase letter" />
            <PasswordRequirement met={hasNumber} text="One number" />
          </div>
        )}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="confirmPassword" className="text-slate-700 dark:text-white/70">Confirm New Password</Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder="••••••••"
            autoComplete="new-password"
            disabled={isLoading}
            className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:border-violet-500/50 focus:ring-violet-500/20 pr-10"
            {...register('confirmPassword')}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/40 hover:text-slate-600 dark:hover:text-white/60 transition-colors"
          >
            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.confirmPassword && (
          <p className="text-sm text-red-500 dark:text-red-400">{errors.confirmPassword.message}</p>
        )}
      </div>
      
      <Button 
        type="submit" 
        className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white border-0 shadow-lg shadow-violet-500/25" 
        disabled={isLoading}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Reset password
      </Button>
    </form>
  );
}
