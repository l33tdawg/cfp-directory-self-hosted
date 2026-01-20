/**
 * Event Federation Section
 * 
 * Client component for managing event federation with CFP Directory.
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useApi } from '@/hooks/use-api';
import { toast } from 'sonner';
import { 
  Loader2, 
  Globe2, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Link2,
  Link2Off,
  ExternalLink,
  Info,
} from 'lucide-react';

interface FederationStatus {
  eventId: string;
  eventName: string;
  isFederated: boolean;
  federatedEventId: string | null;
  hasWebhookSecret: boolean;
  federationAvailable: boolean;
  federationState: {
    isEnabled: boolean;
    isConfigured: boolean;
    isValid: boolean;
    license: {
      tier: string;
      features: Record<string, boolean>;
    } | null;
  };
}

interface EventFederationSectionProps {
  eventId: string;
}

export function EventFederationSection({ eventId }: EventFederationSectionProps) {
  const router = useRouter();
  const api = useApi();
  const [status, setStatus] = useState<FederationStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  
  // Fetch federation status
  useEffect(() => {
    async function fetchStatus() {
      setIsLoading(true);
      const { data, error } = await api.get(`/api/events/${eventId}/federation`);
      
      if (!error && data) {
        setStatus(data as FederationStatus);
      }
      setIsLoading(false);
    }
    
    fetchStatus();
  }, [eventId]); // eslint-disable-line react-hooks/exhaustive-deps
  
  const handleEnableFederation = async () => {
    setIsToggling(true);
    const { data, error } = await api.post(`/api/events/${eventId}/federation`, {});
    
    if (error) {
      setIsToggling(false);
      return;
    }
    
    toast.success('Event is now federated with CFP Directory!');
    setStatus(prev => prev ? { ...prev, isFederated: true, federatedEventId: (data as { event: { federatedEventId: string } }).event.federatedEventId } : prev);
    setIsToggling(false);
    router.refresh();
  };
  
  const handleDisableFederation = async () => {
    setIsToggling(true);
    const { error } = await api.delete(`/api/events/${eventId}/federation`);
    
    if (error) {
      setIsToggling(false);
      setShowDisableDialog(false);
      return;
    }
    
    toast.success('Event federation disabled');
    setStatus(prev => prev ? { ...prev, isFederated: false, federatedEventId: null } : prev);
    setIsToggling(false);
    setShowDisableDialog(false);
    router.refresh();
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-2 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading federation status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!status) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-slate-500">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p>Failed to load federation status</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Federation not configured
  if (!status.federationState.isConfigured) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe2 className="h-5 w-5" />
            Federation
          </CardTitle>
          <CardDescription>
            Connect to CFP Directory&apos;s global speaker network
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-6 text-center">
            <Info className="h-10 w-10 mx-auto text-slate-400 mb-3" />
            <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
              Federation Not Configured
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              To enable federation for your events, add a license key in Settings.
            </p>
            <Button variant="outline" asChild>
              <a href="/settings">
                Configure Federation →
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // License not valid
  if (!status.federationState.isValid) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe2 className="h-5 w-5" />
            Federation
          </CardTitle>
          <CardDescription>
            Connect to CFP Directory&apos;s global speaker network
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20 p-6 text-center">
            <AlertTriangle className="h-10 w-10 mx-auto text-orange-500 mb-3" />
            <h3 className="font-semibold text-orange-900 dark:text-orange-100 mb-1">
              License Invalid
            </h3>
            <p className="text-sm text-orange-700 dark:text-orange-300 mb-4">
              Your federation license is invalid or expired. Please check your license key.
            </p>
            <Button variant="outline" asChild>
              <a href="/settings">
                Check Settings →
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Federation not enabled globally
  if (!status.federationState.isEnabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe2 className="h-5 w-5" />
            Federation
          </CardTitle>
          <CardDescription>
            Connect to CFP Directory&apos;s global speaker network
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-6 text-center">
            <Link2Off className="h-10 w-10 mx-auto text-slate-400 mb-3" />
            <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
              Federation Disabled
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              Federation is currently disabled for this instance.
              Enable it in Settings to connect your events.
            </p>
            <Button variant="outline" asChild>
              <a href="/settings">
                Enable in Settings →
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Federation available - show toggle
  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Globe2 className="h-5 w-5" />
              Federation
            </CardTitle>
            <CardDescription>
              Connect to CFP Directory&apos;s global speaker network
            </CardDescription>
          </div>
          {status.isFederated ? (
            <Badge className="bg-green-500">
              <CheckCircle className="h-3 w-3 mr-1" />
              Connected
            </Badge>
          ) : (
            <Badge variant="outline">
              <XCircle className="h-3 w-3 mr-1" />
              Not Connected
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg border bg-slate-50 dark:bg-slate-800">
            <div className="space-y-0.5">
              <Label className="text-base font-medium">
                {status.isFederated ? 'Connected to CFP Directory' : 'Enable Federation'}
              </Label>
              <p className="text-sm text-slate-500">
                {status.isFederated 
                  ? 'Speakers from CFP Directory can submit to this event'
                  : 'Allow speakers from CFP Directory to discover and submit to this event'}
              </p>
            </div>
            <Switch
              checked={status.isFederated}
              onCheckedChange={(checked) => {
                if (checked) {
                  handleEnableFederation();
                } else {
                  setShowDisableDialog(true);
                }
              }}
              disabled={isToggling}
            />
          </div>
          
          {/* Status details when federated */}
          {status.isFederated && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Federated Event ID</span>
                <code className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                  {status.federatedEventId}
                </code>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Webhook Configured</span>
                {status.hasWebhookSecret ? (
                  <Badge variant="secondary" className="text-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-orange-600">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Missing
                  </Badge>
                )}
              </div>
            </div>
          )}
          
          {/* Feature info */}
          <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-4">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 flex items-center gap-2 mb-2">
              <Link2 className="h-4 w-4" />
              What federation enables
            </h4>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1.5">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <span>Speakers can discover your event on cfp.directory</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <span>Speaker profiles and materials sync automatically</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <span>Status updates reflect in speaker dashboards</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <span>Bidirectional messaging with speakers</span>
              </li>
            </ul>
            <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
              <a 
                href="https://cfp.directory/docs/federation"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1"
              >
                Learn more about federation
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Disable confirmation dialog */}
      <AlertDialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable Federation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will disconnect the event from CFP Directory. Speakers who submitted 
              through federation will no longer receive status updates, and new speakers 
              won&apos;t be able to submit through the speaker network.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isToggling}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisableFederation}
              disabled={isToggling}
              className="bg-red-600 hover:bg-red-700"
            >
              {isToggling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Disable Federation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
