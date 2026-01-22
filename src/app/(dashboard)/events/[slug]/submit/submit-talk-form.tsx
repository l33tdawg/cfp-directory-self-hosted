/**
 * Submit Talk Form (Client Component)
 * 
 * Form for submitting a talk to an event.
 * Supports selecting from the talks library or creating a new submission.
 * Features rich text editing, topic guidance, and audience selection.
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Loader2, Library, PenLine, Clock, Mic2, Tag, Users, Info, UserPlus, X, Mail } from 'lucide-react';
import { formatDuration, getTalkTypeLabel } from '@/lib/validations/talk';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PhotoUpload } from '@/components/ui/photo-upload';

// Dynamically import RichTextEditor to avoid SSR issues
const RichTextEditor = dynamic(
  () => import('@/components/editors/rich-text-editor').then(mod => mod.RichTextEditor),
  { 
    ssr: false,
    loading: () => <div className="h-[150px] border rounded-md animate-pulse bg-slate-100 dark:bg-slate-800" />
  }
);

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

interface CoSpeaker {
  id: string; // Local temp ID for key prop
  name: string;
  email: string;
  bio: string;
  avatarUrl: string | null;
}

interface SubmitTalkFormProps {
  eventId: string;
  eventSlug: string;
  tracks: Track[];
  formats: Format[];
  topics?: string[];
  audienceLevels?: string[];
}

export function SubmitTalkForm({ eventId, eventSlug, tracks, formats, topics = [], audienceLevels = [] }: SubmitTalkFormProps) {
  const router = useRouter();
  const api = useApi();
  const [talks, setTalks] = useState<Talk[]>([]);
  const [loadingTalks, setLoadingTalks] = useState(true);
  const [selectedTalk, setSelectedTalk] = useState<Talk | null>(null);
  const [useLibrary, setUseLibrary] = useState<boolean | null>(null);
  const [selectedAudiences, setSelectedAudiences] = useState<string[]>([]);
  const [coSpeakers, setCoSpeakers] = useState<CoSpeaker[]>([]);
  const [showCoSpeakerForm, setShowCoSpeakerForm] = useState(false);
  const [newCoSpeaker, setNewCoSpeaker] = useState({ name: '', email: '', bio: '', avatarUrl: null as string | null });
  
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
  
  // Toggle audience selection and update form
  const toggleAudience = (audience: string) => {
    setSelectedAudiences(prev => {
      const newAudiences = prev.includes(audience)
        ? prev.filter(a => a !== audience)
        : [...prev, audience];
      // Update form value with comma-separated string
      form.setValue('targetAudience', newAudiences.join(', '));
      return newAudiences;
    });
  };

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
    // Also update audience selection state
    setSelectedAudiences(talk.targetAudience);
  };

  const handleClearSelection = () => {
    setSelectedTalk(null);
    setSelectedAudiences([]);
    setCoSpeakers([]);
    form.reset();
  };
  
  const handleAddCoSpeaker = () => {
    if (!newCoSpeaker.name.trim()) {
      toast.error('Co-speaker name is required');
      return;
    }
    if (newCoSpeaker.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newCoSpeaker.email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    if (coSpeakers.length >= 10) {
      toast.error('Maximum 10 co-speakers allowed');
      return;
    }
    
    setCoSpeakers(prev => [
      ...prev,
      {
        id: `temp-${Date.now()}`,
        name: newCoSpeaker.name.trim(),
        email: newCoSpeaker.email.trim(),
        bio: newCoSpeaker.bio.trim(),
        avatarUrl: newCoSpeaker.avatarUrl,
      }
    ]);
    setNewCoSpeaker({ name: '', email: '', bio: '', avatarUrl: null });
    setShowCoSpeakerForm(false);
  };
  
  const handleRemoveCoSpeaker = (id: string) => {
    setCoSpeakers(prev => prev.filter(cs => cs.id !== id));
  };
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };
  
  const handleSubmit = async (data: SubmissionFormValues) => {
    const submitData = {
      ...data,
      eventId,
      trackId: data.trackId || undefined,
      formatId: data.formatId || undefined,
      talkId: data.talkId || undefined,
      coSpeakers: coSpeakers.length > 0 
        ? coSpeakers.map(cs => ({
            name: cs.name,
            email: cs.email || undefined,
            bio: cs.bio || undefined,
            avatarUrl: cs.avatarUrl || undefined,
          }))
        : undefined,
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

        {/* Event Topics Guidance */}
        {topics.length > 0 && (
          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-blue-800 dark:text-blue-200">
                <Tag className="h-4 w-4" />
                Topics We&apos;re Looking For
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {topics.map((topic) => (
                  <Badge key={topic} variant="secondary" className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                    {topic}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                <Info className="h-3 w-3 inline mr-1" />
                These are topics the organizers are particularly interested in for this event.
              </p>
            </CardContent>
          </Card>
        )}

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Talk Title *</FormLabel>
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
              <FormLabel>Abstract *</FormLabel>
              <FormControl>
                <RichTextEditor
                  content={field.value}
                  onChange={field.onChange}
                  placeholder="Describe your talk in detail. What will attendees learn? Use formatting to make key points stand out."
                  minLength={10}
                  maxLength={5000}
                  minHeight={180}
                  showCharacterCount
                />
              </FormControl>
              <FormDescription>
                This is what reviewers and attendees will see. Make it compelling! Use bold, lists, and links to make it readable.
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
                <RichTextEditor
                  content={field.value || ''}
                  onChange={field.onChange}
                  placeholder="A structured outline of your talk:&#10;• Introduction and hook&#10;• Main concepts&#10;• Live demo or examples&#10;• Key takeaways&#10;• Q&A"
                  maxLength={10000}
                  minHeight={150}
                  showCharacterCount
                />
              </FormControl>
              <FormDescription>
                A clear outline helps reviewers understand your talk flow and structure
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Target Audience Section */}
        <FormField
          control={form.control}
          name="targetAudience"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Target Audience (optional)
              </FormLabel>
              {audienceLevels.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {audienceLevels.map((level) => (
                      <Badge
                        key={level}
                        variant={selectedAudiences.includes(level) ? 'default' : 'outline'}
                        className="cursor-pointer transition-colors hover:bg-primary/80"
                        onClick={() => toggleAudience(level)}
                      >
                        {level}
                      </Badge>
                    ))}
                  </div>
                  <FormControl>
                    <Input
                      placeholder="Or type custom audience description..."
                      {...field}
                      className="mt-2"
                    />
                  </FormControl>
                </div>
              ) : (
                <FormControl>
                  <Input
                    placeholder="e.g., Intermediate developers, DevOps engineers, Tech leads"
                    {...field}
                  />
                </FormControl>
              )}
              <FormDescription>
                Who will benefit most from this talk? Click badges above or type your own.
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
                <RichTextEditor
                  content={field.value || ''}
                  onChange={field.onChange}
                  placeholder="List any knowledge or experience attendees should have:&#10;• Basic understanding of JavaScript&#10;• Familiarity with REST APIs&#10;• No prior experience required"
                  maxLength={2000}
                  minHeight={100}
                  showCharacterCount
                />
              </FormControl>
              <FormDescription>
                What should attendees know before attending your talk?
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Co-Speakers Section */}
        <Card className="border-dashed">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Co-Speakers (optional)
            </CardTitle>
            <CardDescription>
              Presenting with others? Add your co-speakers here.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* List of added co-speakers */}
            {coSpeakers.length > 0 && (
              <div className="space-y-2">
                {coSpeakers.map((coSpeaker) => (
                  <div 
                    key={coSpeaker.id} 
                    className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800 group"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={coSpeaker.avatarUrl || undefined} />
                      <AvatarFallback className="text-sm bg-primary/10 text-primary">
                        {getInitials(coSpeaker.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{coSpeaker.name}</p>
                      {coSpeaker.email && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {coSpeaker.email}
                        </p>
                      )}
                      {coSpeaker.bio && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {coSpeaker.bio}
                        </p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                      onClick={() => handleRemoveCoSpeaker(coSpeaker.id)}
                    >
                      <X className="h-4 w-4" />
                      <span className="sr-only">Remove</span>
                    </Button>
                  </div>
                ))}
              </div>
            )}
            
            {/* Add co-speaker form */}
            {showCoSpeakerForm ? (
              <div className="space-y-4 p-4 border rounded-lg bg-background">
                {/* Photo Upload */}
                <div className="flex justify-center">
                  <PhotoUpload
                    currentPhotoUrl={newCoSpeaker.avatarUrl}
                    name={newCoSpeaker.name || 'Co-Speaker'}
                    onPhotoChange={(url) => setNewCoSpeaker(prev => ({ ...prev, avatarUrl: url }))}
                    size="sm"
                  />
                </div>
                
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium">Name *</label>
                    <Input
                      placeholder="Co-speaker's name"
                      value={newCoSpeaker.name}
                      onChange={(e) => setNewCoSpeaker(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email (optional)</label>
                    <Input
                      type="email"
                      placeholder="email@example.com"
                      value={newCoSpeaker.email}
                      onChange={(e) => setNewCoSpeaker(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Short Bio (optional)</label>
                  <Input
                    placeholder="Brief description of the co-speaker"
                    value={newCoSpeaker.bio}
                    onChange={(e) => setNewCoSpeaker(prev => ({ ...prev, bio: e.target.value }))}
                    maxLength={200}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowCoSpeakerForm(false);
                      setNewCoSpeaker({ name: '', email: '', bio: '', avatarUrl: null });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddCoSpeaker}
                  >
                    Add Co-Speaker
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setShowCoSpeakerForm(true)}
                disabled={coSpeakers.length >= 10}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                {coSpeakers.length === 0 ? 'Add a Co-Speaker' : 'Add Another Co-Speaker'}
              </Button>
            )}
            
            {coSpeakers.length > 0 && (
              <p className="text-xs text-muted-foreground text-center">
                {coSpeakers.length} co-speaker{coSpeakers.length !== 1 ? 's' : ''} added
              </p>
            )}
          </CardContent>
        </Card>
        
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
