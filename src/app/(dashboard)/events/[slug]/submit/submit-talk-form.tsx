/**
 * Submit Talk Form (Client Component)
 * 
 * Form for submitting a talk to an event.
 */

'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useApi } from '@/hooks/use-api';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const submissionFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  abstract: z.string().min(10, 'Abstract must be at least 10 characters').max(5000),
  outline: z.string().max(10000).optional(),
  targetAudience: z.string().max(500).optional(),
  prerequisites: z.string().max(2000).optional(),
  trackId: z.string().optional(),
  formatId: z.string().optional(),
});

type SubmissionFormValues = z.infer<typeof submissionFormSchema>;

interface Track {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
}

interface Format {
  id: string;
  name: string;
  durationMin: number;
}

interface SubmitTalkFormProps {
  eventId: string;
  eventSlug: string;
  tracks: Track[];
  formats: Format[];
}

export function SubmitTalkForm({ eventId, eventSlug, tracks, formats }: SubmitTalkFormProps) {
  const router = useRouter();
  const api = useApi();
  
  const form = useForm<SubmissionFormValues>({
    resolver: zodResolver(submissionFormSchema),
    defaultValues: {
      title: '',
      abstract: '',
      outline: '',
      targetAudience: '',
      prerequisites: '',
      trackId: '',
      formatId: '',
    },
  });
  
  const handleSubmit = async (data: SubmissionFormValues) => {
    const submitData = {
      ...data,
      eventId,
      trackId: data.trackId || undefined,
      formatId: data.formatId || undefined,
    };
    
    const { data: submission, error } = await api.post(`/api/events/${eventId}/submissions`, submitData);
    
    if (error) {
      return;
    }
    
    toast.success('Submission received! Good luck!');
    router.push(`/events/${eventSlug}/submissions/${(submission as { id: string }).id}`);
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Talk Title</FormLabel>
              <FormControl>
                <Input
                  placeholder="An engaging title for your talk"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Make it clear and compelling
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tracks.length > 0 && (
            <FormField
              control={form.control}
              name="trackId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Track</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a track (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {tracks.map((track) => (
                        <SelectItem key={track.id} value={track.id}>
                          <div className="flex items-center gap-2">
                            {track.color && (
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: track.color }}
                              />
                            )}
                            {track.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          
          {formats.length > 0 && (
            <FormField
              control={form.control}
              name="formatId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Session Format</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a format (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {formats.map((format) => (
                        <SelectItem key={format.id} value={format.id}>
                          {format.name} ({format.durationMin} minutes)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>
        
        <FormField
          control={form.control}
          name="abstract"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Abstract</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe your talk in detail. What will attendees learn?"
                  className="min-h-[150px]"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                This is what reviewers and attendees will see. Make it compelling!
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="outline"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Talk Outline (optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="A rough outline of your talk structure..."
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Helps reviewers understand your talk flow
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="targetAudience"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Target Audience (optional)</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., Intermediate developers, DevOps engineers"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Who will benefit most from this talk?
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="prerequisites"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Prerequisites (optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Any knowledge or experience attendees should have..."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end gap-4 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={api.isLoading}>
            {api.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Talk
          </Button>
        </div>
      </form>
    </Form>
  );
}
