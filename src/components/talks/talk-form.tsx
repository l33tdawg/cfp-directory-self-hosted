'use client';

/**
 * Talk Form Component
 * 
 * Reusable form for creating and editing talks.
 * Features rich text editing and modern, polished UI.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { 
  Loader2, 
  FileText, 
  Clock,
  Users,
  Tag,
  Save,
  Archive,
  Trash2,
  Lightbulb,
  Info,
  Sparkles,
  MessageSquare,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { RichTextEditor } from '@/components/editors/rich-text-editor';
import { TopicSelector } from '@/components/forms/topic-selector';

import {
  createTalkSchema,
  type CreateTalkInput,
  TALK_TYPES,
  TALK_TYPE_LABELS,
  DURATION_OPTIONS,
} from '@/lib/validations/talk';
import { AUDIENCE_TYPES } from '@/lib/constants/speaker-options';

interface TalkFormProps {
  talk?: {
    id: string;
    title: string;
    abstract: string;
    description?: string | null;
    outline?: string | null;
    type: string;
    durationMin: number;
    targetAudience: string[];
    prerequisites?: string | null;
    speakerNotes?: string | null;
    tags: string[];
    isArchived: boolean;
    _count?: { submissions: number };
  };
  mode: 'create' | 'edit';
}

export function TalkForm({ talk, mode }: TalkFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>(talk?.tags ?? []);
  const [selectedAudiences, setSelectedAudiences] = useState<string[]>(
    talk?.targetAudience ?? []
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateTalkInput>({
    resolver: zodResolver(createTalkSchema),
    defaultValues: {
      title: talk?.title ?? '',
      abstract: talk?.abstract ?? '',
      description: talk?.description ?? '',
      outline: talk?.outline ?? '',
      type: (talk?.type as CreateTalkInput['type']) ?? 'SESSION',
      durationMin: talk?.durationMin ?? 30,
      targetAudience: talk?.targetAudience ?? [],
      prerequisites: talk?.prerequisites ?? '',
      speakerNotes: talk?.speakerNotes ?? '',
      tags: talk?.tags ?? [],
    },
  });

  const watchedType = watch('type');

  // Sync tags with form
  const updateTags = (tags: string[]) => {
    setSelectedTags(tags);
    setValue('tags', tags);
  };

  // Sync audiences with form
  const updateAudiences = (audiences: string[]) => {
    setSelectedAudiences(audiences);
    setValue('targetAudience', audiences);
  };

  const toggleAudience = (audience: string) => {
    if (selectedAudiences.includes(audience)) {
      updateAudiences(selectedAudiences.filter((a) => a !== audience));
    } else if (selectedAudiences.length < 5) {
      updateAudiences([...selectedAudiences, audience]);
    } else {
      toast.error('Maximum 5 target audiences');
    }
  };

  const onSubmit = async (data: CreateTalkInput) => {
    setIsLoading(true);
    try {
      const url = mode === 'create' ? '/api/talks' : `/api/talks/${talk?.id}`;
      const method = mode === 'create' ? 'POST' : 'PATCH';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save talk');
      }

      const result = await response.json();
      
      toast.success(mode === 'create' ? 'Talk created!' : 'Talk updated!');
      router.push(`/talks/${result.talk.id}`);
      router.refresh();
    } catch (error) {
      console.error('Error saving talk:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save talk');
    } finally {
      setIsLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!talk) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/talks/${talk.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: !talk.isArchived }),
      });

      if (!response.ok) {
        throw new Error('Failed to update talk');
      }

      toast.success(talk.isArchived ? 'Talk restored!' : 'Talk archived!');
      router.refresh();
    } catch {
      toast.error('Failed to update talk');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!talk) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/talks/${talk.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete talk');
      }

      toast.success('Talk deleted!');
      router.push('/talks');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete talk');
    } finally {
      setIsDeleting(false);
    }
  };

  // Track abstract content for rich text
  const [abstractContent, setAbstractContent] = useState(talk?.abstract ?? '');
  const [descriptionContent, setDescriptionContent] = useState(talk?.description ?? '');
  const [outlineContent, setOutlineContent] = useState(talk?.outline ?? '');
  const [prerequisitesContent, setPrerequisitesContent] = useState(talk?.prerequisites ?? '');
  const [speakerNotesContent, setSpeakerNotesContent] = useState(talk?.speakerNotes ?? '');

  // Handle rich text changes
  const handleAbstractChange = (html: string) => {
    setAbstractContent(html);
    setValue('abstract', html);
  };

  const handleDescriptionChange = (html: string) => {
    setDescriptionContent(html);
    setValue('description', html);
  };

  const handleOutlineChange = (html: string) => {
    setOutlineContent(html);
    setValue('outline', html);
  };

  const handlePrerequisitesChange = (html: string) => {
    setPrerequisitesContent(html);
    setValue('prerequisites', html);
  };

  const handleSpeakerNotesChange = (html: string) => {
    setSpeakerNotesContent(html);
    setValue('speakerNotes', html);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Basic Info */}
      <Card className="overflow-hidden border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 border-b">
          <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
              <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            Basic Information
          </CardTitle>
          <CardDescription className="text-blue-700/70 dark:text-blue-300/70">
            The core details of your talk proposal that event organizers will see
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-base font-medium">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              {...register('title')}
              placeholder="e.g., Building Scalable APIs with Node.js"
              className="text-lg h-12"
            />
            {errors.title && (
              <p className="text-sm text-destructive mt-1">{errors.title.message}</p>
            )}
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Lightbulb className="h-3 w-3" />
              Make it specific and engaging - avoid generic titles
            </p>
          </div>

          {/* Abstract with Rich Text Editor */}
          <div className="space-y-2">
            <Label className="text-base font-medium">
              Abstract <span className="text-red-500">*</span>
            </Label>
            <RichTextEditor
              content={abstractContent}
              onChange={handleAbstractChange}
              placeholder="Write a compelling summary of your talk. What will attendees learn? Why should they attend?"
              minLength={50}
              maxLength={5000}
              minHeight={150}
              maxHeight={300}
            />
            {errors.abstract && (
              <p className="text-sm text-destructive mt-1">{errors.abstract.message}</p>
            )}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
              <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-800 dark:text-amber-200">
                <strong>Tip:</strong> The abstract is often the first thing organizers read. Start with a hook, 
                clearly state the problem you&apos;re solving, and highlight 2-3 key takeaways.
              </p>
            </div>
          </div>

          {/* Extended Description with Rich Text Editor */}
          <div className="space-y-2">
            <Label className="text-base font-medium">Extended Description</Label>
            <RichTextEditor
              content={descriptionContent}
              onChange={handleDescriptionChange}
              placeholder="Provide more details about your talk. Include background context, deeper explanations, or additional information for reviewers."
              maxLength={10000}
              minHeight={120}
              maxHeight={350}
            />
            <p className="text-xs text-muted-foreground">
              Optional. Use this for additional context that doesn&apos;t fit in the abstract.
            </p>
          </div>

          {/* Talk Outline with Rich Text Editor */}
          <div className="space-y-2">
            <Label className="text-base font-medium">Talk Outline</Label>
            <RichTextEditor
              content={outlineContent}
              onChange={handleOutlineChange}
              placeholder="Break down your talk structure. Use bullet points or numbered lists to show the flow of your presentation."
              maxLength={5000}
              minHeight={120}
              maxHeight={300}
            />
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              A clear outline helps organizers understand your talk&apos;s structure and pacing
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Format */}
      <Card className="overflow-hidden border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/50 dark:to-pink-950/50 border-b">
          <CardTitle className="flex items-center gap-2 text-purple-900 dark:text-purple-100">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
              <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            Format & Duration
          </CardTitle>
          <CardDescription className="text-purple-700/70 dark:text-purple-300/70">
            Choose the format that best suits your content
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-base font-medium">Talk Type</Label>
              <Select
                value={watchedType}
                onValueChange={(value) => setValue('type', value as CreateTalkInput['type'])}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {TALK_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {TALK_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Different events may prefer different formats
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-base font-medium">Duration</Label>
              <Select
                value={watch('durationMin')?.toString()}
                onValueChange={(value) => setValue('durationMin', parseInt(value))}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value.toString()}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Your preferred presentation length
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audience */}
      <Card className="overflow-hidden border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/50 dark:to-teal-950/50 border-b">
          <CardTitle className="flex items-center gap-2 text-emerald-900 dark:text-emerald-100">
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900">
              <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            Target Audience
          </CardTitle>
          <CardDescription className="text-emerald-700/70 dark:text-emerald-300/70">
            Help organizers match your talk to the right attendees
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="space-y-3">
            <Label className="text-base font-medium">
              Who is this talk for? <span className="text-muted-foreground font-normal">(select up to 5)</span>
            </Label>
            <div className="flex flex-wrap gap-2">
              {AUDIENCE_TYPES.map((audience) => (
                <Badge
                  key={audience.value}
                  variant={selectedAudiences.includes(audience.value) ? 'default' : 'outline'}
                  className={`cursor-pointer text-sm py-1.5 px-3 transition-all ${
                    selectedAudiences.includes(audience.value)
                      ? 'bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600'
                      : 'hover:bg-emerald-50 dark:hover:bg-emerald-950 hover:border-emerald-300'
                  }`}
                  onClick={() => toggleAudience(audience.value)}
                >
                  {audience.label}
                </Badge>
              ))}
            </div>
            {selectedAudiences.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {selectedAudiences.length}/5 selected
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-base font-medium">Prerequisites</Label>
            <RichTextEditor
              content={prerequisitesContent}
              onChange={handlePrerequisitesChange}
              placeholder="What should attendees know before this talk? List any required knowledge, tools, or experience."
              maxLength={2000}
              minHeight={100}
              maxHeight={200}
            />
            <p className="text-xs text-muted-foreground">
              Optional. Help attendees know if this talk is right for them.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Topics */}
      <Card className="overflow-hidden border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/50 dark:to-amber-950/50 border-b">
          <CardTitle className="flex items-center gap-2 text-orange-900 dark:text-orange-100">
            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900">
              <Tag className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            Topics
          </CardTitle>
          <CardDescription className="text-orange-700/70 dark:text-orange-300/70">
            Select topics that best describe your talk content
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2">
            <Label className="text-base font-medium">
              What topics does your talk cover? <span className="text-muted-foreground font-normal">(select up to 10)</span>
            </Label>
            <TopicSelector
              selectedTopics={selectedTags}
              onTopicsChange={updateTags}
              maxTopics={10}
              placeholder="Search and select topics..."
              allowCreate={false}
            />
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Lightbulb className="h-3 w-3" />
              Topics help organizers categorize your talk and match it with the right audience
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Speaker Notes */}
      <Card className="overflow-hidden border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-950/50 dark:to-gray-950/50 border-b">
          <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900">
              <MessageSquare className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            </div>
            Speaker Notes
            <Badge variant="outline" className="ml-2 font-normal text-xs">Private</Badge>
          </CardTitle>
          <CardDescription className="text-slate-700/70 dark:text-slate-300/70">
            Personal notes for yourself - these are never shared with event organizers
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <RichTextEditor
            content={speakerNotesContent}
            onChange={handleSpeakerNotesChange}
            placeholder="Reminders, talking points, reference links, or anything you want to remember about this talk..."
            maxLength={5000}
            minHeight={120}
            maxHeight={250}
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-900 dark:to-gray-900">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {mode === 'edit' && talk && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleArchive}
                    disabled={isLoading}
                    className="gap-2"
                  >
                    <Archive className="h-4 w-4" />
                    {talk.isArchived ? 'Restore' : 'Archive'}
                  </Button>
                  
                  {(talk._count?.submissions ?? 0) === 0 && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button type="button" variant="destructive" disabled={isDeleting} className="gap-2">
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this talk?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. The talk will be permanently deleted.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDelete}>
                            {isDeleting ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : null}
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </>
              )}
            </div>

            <Button 
              type="submit" 
              disabled={isLoading}
              size="lg"
              className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg min-w-[160px]"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {mode === 'create' ? 'Create Talk' : 'Save Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
