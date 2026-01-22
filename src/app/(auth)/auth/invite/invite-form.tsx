'use client';

/**
 * Invitation Acceptance Form
 * 
 * Validates invitation token and allows user to set their password.
 */

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signIn } from 'next-auth/react';
import { z } from 'zod';
import { 
  Loader2, 
  Eye, 
  EyeOff, 
  Check, 
  X, 
  Mail, 
  Shield, 
  UserPlus,
  AlertCircle,
  Clock,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

const acceptInviteSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;

interface InvitationDetails {
  valid: boolean;
  email: string;
  role: string;
  invitedBy: string;
  expiresAt: string;
}

const ROLE_LABELS: Record<string, string> = {
  USER: 'User',
  SPEAKER: 'Speaker',
  REVIEWER: 'Reviewer',
  ORGANIZER: 'Organizer',
  ADMIN: 'Administrator',
};

const ROLE_COLORS: Record<string, string> = {
  USER: 'bg-slate-500',
  SPEAKER: 'bg-blue-500',
  REVIEWER: 'bg-purple-500',
  ORGANIZER: 'bg-green-500',
  ADMIN: 'bg-red-500',
};

export function InviteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [isValidating, setIsValidating] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<AcceptInviteInput>({
    resolver: zodResolver(acceptInviteSchema),
  });

  const password = watch('password', '');

  // Password strength indicators
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  // Validate token on mount
  useEffect(() => {
    async function validateToken() {
      if (!token) {
        setError('No invitation token provided. Please use the link from your invitation email.');
        setIsValidating(false);
        return;
      }

      try {
        const response = await fetch(`/api/auth/invite?token=${encodeURIComponent(token)}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Invalid invitation');
          setIsValidating(false);
          return;
        }

        setInvitation(data);
      } catch {
        setError('Failed to validate invitation. Please try again.');
      } finally {
        setIsValidating(false);
      }
    }

    validateToken();
  }, [token]);

  const onSubmit = async (data: AcceptInviteInput) => {
    if (!token) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          name: data.name,
          password: data.password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Failed to create account');
        return;
      }

      // Auto sign in after account creation
      const signInResult = await signIn('credentials', {
        email: invitation?.email,
        password: data.password,
        redirect: false,
      });

      if (signInResult?.error) {
        // Account created but sign-in failed
        router.push('/auth/signin?registered=true');
      } else {
        router.push('/dashboard');
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

  // Loading state while validating token
  if (isValidating) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="text-slate-600 dark:text-slate-400">Validating invitation...</p>
      </div>
    );
  }

  // Error state - invalid or expired token
  if (error && !invitation) {
    return (
      <div className="space-y-6">
        <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
              <div>
                <h3 className="font-medium text-red-900 dark:text-red-100">
                  Invalid Invitation
                </h3>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  {error}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center space-y-4">
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            If you already have an account, try signing in.
          </p>
          <Button asChild variant="outline">
            <Link href="/auth/signin">Go to Sign In</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Valid invitation - show acceptance form
  return (
    <div className="space-y-6">
      {/* Invitation Details */}
      <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-3">
            <UserPlus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                You&apos;ve been invited by <strong>{invitation?.invitedBy}</strong>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-slate-500" />
              <span className="text-sm text-slate-700 dark:text-slate-300">
                {invitation?.email}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-slate-500" />
              <Badge className={ROLE_COLORS[invitation?.role || 'USER']}>
                {ROLE_LABELS[invitation?.role || 'USER']}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 pt-2 border-t border-blue-200 dark:border-blue-800">
            <Clock className="h-3 w-3" />
            <span>
              Expires: {invitation?.expiresAt && new Date(invitation.expiresAt).toLocaleDateString()}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Account Creation Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="name">Your Name</Label>
          <Input
            id="name"
            type="text"
            placeholder="Your full name"
            autoComplete="name"
            disabled={isLoading}
            {...register('name')}
          />
          {errors.name && (
            <p className="text-sm text-red-500">{errors.name.message}</p>
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
          Create Account
        </Button>
      </form>

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
    </div>
  );
}
