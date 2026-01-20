/**
 * Submit Talk Form (Client Component)
 * 
 * Form for submitting a talk to an event.
 * Supports selecting from the talks library or creating a new submission.
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { Loader2, Library, PenLine, Clock, Mic2 } from 'lucide-react';
import { formatDuration, getTalkTypeLabel } from '@/lib/validations/talk';

const submissionFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  abstract: z.string().min(10, 'Abstract must be at least 10 characters').max(5000),
  outline: z.string().max(10000).optional(),
  targetAudience: z.string().max(500).optional(),
  prerequisites: z.string().max(2000).optional(),
  trackId: z.string().optional(),
  formatId: z.string().optional(),
  talkId: z.string().optional(),
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

interface Talk {
  id: string;
  title: string;
  abstract: string;
  outline?: string | null;
  type: string;
  durationMin: number;
  targetAudience: string[];
  prerequisites?: string | null;
  tags: string[];
  _count?: { submissions: number };
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
  const [talks, setTalks] = useState<Talk[]>([]);
  const [loadingTalks, setLoadingTalks] = useState(true);
  const [selectedTalk, setSelectedTalk] = useState<Talk | null>(null);
  const [useLibrary, setUseLibrary] = useState<boolean | null>(null);
  
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
      talkId: '',
    },
  });

  // Fetch user's talks from library
  useEffect(() => {
    async function fetchTalks() {
      try {
        const response = await fetch('/api/talks?includeArchived=false&limit=50');
        if (response.ok) {
          const data = await response.json();
          setTalks(data.talks || []);
        }
      } catch (error) {
        console.error('Error fetching talks:', error);
      } finally {
        setLoadingTalks(false);
      }
    }
    fetchTalks();
  }, []);

  // When a talk is selected from library, populate the form
  const handleSelectTalk = (talk: Talk) => {
    setSelectedTalk(talk);
    form.setValue('title', talk.title);
    form.setValue('abstract', talk.abstract);
    form.setValue('outline', talk.outline || '');
    form.setValue('targetAudience', talk.targetAudience.join(', '));
    form.setValue('prerequisites', talk.prerequisites || '');
    form.setValue('talkId', talk.id);
  };

  const handleClearSelection = () => {
    setSelectedTalk(null);
    form.reset();
  };
  
  const handleSubmit = async (data: SubmissionFormValues) => {
    const submitData = {
      ...data,
      eventId,
      trackId: data.trackId || undefined,
      formatId: data.formatId || undefined,
      talkId: data.talkId || undefined,
    };
    
    const { data: submission, error } = await api.post(`/api/events/${eventId}/submissions`, submitData);
    
    if (error) {
      return;
    }
    
    toast.success('Submission received! Good luck!');
    router.push(`/events/${eventSlug}/submissions/${(submission as { id: string }).id}`);
  };

  // Initial choice: use library or write new
  if (useLibrary === null && !loadingTalks) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card 
            className={`cursor-pointer transition-all hover:border-primary ${talks.length === 0 ? 'opacity-50' : ''}`}
            onClick={() => talks.length > 0 && setUseLibrary(true)}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Library className="h-5 w-5" />
                From My Talks
              </CardTitle>
              <CardDescription>
                {talks.length > 0 
                  ? `Select from ${talks.length} saved talk${talks.length !== 1 ? 's' : ''}`
                  : 'No saved talks yet'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Reuse a talk from your library. Great for submitting the same talk to multiple events.
              </p>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer transition-all hover:border-primary"
            onClick={() => setUseLibrary(false)}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PenLine className="h-5 w-5" />
                Write New
              </CardTitle>
              <CardDescription>
                Create a new submission from scratch
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Write a fresh talk proposal specifically for this event.
              </p>
            </CardContent>
          </Card>
        </div>

        {talks.length === 0 && (
          <p className="text-sm text-muted-foreground text-center">
            <Link href="/talks/new" className="text-primary hover:underline">
              Create talks in your library
            </Link>
            {' '}to easily reuse them across events.
          </p>
        )}
      </div>
    );
  }

  // Loading state
  if (loadingTalks) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Select from library
  if (useLibrary && !selectedTalk) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Select a Talk</h3>
          <Button variant="ghost" size="sm" onClick={() => setUseLibrary(null)}>
            ← Back
          </Button>
        </div>
        
        <div className="grid gap-3">
          {talks.map((talk) => (
            <Card 
              key={talk.id}
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => handleSelectTalk(talk)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{talk.title}</CardTitle>
                  <Badge variant="outline" className="text-xs">
                    {getTalkTypeLabel(talk.type as import('@/lib/validations/talk').TalkType)}
                  </Badge>
                </div>
                <CardDescription className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDuration(talk.durationMin)}
                  </span>
                  <span>
                    {talk._count?.submissions || 0} submission{(talk._count?.submissions || 0) !== 1 ? 's' : ''}
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {talk.abstract}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Back button and selected talk indicator */}
        {useLibrary !== null && (
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="sm" type="button" onClick={handleClearSelection}>
              ← {selectedTalk ? 'Change Talk' : 'Back'}
            </Button>
            {selectedTalk && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Mic2 className="h-3 w-3" />
                From: {selectedTalk.title.substring(0, 30)}...
              </Badge>
            )}
          </div>
        )}

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
