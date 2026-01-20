/**
 * Federation Settings Form (Client Component)
 * 
 * Form for configuring federation with CFP Directory.
 */

'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useApi } from '@/hooks/use-api';
import { toast } from 'sonner';
import { Loader2, CheckCircle, XCircle, AlertTriangle, Key } from 'lucide-react';
import { format } from 'date-fns';

interface FederationSettings {
  federationEnabled: boolean;
  federationLicenseKey?: string | null;
  federationActivatedAt?: Date | null;
  federationLastHeartbeat?: Date | null;
  federationWarnings?: unknown;
  federationFeatures?: unknown;
}

interface FederationSettingsFormProps {
  settings: FederationSettings;
}

export function FederationSettingsForm({ settings }: FederationSettingsFormProps) {
  const router = useRouter();
  const api = useApi();
  const [enabled, setEnabled] = useState(settings.federationEnabled);
  const [licenseKey, setLicenseKey] = useState(settings.federationLicenseKey || '');
  const [showKey, setShowKey] = useState(false);
  
  const hasLicense = Boolean(settings.federationLicenseKey);
  const isActive = settings.federationEnabled && hasLicense;
  const warnings = settings.federationWarnings as string[] | null;
  
  const handleToggle = async (newEnabled: boolean) => {
    if (newEnabled && !licenseKey) {
      toast.error('Please enter a license key first');
      return;
    }
    
    setEnabled(newEnabled);
    
    const { error } = await api.patch('/api/settings', {
      federationEnabled: newEnabled,
      federationLicenseKey: licenseKey || undefined,
    });
    
    if (error) {
      setEnabled(!newEnabled); // Revert
      return;
    }
    
    toast.success(newEnabled ? 'Federation enabled' : 'Federation disabled');
    router.refresh();
  };
  
  const handleSaveLicense = async () => {
    if (!licenseKey.trim()) {
      toast.error('Please enter a license key');
      return;
    }
    
    const { error } = await api.patch('/api/settings', {
      federationEnabled: enabled,
      federationLicenseKey: licenseKey,
    });
    
    if (error) {
      return;
    }
    
    toast.success('License key saved');
    router.refresh();
  };
  
  const handleRemoveLicense = async () => {
    const { error } = await api.patch('/api/settings', {
      federationEnabled: false,
      federationLicenseKey: '',
    });
    
    if (error) {
      return;
    }
    
    setEnabled(false);
    setLicenseKey('');
    toast.success('License key removed');
    router.refresh();
  };
  
  const maskLicenseKey = (key: string) => {
    if (key.length <= 8) return key;
    return key.slice(0, 4) + '•'.repeat(key.length - 8) + key.slice(-4);
  };
  
  return (
    <div className="space-y-6">
      {/* Enable/Disable Toggle */}
      <div className="flex items-center justify-between p-4 rounded-lg border">
        <div className="space-y-0.5">
          <Label className="text-base">Enable Federation</Label>
          <p className="text-sm text-slate-500">
            Connect to CFP Directory&apos;s speaker network
          </p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={handleToggle}
          disabled={api.isLoading || !hasLicense}
        />
      </div>
      
      {/* Status */}
      {hasLicense && (
        <div className="p-4 rounded-lg border space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Status</span>
            {isActive ? (
              <Badge className="bg-green-500">
                <CheckCircle className="h-3 w-3 mr-1" />
                Active
              </Badge>
            ) : (
              <Badge variant="outline">
                <XCircle className="h-3 w-3 mr-1" />
                Inactive
              </Badge>
            )}
          </div>
          
          {settings.federationActivatedAt && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Activated</span>
              <span>{format(new Date(settings.federationActivatedAt), 'PPp')}</span>
            </div>
          )}
          
          {settings.federationLastHeartbeat && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Last Sync</span>
              <span>{format(new Date(settings.federationLastHeartbeat), 'PPp')}</span>
            </div>
          )}
          
          {warnings && warnings.length > 0 && (
            <div className="pt-2 space-y-2">
              {warnings.map((warning, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-orange-600 dark:text-orange-400">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>{warning}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* License Key Input */}
      <div className="space-y-3">
        <Label htmlFor="licenseKey">License Key</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              id="licenseKey"
              type={showKey ? 'text' : 'password'}
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              placeholder="Enter your federation license key"
              className="pl-10 font-mono"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowKey(!showKey)}
          >
            {showKey ? 'Hide' : 'Show'}
          </Button>
        </div>
        {hasLicense && licenseKey === settings.federationLicenseKey && (
          <p className="text-sm text-slate-500">
            Current key: {maskLicenseKey(licenseKey)}
          </p>
        )}
      </div>
      
      {/* Actions */}
      <div className="flex gap-3">
        <Button
          onClick={handleSaveLicense}
          disabled={api.isLoading || !licenseKey.trim() || licenseKey === settings.federationLicenseKey}
        >
          {api.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save License Key
        </Button>
        
        {hasLicense && (
          <Button
            variant="outline"
            onClick={handleRemoveLicense}
            disabled={api.isLoading}
            className="text-red-600 hover:text-red-700"
          >
            Remove License
          </Button>
        )}
      </div>
      
      {/* Get License CTA */}
      {!hasLicense && (
        <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
            Don&apos;t have a license key yet?
          </p>
          <a
            href="https://cfp.directory/pricing"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            Get a federation license →
          </a>
        </div>
      )}
    </div>
  );
}
