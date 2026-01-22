'use client';

/**
 * Setup Wizard Component
 * 
 * Multi-step wizard for initial system setup.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Loader2,
  User,
  Building2,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Mail,
  Lock,
  Globe,
  Sparkles,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const setupSchema = z.object({
  setupToken: z.string().optional(),
  adminName: z.string().min(2, 'Name must be at least 2 characters'),
  adminEmail: z.string().email('Invalid email address'),
  adminPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  siteName: z.string().min(2, 'Site name must be at least 2 characters'),
  siteDescription: z.string().max(500).optional(),
  siteWebsite: z.string().url('Invalid URL').optional().or(z.literal('')),
}).refine((data) => data.adminPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type SetupFormData = z.infer<typeof setupSchema>;

export function SetupWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    trigger,
  } = useForm<SetupFormData>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      setupToken: '',
      adminName: '',
      adminEmail: '',
      adminPassword: '',
      confirmPassword: '',
      siteName: '',
      siteDescription: '',
      siteWebsite: '',
    },
  });

  const validateStep = async (stepNum: number): Promise<boolean> => {
    if (stepNum === 1) {
      return await trigger(['adminName', 'adminEmail', 'adminPassword', 'confirmPassword']);
    }
    if (stepNum === 2) {
      return await trigger(['siteName']);
    }
    return true;
  };

  const nextStep = async () => {
    const isValid = await validateStep(step);
    if (isValid && step < 3) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const onSubmit = async (data: SetupFormData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/setup/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setupToken: data.setupToken,
          adminName: data.adminName,
          adminEmail: data.adminEmail,
          adminPassword: data.adminPassword,
          siteName: data.siteName,
          siteDescription: data.siteDescription,
          siteWebsite: data.siteWebsite,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Setup failed');
      }

      setIsComplete(true);
      toast.success('Setup complete! Redirecting to sign in...');
      
      // Redirect to sign in after a moment
      setTimeout(() => {
        router.push('/auth/signin');
      }, 2000);
    } catch (error) {
      console.error('Setup error:', error);
      toast.error(error instanceof Error ? error.message : 'Setup failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isComplete) {
    return (
      <Card className="w-full max-w-lg">
        <CardContent className="pt-12 pb-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 mb-6">
            <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Setup Complete!</h2>
          <p className="text-muted-foreground mb-6">
            CFP Directory Self-Hosted is ready. Redirecting you to sign in...
          </p>
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader className="text-center pb-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 mx-auto mb-4">
          <Sparkles className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>
        <CardTitle className="text-2xl">Welcome to CFP Directory Self-Hosted</CardTitle>
        <CardDescription>
          Let&apos;s set up your conference call for papers system
        </CardDescription>
      </CardHeader>

      {/* Progress Steps */}
      <div className="px-6 pb-4">
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  s === step
                    ? 'bg-blue-600 text-white'
                    : s < step
                    ? 'bg-green-600 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                }`}
              >
                {s < step ? <CheckCircle2 className="h-4 w-4" /> : s}
              </div>
              {s < 3 && (
                <div
                  className={`w-12 h-1 mx-1 rounded ${
                    s < step ? 'bg-green-600' : 'bg-slate-200 dark:bg-slate-700'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-muted-foreground px-2">
          <span>Admin Account</span>
          <span>Site Settings</span>
          <span>Review</span>
        </div>
      </div>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Step 1: Admin Account */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <User className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold">Create Admin Account</h3>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-4">
                <Label htmlFor="setupToken" className="text-amber-800 dark:text-amber-200 font-medium">
                  Setup Token
                </Label>
                <p className="text-xs text-amber-700 dark:text-amber-300 mb-2">
                  Enter the SETUP_TOKEN from your .env file or terminal output
                </p>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <Input
                    id="setupToken"
                    type="password"
                    {...register('setupToken')}
                    placeholder="Enter your setup token"
                    className="pl-10 font-mono text-sm"
                  />
                </div>
                {errors.setupToken && (
                  <p className="text-sm text-destructive mt-1">{errors.setupToken.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="adminName">Your Name</Label>
                <Input
                  id="adminName"
                  {...register('adminName')}
                  placeholder="John Doe"
                />
                {errors.adminName && (
                  <p className="text-sm text-destructive mt-1">{errors.adminName.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="adminEmail">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="adminEmail"
                    type="email"
                    {...register('adminEmail')}
                    placeholder="admin@example.com"
                    className="pl-10"
                  />
                </div>
                {errors.adminEmail && (
                  <p className="text-sm text-destructive mt-1">{errors.adminEmail.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="adminPassword">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="adminPassword"
                    type="password"
                    {...register('adminPassword')}
                    placeholder="At least 8 characters"
                    className="pl-10"
                  />
                </div>
                {errors.adminPassword && (
                  <p className="text-sm text-destructive mt-1">{errors.adminPassword.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    {...register('confirmPassword')}
                    placeholder="Confirm your password"
                    className="pl-10"
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive mt-1">{errors.confirmPassword.message}</p>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Site Settings */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold">Site Configuration</h3>
              </div>

              <div>
                <Label htmlFor="siteName">Site Name</Label>
                <Input
                  id="siteName"
                  {...register('siteName')}
                  placeholder="My Conference CFP"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This will be displayed in the header and page titles.
                </p>
                {errors.siteName && (
                  <p className="text-sm text-destructive mt-1">{errors.siteName.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="siteDescription">Description (optional)</Label>
                <Textarea
                  id="siteDescription"
                  {...register('siteDescription')}
                  placeholder="Submit your talk proposals for our upcoming conferences"
                  className="min-h-[80px]"
                />
              </div>

              <div>
                <Label htmlFor="siteWebsite">Website (optional)</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="siteWebsite"
                    type="url"
                    {...register('siteWebsite')}
                    placeholder="https://yourconference.com"
                    className="pl-10"
                  />
                </div>
                {errors.siteWebsite && (
                  <p className="text-sm text-destructive mt-1">{errors.siteWebsite.message}</p>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold">Review & Complete</h3>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Admin Account</p>
                  <p className="font-medium">{watch('adminName')}</p>
                  <p className="text-sm text-muted-foreground">{watch('adminEmail')}</p>
                </div>
                <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
                  <p className="text-xs text-muted-foreground">Site</p>
                  <p className="font-medium">{watch('siteName')}</p>
                  {watch('siteDescription') && (
                    <p className="text-sm mt-1 text-muted-foreground">{watch('siteDescription')}</p>
                  )}
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                By completing setup, you&apos;ll create an admin account and configure your site.
                You can create events and invite team members after signing in.
              </p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-6 pt-4 border-t">
            {step > 1 ? (
              <Button type="button" variant="outline" onClick={prevStep}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <Button type="button" onClick={nextStep}>
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Complete Setup
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
