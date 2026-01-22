'use client';

/**
 * SMTP Settings Form
 * 
 * Form for configuring email (SMTP) settings.
 * All settings stored in database - no environment variables.
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { 
  Mail, 
  Server, 
  Lock, 
  CheckCircle2, 
  Loader2,
  Send,
  RefreshCw,
  Eye,
  EyeOff,
  AlertCircle,
} from 'lucide-react';

interface SmtpConfig {
  configured: boolean;
  host: string;
  port: number;
  user: string;
  secure: boolean;
  fromName: string;
  fromEmail: string;
  passwordSet: boolean;
}

export function SmtpSettingsForm() {
  const [config, setConfig] = useState<SmtpConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPass: '',
    smtpSecure: false,
    smtpFromName: '',
    smtpFromEmail: '',
  });

  // Load current SMTP config
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const res = await fetch('/api/settings/smtp');
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        setFormData({
          smtpHost: data.host || '',
          smtpPort: data.port || 587,
          smtpUser: data.user || '',
          smtpPass: '', // Never returned from API
          smtpSecure: data.secure || false,
          smtpFromName: data.fromName || '',
          smtpFromEmail: data.fromEmail || '',
        });
      }
    } catch (error) {
      console.error('Failed to load SMTP config:', error);
      toast.error('Failed to load SMTP configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch('/api/settings/smtp', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save settings');
      }

      toast.success('SMTP settings saved');
      setConfig({
        ...config!,
        configured: true,
        host: formData.smtpHost,
        port: formData.smtpPort,
        user: formData.smtpUser,
        secure: formData.smtpSecure,
        fromName: formData.smtpFromName,
        fromEmail: formData.smtpFromEmail,
        passwordSet: true,
      });
      
      // Clear password field after save
      setFormData(prev => ({ ...prev, smtpPass: '' }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);

    try {
      const res = await fetch('/api/settings/smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test-connection' }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success('SMTP connection successful!');
      } else {
        toast.error(data.error || 'Connection failed');
      }
    } catch {
      toast.error('Failed to test connection');
    } finally {
      setTesting(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmail) {
      toast.error('Please enter an email address');
      return;
    }

    setSendingTest(true);

    try {
      const res = await fetch('/api/settings/smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send-test', testEmail }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(`Test email sent to ${testEmail}`);
        setTestEmail('');
      } else {
        toast.error(data.error || 'Failed to send test email');
      }
    } catch {
      toast.error('Failed to send test email');
    } finally {
      setSendingTest(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${config?.configured ? 'bg-green-100 dark:bg-green-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
                <Mail className={`h-5 w-5 ${config?.configured ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`} />
              </div>
              <div>
                <CardTitle className="text-lg">Email Configuration</CardTitle>
                <CardDescription>
                  {config?.configured 
                    ? `Connected to ${config.host}:${config.port}`
                    : 'Email not configured'}
                </CardDescription>
              </div>
            </div>
            {config?.configured ? (
              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Configured
              </Badge>
            ) : (
              <Badge variant="outline" className="text-amber-600 border-amber-300">
                <AlertCircle className="h-3 w-3 mr-1" />
                Not Configured
              </Badge>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Configuration Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            SMTP Server Settings
          </CardTitle>
          <CardDescription>
            Configure your SMTP server for sending emails. All settings are stored in the database.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Server Settings */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="smtpHost">SMTP Host</Label>
                <Input
                  id="smtpHost"
                  placeholder="smtp.example.com"
                  value={formData.smtpHost}
                  onChange={(e) => setFormData({ ...formData, smtpHost: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtpPort">Port</Label>
                <Input
                  id="smtpPort"
                  type="number"
                  placeholder="587"
                  value={formData.smtpPort}
                  onChange={(e) => setFormData({ ...formData, smtpPort: parseInt(e.target.value) || 587 })}
                  required
                />
              </div>
            </div>

            {/* Authentication */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="smtpUser">Username</Label>
                <Input
                  id="smtpUser"
                  placeholder="user@example.com"
                  value={formData.smtpUser}
                  onChange={(e) => setFormData({ ...formData, smtpUser: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtpPass">Password</Label>
                <div className="relative">
                  <Input
                    id="smtpPass"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={config?.passwordSet ? '••••••••' : 'Enter password'}
                    value={formData.smtpPass}
                    onChange={(e) => setFormData({ ...formData, smtpPass: e.target.value })}
                    required={!config?.passwordSet}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {config?.passwordSet && (
                  <p className="text-xs text-slate-500">Leave blank to keep existing password</p>
                )}
              </div>
            </div>

            {/* Security */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Use TLS/SSL
                </Label>
                <p className="text-sm text-slate-500">
                  Enable for port 465 (SSL) or STARTTLS on other ports
                </p>
              </div>
              <Switch
                checked={formData.smtpSecure}
                onCheckedChange={(checked) => setFormData({ ...formData, smtpSecure: checked })}
              />
            </div>

            {/* Sender Info */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-slate-700 dark:text-slate-300">Sender Information</h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="smtpFromName">From Name</Label>
                  <Input
                    id="smtpFromName"
                    placeholder="My Conference"
                    value={formData.smtpFromName}
                    onChange={(e) => setFormData({ ...formData, smtpFromName: e.target.value })}
                  />
                  <p className="text-xs text-slate-500">Display name for sent emails</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpFromEmail">From Email</Label>
                  <Input
                    id="smtpFromEmail"
                    type="email"
                    placeholder="noreply@example.com"
                    value={formData.smtpFromEmail}
                    onChange={(e) => setFormData({ ...formData, smtpFromEmail: e.target.value })}
                    required
                  />
                  <p className="text-xs text-slate-500">Sender email address</p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Settings'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Test Connection Card */}
      {config?.configured && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Test Email Configuration
            </CardTitle>
            <CardDescription>
              Verify your SMTP settings by testing the connection or sending a test email.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleTestConnection}
                disabled={testing}
              >
                {testing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Test Connection
                  </>
                )}
              </Button>
            </div>

            <div className="border-t pt-4">
              <Label className="text-sm font-medium mb-2 block">Send Test Email</Label>
              <div className="flex gap-3">
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="max-w-xs"
                />
                <Button
                  onClick={handleSendTestEmail}
                  disabled={sendingTest || !testEmail}
                >
                  {sendingTest ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Test
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help Text */}
      <Alert>
        <Mail className="h-4 w-4" />
        <AlertDescription>
          <strong>Common SMTP Settings:</strong>
          <ul className="mt-2 space-y-1 text-sm">
            <li>• <strong>Gmail:</strong> smtp.gmail.com, Port 587, TLS enabled, use App Password</li>
            <li>• <strong>SendGrid:</strong> smtp.sendgrid.net, Port 587, TLS enabled</li>
            <li>• <strong>Mailgun:</strong> smtp.mailgun.org, Port 587, TLS enabled</li>
            <li>• <strong>Amazon SES:</strong> email-smtp.[region].amazonaws.com, Port 587</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}
