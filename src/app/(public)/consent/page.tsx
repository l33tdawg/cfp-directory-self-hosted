'use client';

/**
 * Consent Landing Page
 * 
 * This page handles the speaker consent flow when redirected from cfp.directory.
 * It validates the consent token, syncs the speaker's profile, and shows
 * the result to the user.
 */

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, XCircle, AlertCircle, Loader2, ArrowRight, ExternalLink } from 'lucide-react';

interface ConsentResult {
  success: boolean;
  message?: string;
  data?: {
    federatedSpeakerId: string;
    eventId: string;
    eventName: string;
    eventSlug: string;
    scopes: string[];
    materialsDownloaded: number;
    coSpeakersProcessed: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

type ConsentStatus = 'loading' | 'success' | 'error' | 'missing_params';

function ConsentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<ConsentStatus>('loading');
  const [result, setResult] = useState<ConsentResult | null>(null);

  // Extract params
  const token = searchParams.get('token');
  const speakerId = searchParams.get('speaker');
  const eventId = searchParams.get('event');
  const returnUrl = searchParams.get('return_url');

  useEffect(() => {
    // Check if we have all required params
    if (!token || !speakerId || !eventId) {
      // Use requestAnimationFrame to avoid the linter warning about setState in effect
      requestAnimationFrame(() => setStatus('missing_params'));
      return;
    }

    // Call the consent API endpoint
    const processConsent = async () => {
      try {
        const params = new URLSearchParams({
          token,
          speaker: speakerId,
          event: eventId,
        });

        const response = await fetch(`/api/federation/consent?${params.toString()}`);
        const data = await response.json();

        setResult(data);
        setStatus(data.success ? 'success' : 'error');
      } catch (error) {
        console.error('Consent processing error:', error);
        setResult({
          success: false,
          error: {
            code: 'NETWORK_ERROR',
            message: 'Failed to connect to the server',
          },
        });
        setStatus('error');
      }
    };

    processConsent();
  }, [token, speakerId, eventId]);

  const handleContinue = () => {
    if (result?.data?.eventSlug) {
      router.push(`/events/${result.data.eventSlug}/submit`);
    } else {
      router.push('/events');
    }
  };

  const handleGoBack = () => {
    if (returnUrl) {
      window.location.href = returnUrl;
    } else {
      router.push('/');
    }
  };

  // Render loading state
  if (status === 'loading') {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Loader2 className="w-12 h-12 mx-auto mb-4 text-primary animate-spin" />
          <CardTitle>Processing Your Consent</CardTitle>
          <CardDescription>
            We&apos;re syncing your speaker profile. This will only take a moment...
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render missing params state
  if (status === 'missing_params') {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
          <CardTitle>Invalid Link</CardTitle>
          <CardDescription>
            This consent link appears to be incomplete or invalid.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center">
            Please return to CFP Directory and try granting consent again.
            If the problem persists, contact the event organizers.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button variant="outline" onClick={handleGoBack}>
            Go Back
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Render error state
  if (status === 'error') {
    const errorMessage = result?.error?.message || 'An unexpected error occurred';
    const errorCode = result?.error?.code || 'UNKNOWN_ERROR';

    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <XCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <CardTitle>Consent Failed</CardTitle>
          <CardDescription>
            We couldn&apos;t process your consent. Please try again.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-sm font-medium text-red-800 dark:text-red-200">
              {errorMessage}
            </p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              Error code: {errorCode}
            </p>
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            <p className="font-medium mb-2">What you can do:</p>
            <ul className="list-disc list-inside space-y-1">
              {errorCode === 'EXPIRED' && (
                <li>Return to CFP Directory and grant consent again</li>
              )}
              {errorCode === 'REVOKED' && (
                <li>You may have revoked consent. Please re-grant if needed.</li>
              )}
              {errorCode === 'FEDERATION_DISABLED' && (
                <li>Contact the event organizers - federation may not be set up</li>
              )}
              <li>Try again in a few minutes</li>
              <li>Contact support if the issue persists</li>
            </ul>
          </div>
        </CardContent>
        <CardFooter className="flex gap-2 justify-center">
          <Button variant="outline" onClick={handleGoBack}>
            Go Back
          </Button>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Render success state
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
        <CardTitle>Profile Synced Successfully!</CardTitle>
        <CardDescription>
          Your speaker profile has been synced to this event.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Event info */}
        {result?.data?.eventName && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Event</p>
            <p className="font-medium">{result.data.eventName}</p>
          </div>
        )}

        {/* Synced data summary */}
        <div className="space-y-3">
          <p className="text-sm font-medium">What was synced:</p>
          <div className="flex flex-wrap gap-2">
            {result?.data?.scopes.map((scope) => (
              <Badge key={scope} variant="secondary">
                {scope.replace('_', ' ')}
              </Badge>
            ))}
          </div>

          {(result?.data?.materialsDownloaded ?? 0) > 0 && (
            <p className="text-sm text-muted-foreground">
              {result?.data?.materialsDownloaded} material(s) downloaded
            </p>
          )}

          {(result?.data?.coSpeakersProcessed ?? 0) > 0 && (
            <p className="text-sm text-muted-foreground">
              {result?.data?.coSpeakersProcessed} co-speaker(s) processed
            </p>
          )}
        </div>

        {/* Next steps */}
        <div className="border-t pt-4 mt-4">
          <p className="text-sm font-medium mb-2">Next Steps</p>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li className="flex items-start gap-2">
              <ArrowRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Submit your talk proposal to the event</span>
            </li>
            <li className="flex items-start gap-2">
              <ArrowRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Your profile data will be pre-filled</span>
            </li>
            <li className="flex items-start gap-2">
              <ArrowRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>You can manage your consent from CFP Directory</span>
            </li>
          </ul>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        <Button className="w-full" onClick={handleContinue}>
          Submit a Talk
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
        <Button variant="outline" className="w-full" asChild>
          <a href="https://cfp.directory" target="_blank" rel="noopener noreferrer">
            <ExternalLink className="w-4 h-4 mr-2" />
            Return to CFP Directory
          </a>
        </Button>
      </CardFooter>
    </Card>
  );
}

function ConsentLoading() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <Loader2 className="w-12 h-12 mx-auto mb-4 text-primary animate-spin" />
        <CardTitle>Loading...</CardTitle>
        <CardDescription>
          Please wait while we prepare the consent page.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function ConsentLandingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Suspense fallback={<ConsentLoading />}>
        <ConsentContent />
      </Suspense>
    </div>
  );
}
