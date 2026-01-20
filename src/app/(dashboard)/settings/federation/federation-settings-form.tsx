/**
 * Federation Settings Form (Client Component)
 * 
 * Form for configuring federation with CFP Directory.
 * 
 * Setup Flow:
 * 1. Generate keypair (RSA-2048)
 * 2. Copy public key to cfp.directory when registering for license
 * 3. Enter license key received from cfp.directory
 * 4. Enable federation
 */

'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useApi } from '@/hooks/use-api';
import { toast } from 'sonner';
import { 
  Loader2, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Key, 
  Shield, 
  Copy, 
  RefreshCw,
  Lock,
  Fingerprint,
} from 'lucide-react';
import { format } from 'date-fns';

interface FederationSettings {
  federationEnabled: boolean;
  federationLicenseKey?: string | null;
  federationActivatedAt?: Date | null;
  federationLastHeartbeat?: Date | null;
  federationWarnings?: unknown;
  federationFeatures?: unknown;
  instancePublicKey?: string | null;
  instanceKeyGeneratedAt?: Date | null;
}

interface KeypairStatus {
  hasKeypair: boolean;
  publicKey: string | null;
  fingerprint: string | null;
  isValid: boolean;
  generatedAt: string | null;
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
  const [keypairStatus, setKeypairStatus] = useState<KeypairStatus | null>(null);
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [showPublicKey, setShowPublicKey] = useState(false);
  
  const hasLicense = Boolean(settings.federationLicenseKey);
  const isActive = settings.federationEnabled && hasLicense;
  const warnings = settings.federationWarnings as string[] | null;
  
  // Fetch keypair status on mount
  const fetchKeypairStatus = useCallback(async () => {
    const { data } = await api.get('/api/federation/keypair');
    if (data) {
      setKeypairStatus(data as KeypairStatus);
    }
  }, [api]);
  
  useEffect(() => {
    fetchKeypairStatus();
  }, [fetchKeypairStatus]);
  
  const handleGenerateKeypair = async () => {
    setIsGeneratingKey(true);
    
    const { data, error } = await api.post('/api/federation/keypair', {});
    
    setIsGeneratingKey(false);
    
    if (error) {
      return;
    }
    
    const response = data as { success: boolean; publicKey?: string; fingerprint?: string; message?: string };
    
    if (response.success) {
      toast.success(response.message || 'Keypair generated successfully');
      setShowPublicKey(true);
      fetchKeypairStatus();
    }
  };
  
  const handleCopyPublicKey = async () => {
    if (keypairStatus?.publicKey) {
      await navigator.clipboard.writeText(keypairStatus.publicKey);
      toast.success('Public key copied to clipboard');
    }
  };
  
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
    
    const { data, error } = await api.patch('/api/settings', {
      federationEnabled: enabled,
      federationLicenseKey: licenseKey,
    });
    
    if (error) {
      return;
    }
    
    // Check if validation failed
    const response = data as { success?: boolean; validation?: { valid: boolean; license?: unknown }; error?: string; message?: string };
    
    if (response.success === false || (response.validation && !response.validation.valid)) {
      toast.error(response.message || response.error || 'Invalid license key');
      return;
    }
    
    // Success - license validated
    if (response.validation?.valid) {
      toast.success('License validated and saved successfully!');
    } else {
      toast.success('License key saved');
    }
    
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
      {/* Setup Steps Overview */}
      <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border">
        <h3 className="text-sm font-medium mb-3">Federation Setup</h3>
        <ol className="space-y-2 text-sm">
          <li className="flex items-center gap-2">
            {keypairStatus?.hasKeypair ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <div className="h-4 w-4 rounded-full border-2 border-slate-300" />
            )}
            <span className={keypairStatus?.hasKeypair ? 'text-green-700 dark:text-green-400' : ''}>
              Step 1: Generate encryption keypair
            </span>
          </li>
          <li className="flex items-center gap-2">
            {hasLicense ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <div className="h-4 w-4 rounded-full border-2 border-slate-300" />
            )}
            <span className={hasLicense ? 'text-green-700 dark:text-green-400' : ''}>
              Step 2: Register on cfp.directory & enter license key
            </span>
          </li>
          <li className="flex items-center gap-2">
            {isActive ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <div className="h-4 w-4 rounded-full border-2 border-slate-300" />
            )}
            <span className={isActive ? 'text-green-700 dark:text-green-400' : ''}>
              Step 3: Enable federation
            </span>
          </li>
        </ol>
      </div>
      
      {/* Step 1: Keypair Management */}
      <div className="p-4 rounded-lg border space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-500" />
          <h3 className="text-base font-medium">Encryption Keypair</h3>
        </div>
        
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Generate an RSA-2048 keypair for secure data transfer. Your public key will be 
          registered with cfp.directory when you obtain a license. Speaker data will be 
          encrypted with your public key before being sent.
        </p>
        
        {keypairStatus?.hasKeypair ? (
          <div className="space-y-3">
            {/* Keypair Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium text-green-700 dark:text-green-400">
                  Keypair Generated
                </span>
              </div>
              {keypairStatus.isValid ? (
                <Badge className="bg-green-500">Valid</Badge>
              ) : (
                <Badge variant="destructive">Invalid</Badge>
              )}
            </div>
            
            {/* Fingerprint */}
            {keypairStatus.fingerprint && (
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Key Fingerprint</Label>
                <div className="flex items-center gap-2">
                  <Fingerprint className="h-4 w-4 text-slate-400" />
                  <code className="text-xs font-mono text-slate-600 dark:text-slate-400 break-all">
                    {keypairStatus.fingerprint.slice(0, 47)}...
                  </code>
                </div>
              </div>
            )}
            
            {/* Generated At */}
            {keypairStatus.generatedAt && (
              <p className="text-xs text-slate-500">
                Generated: {format(new Date(keypairStatus.generatedAt), 'PPp')}
              </p>
            )}
            
            {/* Public Key Display */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Public Key</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPublicKey(!showPublicKey)}
                >
                  {showPublicKey ? 'Hide' : 'Show'}
                </Button>
              </div>
              
              {showPublicKey && keypairStatus.publicKey && (
                <div className="space-y-2">
                  <Textarea
                    readOnly
                    value={keypairStatus.publicKey}
                    className="font-mono text-xs h-32"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyPublicKey}
                    className="w-full"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Public Key
                  </Button>
                  <p className="text-xs text-slate-500">
                    Copy this public key and paste it when registering for a license on cfp.directory
                  </p>
                </div>
              )}
            </div>
            
            {/* Regenerate Warning */}
            {!settings.federationEnabled && (
              <div className="pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateKeypair}
                  disabled={isGeneratingKey}
                  className="text-orange-600 hover:text-orange-700"
                >
                  {isGeneratingKey ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Regenerate Keypair
                </Button>
                <p className="text-xs text-orange-600 mt-1">
                  Warning: Regenerating will require updating your public key on cfp.directory
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <Button
              onClick={handleGenerateKeypair}
              disabled={isGeneratingKey}
            >
              {isGeneratingKey ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Shield className="h-4 w-4 mr-2" />
              )}
              Generate Encryption Keypair
            </Button>
            <p className="text-xs text-slate-500">
              This will generate an RSA-2048 keypair. The private key is stored encrypted 
              and never leaves this server.
            </p>
          </div>
        )}
      </div>
      
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
          disabled={api.isLoading || !hasLicense || !keypairStatus?.hasKeypair}
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
