'use client';

/**
 * Comprehensive Event Form
 * 
 * 6-tab form for creating and editing events with:
 * - Basic Info (name, description, website, event type)
 * - Dates (start/end, times, timezone)
 * - Location (venue, address, city, country, virtual)
 * - CFP (dates, guidelines, speaker benefits, talk formats)
 * - Review (type, criteria, settings)
 * - Topics (topic selector, audience levels)
 */

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, addDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { toast } from 'sonner';
import {
  Info,
  CalendarDays,
  MapPin,
  FileText,
  Star,
  Tags,
  Plus,
  X,
  Loader2,
  Save,
  Send,
} from 'lucide-react';
import { RichTextEditor, extractTextFromHtml } from '@/components/editors/rich-text-editor';
import { TopicSelector } from '@/components/forms/topic-selector';
import {
  countries,
  eventTypeOptions,
  audienceLevelOptions,
  talkLengthOptions,
  timeOptions,
  reviewTypeOptions,
  defaultTalkFormats,
  defaultReviewCriteria,
} from '@/lib/constants';
import { getTimezoneOptions, getCurrentTimezoneWithOffset } from '@/lib/timezone-utils';

// =============================================================================
// FORM SCHEMA
// =============================================================================

const eventFormSchema = z.object({
  // Basic Info
  name: z.string().min(2, 'Event name must be at least 2 characters').max(200),
  description: z.string().optional(),
  websiteUrl: z.string().url('Please enter a valid URL').or(z.literal('')).optional(),
  eventType: z.string().default('conference'),
  
  // Dates
  startDate: z.string(),
  endDate: z.string(),
  startTime: z.string().default('09:00'),
  endTime: z.string().default('17:00'),
  timezone: z.string(),
  
  // Location
  venueName: z.string().optional(),
  venueAddress: z.string().optional(),
  venueCity: z.string().optional(),
  country: z.string().default('US'),
  isVirtual: z.boolean().default(false),
  virtualUrl: z.string().url('Please enter a valid URL').or(z.literal('')).optional(),
  
  // CFP
  cfpOpensAt: z.string().optional(),
  cfpClosesAt: z.string().optional(),
  cfpStartTime: z.string().default('09:00'),
  cfpEndTime: z.string().default('17:00'),
  cfpGuidelines: z.string().optional(),
  speakerBenefits: z.string().optional(),
  talkFormats: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    durationMin: z.number(),
  })).optional(),
  notifyOnNewSubmission: z.boolean().default(true),
  notifyOnNewReview: z.boolean().default(false),
  
  // Review
  reviewType: z.string().default('scoring'),
  minReviewsPerTalk: z.number().default(2),
  enableSpeakerFeedback: z.boolean().default(false),
  reviewCriteria: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    weight: z.number().min(1).max(5),
  })).optional(),
  
  // Topics
  topics: z.array(z.string()).optional(),
  audienceLevel: z.array(z.string()).default([]),
});

type EventFormData = z.infer<typeof eventFormSchema>;

// =============================================================================
// TYPES
// =============================================================================

interface EventFormProps {
  mode: 'create' | 'edit';
  event?: Partial<EventFormData> & { id?: string; slug?: string; status?: string };
  onSuccess?: (event: { id: string; slug: string }) => void;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function EventForm({ mode, event, onSuccess }: EventFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  
  // Get timezone options
  const timezoneOptions = useMemo(() => getTimezoneOptions(), []);
  const currentTimezone = useMemo(() => getCurrentTimezoneWithOffset(), []);
  
  // Default values
  const defaultValues = useMemo<Partial<EventFormData>>(() => {
    const startDate = addDays(new Date(), 30);
    const cfpStartDate = new Date();
    const cfpEndDate = addDays(new Date(), 14);
    
    return {
      name: event?.name || '',
      description: event?.description || '',
      websiteUrl: event?.websiteUrl || '',
      eventType: event?.eventType || 'conference',
      startDate: event?.startDate || format(startDate, 'yyyy-MM-dd'),
      endDate: event?.endDate || format(addDays(startDate, 1), 'yyyy-MM-dd'),
      startTime: event?.startTime || '09:00',
      endTime: event?.endTime || '17:00',
      timezone: event?.timezone || currentTimezone.value,
      venueName: event?.venueName || '',
      venueAddress: event?.venueAddress || '',
      venueCity: event?.venueCity || '',
      country: event?.country || 'US',
      isVirtual: event?.isVirtual || false,
      virtualUrl: event?.virtualUrl || '',
      cfpOpensAt: event?.cfpOpensAt || format(cfpStartDate, 'yyyy-MM-dd'),
      cfpClosesAt: event?.cfpClosesAt || format(cfpEndDate, 'yyyy-MM-dd'),
      cfpStartTime: event?.cfpStartTime || '09:00',
      cfpEndTime: event?.cfpEndTime || '23:59',
      cfpGuidelines: event?.cfpGuidelines || '',
      speakerBenefits: event?.speakerBenefits || '',
      talkFormats: event?.talkFormats || defaultTalkFormats,
      notifyOnNewSubmission: event?.notifyOnNewSubmission ?? true,
      notifyOnNewReview: event?.notifyOnNewReview ?? false,
      reviewType: event?.reviewType || 'scoring',
      minReviewsPerTalk: event?.minReviewsPerTalk || 2,
      enableSpeakerFeedback: event?.enableSpeakerFeedback || false,
      reviewCriteria: event?.reviewCriteria || defaultReviewCriteria,
      topics: event?.topics || [],
      audienceLevel: event?.audienceLevel || [],
    };
  }, [event, currentTimezone.value]);
  
  // Form setup
  const form = useForm<EventFormData>({
    resolver: zodResolver(eventFormSchema),
    defaultValues,
    mode: 'onChange',
  });
  
  const watchedValues = form.watch();
  
  // Check if form is valid for publishing
  const isFormValidForPublishing = useMemo(() => {
    const hasBasicFields = !!(
      watchedValues.name?.trim() &&
      watchedValues.startDate &&
      watchedValues.endDate
    );
    
    const hasCFPFields = !!(
      watchedValues.cfpOpensAt &&
      watchedValues.cfpClosesAt
    );
    
    return hasBasicFields && hasCFPFields;
  }, [watchedValues]);
  
  // ==========================================================================
  // HANDLERS
  // ==========================================================================
  
  const onSubmit = async (values: EventFormData, isDraft: boolean = false) => {
    const submitAction = isDraft ? setIsSavingDraft : setIsSubmitting;
    submitAction(true);
    
    try {
      // Build CFP dates with times
      let cfpStartAt = null;
      let cfpEndAt = null;
      
      if (values.cfpOpensAt && values.cfpStartTime) {
        cfpStartAt = new Date(`${values.cfpOpensAt}T${values.cfpStartTime}:00`);
      }
      if (values.cfpClosesAt && values.cfpEndTime) {
        cfpEndAt = new Date(`${values.cfpClosesAt}T${values.cfpEndTime}:00`);
      }
      
      // Prepare event data
      const eventData = {
        name: values.name,
        description: values.description,
        websiteUrl: values.websiteUrl || null,
        eventType: values.eventType,
        startDate: values.startDate ? new Date(values.startDate).toISOString() : null,
        endDate: values.endDate ? new Date(values.endDate).toISOString() : null,
        startTime: values.startTime,
        endTime: values.endTime,
        timezone: values.timezone,
        venueName: values.venueName || null,
        venueAddress: values.venueAddress || null,
        venueCity: values.venueCity || null,
        country: values.country,
        isVirtual: values.isVirtual,
        virtualUrl: values.virtualUrl || null,
        cfpOpensAt: cfpStartAt?.toISOString() || null,
        cfpClosesAt: cfpEndAt?.toISOString() || null,
        cfpStartTime: values.cfpStartTime,
        cfpEndTime: values.cfpEndTime,
        cfpGuidelines: values.cfpGuidelines || null,
        speakerBenefits: values.speakerBenefits || null,
        talkFormats: values.talkFormats || [],
        notifyOnNewSubmission: values.notifyOnNewSubmission,
        notifyOnNewReview: values.notifyOnNewReview,
        reviewType: values.reviewType,
        minReviewsPerTalk: values.minReviewsPerTalk,
        enableSpeakerFeedback: values.enableSpeakerFeedback,
        reviewCriteria: values.reviewCriteria || [],
        topics: values.topics || [],
        audienceLevel: values.audienceLevel || [],
        status: isDraft ? 'DRAFT' : 'PUBLISHED',
      };
      
      // API call
      const endpoint = mode === 'create' ? '/api/events' : `/api/events/${event?.id}`;
      const method = mode === 'create' ? 'POST' : 'PATCH';
      
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save event');
      }
      
      const data = await response.json();
      
      toast.success(
        isDraft ? 'Draft saved successfully' : 'Event published successfully',
        {
          description: isDraft 
            ? 'You can continue editing later' 
            : 'Your event is now visible',
        }
      );
      
      if (onSuccess) {
        onSuccess(data);
      } else {
        router.push(`/events/${data.slug}`);
      }
    } catch (error) {
      console.error('Error saving event:', error);
      toast.error('Failed to save event', {
        description: error instanceof Error ? error.message : 'Please try again',
      });
    } finally {
      submitAction(false);
    }
  };
  
  const saveDraft = () => {
    const values = form.getValues();
    onSubmit(values, true);
  };
  
  // Talk format handlers
  const addTalkFormat = () => {
    const currentFormats = form.getValues('talkFormats') || [];
    form.setValue('talkFormats', [
      ...currentFormats,
      { name: '', description: '', durationMin: talkLengthOptions[2].value },
    ]);
  };
  
  const removeTalkFormat = (index: number) => {
    const currentFormats = form.getValues('talkFormats') || [];
    form.setValue('talkFormats', currentFormats.filter((_, i) => i !== index));
  };
  
  // Review criteria handlers
  const addReviewCriteria = () => {
    const currentCriteria = form.getValues('reviewCriteria') || [];
    form.setValue('reviewCriteria', [
      ...currentCriteria,
      { name: '', description: '', weight: 3 },
    ]);
  };
  
  const removeReviewCriteria = (index: number) => {
    const currentCriteria = form.getValues('reviewCriteria') || [];
    form.setValue('reviewCriteria', currentCriteria.filter((_, i) => i !== index));
  };
  
  // ==========================================================================
  // RENDER
  // ==========================================================================
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => onSubmit(data, false))} className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-6 gap-2 mb-6">
            <TabsTrigger value="basic" className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              <span className="hidden sm:inline">Basic</span>
            </TabsTrigger>
            <TabsTrigger value="dates" className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              <span className="hidden sm:inline">Dates</span>
            </TabsTrigger>
            <TabsTrigger value="location" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span className="hidden sm:inline">Location</span>
            </TabsTrigger>
            <TabsTrigger value="cfp" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">CFP</span>
            </TabsTrigger>
            <TabsTrigger value="review" className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              <span className="hidden sm:inline">Review</span>
            </TabsTrigger>
            <TabsTrigger value="topics" className="flex items-center gap-2">
              <Tags className="h-4 w-4" />
              <span className="hidden sm:inline">Topics</span>
            </TabsTrigger>
          </TabsList>
          
          {/* ================================================================ */}
          {/* BASIC INFO TAB */}
          {/* ================================================================ */}
          <TabsContent value="basic">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>
                  General information about your event
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="SecurityCon 2026" {...field} />
                      </FormControl>
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
                        <RichTextEditor
                          content={field.value || ''}
                          onChange={field.onChange}
                          placeholder="Describe your event - what makes it special, who should attend..."
                          minHeight={120}
                          maxHeight={400}
                          minLength={50}
                          maxLength={5000}
                        />
                      </FormControl>
                      <FormDescription>
                        A compelling description helps attract speakers and attendees
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="websiteUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://securitycon.example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="eventType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select event type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {eventTypeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* ================================================================ */}
          {/* DATES TAB */}
          {/* ================================================================ */}
          <TabsContent value="dates">
            <Card>
              <CardHeader>
                <CardTitle>Event Dates & Times</CardTitle>
                <CardDescription>
                  When does your event take place?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="startTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Time</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select time" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-[200px]">
                            {timeOptions.map((time) => (
                              <SelectItem key={time} value={time}>{time}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Date *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="endTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Time</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select time" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-[200px]">
                            {timeOptions.map((time) => (
                              <SelectItem key={time} value={time}>{time}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="timezone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Timezone</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select timezone" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-[300px]">
                          {timezoneOptions.map((tz) => (
                            <SelectItem key={tz.value} value={tz.value}>
                              {tz.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* ================================================================ */}
          {/* LOCATION TAB */}
          {/* ================================================================ */}
          <TabsContent value="location">
            <Card>
              <CardHeader>
                <CardTitle>Event Location</CardTitle>
                <CardDescription>
                  Where will your event take place?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="venueName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Venue Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Conference Center" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="venueAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street Address</FormLabel>
                      <FormControl>
                        <Input placeholder="123 Main Street" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="venueCity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input placeholder="San Francisco" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select country" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-[300px]">
                            {countries.map((country) => (
                              <SelectItem key={country.value} value={country.value}>
                                {country.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="isVirtual"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Virtual Event</FormLabel>
                        <FormDescription>
                          Is this a virtual or hybrid event?
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
                
                {watchedValues.isVirtual && (
                  <FormField
                    control={form.control}
                    name="virtualUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Virtual Event URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://zoom.us/j/..." {...field} />
                        </FormControl>
                        <FormDescription>
                          Link to the virtual event platform
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* ================================================================ */}
          {/* CFP TAB */}
          {/* ================================================================ */}
          <TabsContent value="cfp">
            <Card>
              <CardHeader>
                <CardTitle>Call for Papers</CardTitle>
                <CardDescription>
                  Configure your CFP settings and speaker information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* CFP Dates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="cfpOpensAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CFP Opens</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="cfpStartTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Open Time</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select time" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-[200px]">
                            {timeOptions.map((time) => (
                              <SelectItem key={time} value={time}>{time}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="cfpClosesAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CFP Closes</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="cfpEndTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Close Time</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select time" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-[200px]">
                            {timeOptions.map((time) => (
                              <SelectItem key={time} value={time}>{time}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {/* CFP Guidelines */}
                <FormField
                  control={form.control}
                  name="cfpGuidelines"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CFP Guidelines</FormLabel>
                      <FormControl>
                        <RichTextEditor
                          content={field.value || ''}
                          onChange={field.onChange}
                          placeholder="What should speakers know when submitting? Topics you're looking for, requirements..."
                          minHeight={120}
                          maxHeight={400}
                          minLength={50}
                          maxLength={3000}
                        />
                      </FormControl>
                      <FormDescription>
                        Clear guidelines help speakers submit better proposals
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Speaker Benefits */}
                <FormField
                  control={form.control}
                  name="speakerBenefits"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Speaker Benefits</FormLabel>
                      <FormControl>
                        <RichTextEditor
                          content={field.value || ''}
                          onChange={field.onChange}
                          placeholder="What do speakers get? Travel support, accommodation, conference tickets..."
                          minHeight={100}
                          maxHeight={300}
                          minLength={30}
                          maxLength={2000}
                        />
                      </FormControl>
                      <FormDescription>
                        Highlighting benefits attracts quality submissions
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Talk Formats */}
                <div className="space-y-4">
                  <div>
                    <FormLabel>Talk Formats</FormLabel>
                    <FormDescription>
                      Define the types of sessions speakers can submit
                    </FormDescription>
                  </div>
                  
                  {watchedValues.talkFormats?.map((_, index) => (
                    <div key={index} className="rounded-lg border p-4 space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium">Format {index + 1}</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTalkFormat(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name={`talkFormats.${index}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Technical Talk" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name={`talkFormats.${index}.durationMin`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Duration</FormLabel>
                              <Select
                                onValueChange={(v) => field.onChange(parseInt(v))}
                                value={field.value?.toString()}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Duration" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {talkLengthOptions.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value.toString()}>
                                      {opt.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name={`talkFormats.${index}.description`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Input placeholder="Optional description" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  ))}
                  
                  <Button type="button" variant="outline" size="sm" onClick={addTalkFormat}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Talk Format
                  </Button>
                </div>
                
                {/* Notification Settings */}
                <div className="space-y-4 pt-4 border-t">
                  <FormLabel>Notifications</FormLabel>
                  
                  <FormField
                    control={form.control}
                    name="notifyOnNewSubmission"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">New Submission Alerts</FormLabel>
                          <FormDescription>
                            Email notification when a new submission is received
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="notifyOnNewReview"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">New Review Alerts</FormLabel>
                          <FormDescription>
                            Email notification when a review is submitted
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* ================================================================ */}
          {/* REVIEW TAB */}
          {/* ================================================================ */}
          <TabsContent value="review">
            <Card>
              <CardHeader>
                <CardTitle>Review Settings</CardTitle>
                <CardDescription>
                  Configure how submissions will be reviewed
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="reviewType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Review Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select review type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {reviewTypeOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              <div>
                                <div className="font-medium">{opt.label}</div>
                                <div className="text-xs text-muted-foreground">{opt.description}</div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="minReviewsPerTalk"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minimum Reviews Per Submission</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={10}
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 2)}
                        />
                      </FormControl>
                      <FormDescription>
                        Number of reviews required before a decision
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="enableSpeakerFeedback"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Speaker Feedback</FormLabel>
                        <FormDescription>
                          Allow reviewers to provide feedback to speakers
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                {/* Review Criteria */}
                <div className="space-y-4 pt-4 border-t">
                  <div>
                    <FormLabel>Review Criteria</FormLabel>
                    <FormDescription>
                      Define criteria reviewers will use to evaluate submissions
                    </FormDescription>
                  </div>
                  
                  {watchedValues.reviewCriteria?.map((_, index) => (
                    <div key={index} className="rounded-lg border p-4 space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium">Criteria {index + 1}</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeReviewCriteria(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-4">
                        <FormField
                          control={form.control}
                          name={`reviewCriteria.${index}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Criteria Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Content Quality" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name={`reviewCriteria.${index}.description`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="How should reviewers evaluate this criteria?"
                                  rows={2}
                                  {...field}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name={`reviewCriteria.${index}.weight`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Weight: {field.value}</FormLabel>
                              <FormControl>
                                <Slider
                                  min={1}
                                  max={5}
                                  step={1}
                                  value={[field.value]}
                                  onValueChange={(vals) => field.onChange(vals[0])}
                                />
                              </FormControl>
                              <FormDescription>
                                Higher weight = more important criteria
                              </FormDescription>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  ))}
                  
                  <Button type="button" variant="outline" size="sm" onClick={addReviewCriteria}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Review Criteria
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* ================================================================ */}
          {/* TOPICS TAB */}
          {/* ================================================================ */}
          <TabsContent value="topics">
            <Card>
              <CardHeader>
                <CardTitle>Topics & Audience</CardTitle>
                <CardDescription>
                  Categorize your event and specify target audience
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="topics"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Topics</FormLabel>
                      <FormControl>
                        <TopicSelector
                          selectedTopics={field.value || []}
                          onTopicsChange={field.onChange}
                          maxTopics={50}
                          placeholder="Select topics relevant to your event..."
                        />
                      </FormControl>
                      <FormDescription>
                        Select topics that match your event&apos;s focus areas
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="audienceLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Audience</FormLabel>
                      <FormDescription>
                        Select the experience levels this event is aimed at
                      </FormDescription>
                      <div className="space-y-2 mt-2">
                        {audienceLevelOptions.map((level) => (
                          <div key={level.value} className="flex items-center space-x-2">
                            <Checkbox
                              id={`audience-${level.value}`}
                              checked={(field.value || []).includes(level.value)}
                              onCheckedChange={(checked) => {
                                const current = field.value || [];
                                if (checked) {
                                  field.onChange([...current, level.value]);
                                } else {
                                  field.onChange(current.filter((v: string) => v !== level.value));
                                }
                              }}
                            />
                            <label
                              htmlFor={`audience-${level.value}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {level.label}
                            </label>
                          </div>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {/* ================================================================== */}
        {/* FORM ACTIONS */}
        {/* ================================================================== */}
        <div className="flex justify-between pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting || isSavingDraft}
          >
            Cancel
          </Button>
          
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={saveDraft}
              disabled={isSubmitting || isSavingDraft}
            >
              {isSavingDraft && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>
            
            <Button
              type="submit"
              disabled={isSubmitting || isSavingDraft || !isFormValidForPublishing}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Send className="h-4 w-4 mr-2" />
              {mode === 'create' ? 'Create Event' : 'Update Event'}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}

export default EventForm;
