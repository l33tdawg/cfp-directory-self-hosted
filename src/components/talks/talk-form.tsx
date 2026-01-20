'use client';

/**
 * Talk Form Component
 * 
 * Reusable form for creating and editing talks.
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
  Trash2
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  const [newTag, setNewTag] = useState('');

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

  const addTag = () => {
    const tag = newTag.trim().toLowerCase();
    if (tag && !selectedTags.includes(tag) && selectedTags.length < 10) {
      updateTags([...selectedTags, tag]);
      setNewTag('');
    } else if (selectedTags.length >= 10) {
      toast.error('Maximum 10 tags allowed');
    }
  };

  const removeTag = (tag: string) => {
    updateTags(selectedTags.filter((t) => t !== tag));
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
    } catch (error) {
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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Basic Information
          </CardTitle>
          <CardDescription>
            The core details of your talk proposal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              {...register('title')}
              placeholder="Building Scalable APIs with Node.js"
            />
            {errors.title && (
              <p className="text-sm text-destructive mt-1">{errors.title.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="abstract">Abstract *</Label>
            <Textarea
              id="abstract"
              {...register('abstract')}
              placeholder="A compelling summary of your talk (50-500 characters recommended)"
              className="min-h-[120px]"
            />
            {errors.abstract && (
              <p className="text-sm text-destructive mt-1">{errors.abstract.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="description">Extended Description</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="A longer description with more details (optional)"
              className="min-h-[100px]"
            />
          </div>

          <div>
            <Label htmlFor="outline">Talk Outline</Label>
            <Textarea
              id="outline"
              {...register('outline')}
              placeholder="1. Introduction&#10;2. Main concepts&#10;3. Demo&#10;4. Q&A"
              className="min-h-[100px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Format */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Format & Duration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Talk Type</Label>
              <Select
                value={watchedType}
                onValueChange={(value) => setValue('type', value as CreateTalkInput['type'])}
              >
                <SelectTrigger>
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
            </div>

            <div>
              <Label>Duration</Label>
              <Select
                value={watch('durationMin')?.toString()}
                onValueChange={(value) => setValue('durationMin', parseInt(value))}
              >
                <SelectTrigger>
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
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audience */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Target Audience
          </CardTitle>
          <CardDescription>
            Who is this talk designed for? (max 5)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {AUDIENCE_TYPES.map((audience) => (
              <Badge
                key={audience.value}
                variant={selectedAudiences.includes(audience.value) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => toggleAudience(audience.value)}
              >
                {audience.label}
              </Badge>
            ))}
          </div>

          <div>
            <Label htmlFor="prerequisites">Prerequisites</Label>
            <Textarea
              id="prerequisites"
              {...register('prerequisites')}
              placeholder="What should attendees know before this talk?"
              className="min-h-[80px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tags */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Tags
          </CardTitle>
          <CardDescription>
            Add keywords to help organize your talks (max 10)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Add a tag..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag();
                }
              }}
            />
            <Button type="button" variant="outline" onClick={addTag}>
              Add
            </Button>
          </div>
          {selectedTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedTags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => removeTag(tag)}
                >
                  {tag} ×
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Speaker Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Speaker Notes (Private)</CardTitle>
          <CardDescription>
            Personal notes for yourself - not shared with organizers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            {...register('speakerNotes')}
            placeholder="Reminders, talking points, etc."
            className="min-h-[100px]"
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {mode === 'edit' && talk && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleArchive}
                disabled={isLoading}
              >
                <Archive className="mr-2 h-4 w-4" />
                {talk.isArchived ? 'Restore' : 'Archive'}
              </Button>
              
              {(talk._count?.submissions ?? 0) === 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="destructive" disabled={isDeleting}>
                      <Trash2 className="mr-2 h-4 w-4" />
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

        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Save className="mr-2 h-4 w-4" />
          {mode === 'create' ? 'Create Talk' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
