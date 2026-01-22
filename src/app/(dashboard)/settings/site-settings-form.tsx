/**
 * Site Settings Form (Client Component)
 * 
 * Form for updating organization/site settings including registration settings.
 */

'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useApi } from '@/hooks/use-api';
import { toast } from 'sonner';
import { Loader2, UserPlus, Building2 } from 'lucide-react';

const siteSettingsFormSchema = z.object({
  name: z.string().min(1, 'Site name is required').max(200),
  description: z.string().max(2000).optional(),
  websiteUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  logoUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  contactEmail: z.string().email('Must be a valid email').optional().or(z.literal('')),
  supportUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  allowPublicSignup: z.boolean(),
});

type SiteSettingsFormValues = z.infer<typeof siteSettingsFormSchema>;

interface SiteSettings {
  id: string;
  name: string;
  description?: string | null;
  websiteUrl?: string | null;
  logoUrl?: string | null;
  contactEmail?: string | null;
  supportUrl?: string | null;
  allowPublicSignup?: boolean;
}

interface SiteSettingsFormProps {
  settings: SiteSettings;
}

export function SiteSettingsForm({ settings }: SiteSettingsFormProps) {
  const router = useRouter();
  const api = useApi();
  
  const form = useForm<SiteSettingsFormValues>({
    resolver: zodResolver(siteSettingsFormSchema),
    defaultValues: {
      name: settings.name,
      description: settings.description || '',
      websiteUrl: settings.websiteUrl || '',
      logoUrl: settings.logoUrl || '',
      contactEmail: settings.contactEmail || '',
      supportUrl: settings.supportUrl || '',
      allowPublicSignup: settings.allowPublicSignup ?? false,
    },
  });
  
  const handleSubmit = async (data: SiteSettingsFormValues) => {
    const { error } = await api.patch('/api/settings', data);
    
    if (error) {
      return;
    }
    
    toast.success('Settings updated successfully');
    router.refresh();
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        {/* Organization Info Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5" />
              Organization Info
            </CardTitle>
            <CardDescription>
              Basic information about your organization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization Name</FormLabel>
                  <FormControl>
                    <Input placeholder="My Conference Organization" {...field} />
                  </FormControl>
                  <FormDescription>
                    This appears in the header and emails
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
        
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="A brief description of your organization..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
        
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="websiteUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website URL</FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        placeholder="https://yourconference.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
          
              <FormField
                control={form.control}
                name="logoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Logo URL</FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        placeholder="https://..."
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Direct URL to your logo image
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
        
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="contactEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="contact@yourconference.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="supportUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Support URL</FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        placeholder="https://yourconference.com/support"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>
        
        {/* Registration Settings Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserPlus className="h-5 w-5" />
              Registration Settings
            </CardTitle>
            <CardDescription>
              Control how users can register for accounts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="allowPublicSignup"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      Allow Speaker Self-Registration
                    </FormLabel>
                    <FormDescription>
                      When enabled, speakers can create accounts at /auth/signup to submit talks.
                      When disabled, all users (including speakers) must be invited by an admin.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            
            <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-4 text-sm text-slate-600 dark:text-slate-400">
              <p className="font-medium text-slate-900 dark:text-slate-100 mb-2">
                How registration works:
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Speakers</strong> can self-register (if enabled above) or be invited</li>
                <li><strong>Reviewers, Organizers, and Admins</strong> must always be invited</li>
                <li>Use the <Link href="/admin/users" className="text-blue-600 hover:underline">User Management</Link> page to send invitations</li>
              </ul>
            </div>
          </CardContent>
        </Card>
        
        <div className="flex justify-end">
          <Button type="submit" disabled={api.isLoading}>
            {api.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </form>
    </Form>
  );
}
