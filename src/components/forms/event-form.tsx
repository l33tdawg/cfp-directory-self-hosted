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

import { useState, useMemo } from 'react';
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
// Badge available if needed
// import { Badge } from '@/components/ui/badge';
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
import { RichTextEditor } from '@/components/editors/rich-text-editor';
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
  
  // Form setup - use type assertion due to schema optional fields vs required form structure
  const form = useForm({
    // @ts-expect-error - Type mismatch between Zod schema with optionals and form Partial type
    resolver: zodResolver(eventFormSchema),
    defaultValues,
    mode: 'onChange' as const,
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
    onSubmit(values as EventFormData, true);
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
          {/* Step Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between relative">
              {/* Progress Line */}
              <div className="absolute top-5 left-0 right-0 h-0.5 bg-slate-200 dark:bg-slate-700" />
              <div 
                className="absolute top-5 left-0 h-0.5 bg-blue-500 transition-all duration-300"
                style={{ 
                  width: `${(['basic', 'dates', 'location', 'cfp', 'review', 'topics'].indexOf(activeTab) / 5) * 100}%` 
                }}
              />
              
              {/* Step Items */}
              {[
                { id: 'basic', icon: Info, label: 'Basic Info', num: 1 },
                { id: 'dates', icon: CalendarDays, label: 'Dates', num: 2 },
                { id: 'location', icon: MapPin, label: 'Location', num: 3 },
                { id: 'cfp', icon: FileText, label: 'CFP', num: 4 },
                { id: 'review', icon: Star, label: 'Review', num: 5 },
                { id: 'topics', icon: Tags, label: 'Topics', num: 6 },
              ].map((step, index) => {
                const Icon = step.icon;
                const isActive = activeTab === step.id;
                const isPast = ['basic', 'dates', 'location', 'cfp', 'review', 'topics'].indexOf(activeTab) > index;
                
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setActiveTab(step.id)}
                    className="flex flex-col items-center relative z-10 group"
                  >
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200
                      ${isActive 
                        ? 'bg-blue-500 text-white ring-4 ring-blue-100 dark:ring-blue-900' 
                        : isPast 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 text-slate-400 group-hover:border-blue-400 group-hover:text-blue-500'
                      }
                    `}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className={`
                      mt-2 text-xs font-medium transition-colors hidden sm:block
                      ${isActive 
                        ? 'text-blue-600 dark:text-blue-400' 
                        : isPast
                          ? 'text-slate-700 dark:text-slate-300'
                          : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-400'
                      }
                    `}>
                      {step.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Hidden TabsList for accessibility - actual tabs controlled by buttons above */}
          <TabsList className="sr-only">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="dates">Dates</TabsTrigger>
            <TabsTrigger value="location">Location</TabsTrigger>
            <TabsTrigger value="cfp">CFP</TabsTrigger>
            <TabsTrigger value="review">Review</TabsTrigger>
            <TabsTrigger value="topics">Topics</TabsTrigger>
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
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-amber-500" />
                  Review Settings
                </CardTitle>
                <CardDescription>
                  Configure how submissions will be evaluated by your review team
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Review Type Selection - Card Style */}
                <div className="space-y-3">
                  <FormLabel className="text-base font-semibold">Review Method</FormLabel>
                  <FormField
                    control={form.control}
                    name="reviewType"
                    render={({ field }) => (
                      <FormItem>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {reviewTypeOptions.map((opt) => {
                            const isSelected = field.value === opt.value;
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => field.onChange(opt.value)}
                                className={`
                                  relative p-4 rounded-xl border-2 text-left transition-all duration-200
                                  ${isSelected 
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 ring-2 ring-blue-200 dark:ring-blue-800' 
                                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                  }
                                `}
                              >
                                {isSelected && (
                                  <div className="absolute top-3 right-3">
                                    <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                      </svg>
                                    </div>
                                  </div>
                                )}
                                <div className={`font-semibold mb-1 ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-slate-900 dark:text-white'}`}>
                                  {opt.label}
                                </div>
                                <div className="text-sm text-slate-500 dark:text-slate-400">
                                  {opt.description}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {/* Review Requirements - Side by Side */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Min Reviews */}
                  <div className="p-5 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50 border border-slate-200 dark:border-slate-700">
                    <FormField
                      control={form.control}
                      name="minReviewsPerTalk"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
                              <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                              </svg>
                            </div>
                            <FormLabel className="text-base font-semibold m-0">Minimum Reviews</FormLabel>
                          </div>
                          <FormControl>
                            <div className="flex items-center gap-3">
                              <Input
                                type="number"
                                min={1}
                                max={10}
                                className="w-20 text-center text-lg font-semibold"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 2)}
                              />
                              <span className="text-sm text-slate-500 dark:text-slate-400">
                                reviews per submission
                              </span>
                            </div>
                          </FormControl>
                          <FormDescription className="mt-2">
                            Submissions need this many reviews before decisions
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {/* Speaker Feedback */}
                  <div className="p-5 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50 border border-slate-200 dark:border-slate-700">
                    <FormField
                      control={form.control}
                      name="enableSpeakerFeedback"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                                <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                              </div>
                              <div>
                                <FormLabel className="text-base font-semibold m-0">Speaker Feedback</FormLabel>
                                <FormDescription className="mt-1">
                                  Let reviewers send feedback to speakers
                                </FormDescription>
                              </div>
                            </div>
                            <FormControl>
                              <Switch 
                                checked={field.value} 
                                onCheckedChange={field.onChange}
                                className="data-[state=checked]:bg-emerald-500"
                              />
                            </FormControl>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                
                {/* Review Criteria Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                        </svg>
                        Review Criteria
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Define scoring criteria for reviewers to evaluate submissions
                      </p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={addReviewCriteria} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add Criteria
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    {watchedValues.reviewCriteria?.map((criteria, index) => {
                      const weight = criteria?.weight ?? 3;
                      const weightColors = [
                        '', // 0 (not used)
                        'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
                        'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400',
                        'bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400',
                        'bg-orange-100 text-orange-600 dark:bg-orange-900/50 dark:text-orange-400',
                        'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400',
                      ];
                      
                      return (
                        <div 
                          key={index} 
                          className="group relative rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 overflow-hidden transition-all hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600"
                        >
                          {/* Weight indicator bar */}
                          <div 
                            className="absolute top-0 left-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 transition-all"
                            style={{ width: `${(weight / 5) * 100}%` }}
                          />
                          
                          <div className="p-4">
                            <div className="flex items-start justify-between gap-4 mb-4">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-500 dark:text-slate-400 flex-shrink-0">
                                  {index + 1}
                                </div>
                                <FormField
                                  control={form.control}
                                  name={`reviewCriteria.${index}.name`}
                                  render={({ field }) => (
                                    <FormItem className="flex-1 m-0">
                                      <FormControl>
                                        <Input 
                                          placeholder="e.g., Content Quality, Originality, Relevance..." 
                                          className="font-medium border-0 bg-transparent p-0 h-auto text-base focus-visible:ring-0 placeholder:text-slate-400"
                                          {...field} 
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </div>
                              
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${weightColors[weight]}`}>
                                  Weight: {weight}
                                </span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeReviewCriteria(index)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="md:col-span-2">
                                <FormField
                                  control={form.control}
                                  name={`reviewCriteria.${index}.description`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormControl>
                                        <Textarea
                                          placeholder="Describe what reviewers should look for..."
                                          rows={2}
                                          className="resize-none text-sm"
                                          {...field}
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </div>
                              
                              <div className="space-y-2">
                                <FormField
                                  control={form.control}
                                  name={`reviewCriteria.${index}.weight`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <div className="flex items-center justify-between mb-2">
                                        <FormLabel className="text-xs text-slate-500 dark:text-slate-400 m-0">Importance</FormLabel>
                                        <div className="flex gap-1">
                                          {[1, 2, 3, 4, 5].map((w) => (
                                            <button
                                              key={w}
                                              type="button"
                                              onClick={() => field.onChange(w)}
                                              className={`w-6 h-6 rounded text-xs font-semibold transition-all ${
                                                (field.value ?? 3) >= w
                                                  ? 'bg-amber-400 text-amber-900'
                                                  : 'bg-slate-100 dark:bg-slate-700 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                                              }`}
                                            >
                                              {w}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                      <FormControl>
                                        <Slider
                                          min={1}
                                          max={5}
                                          step={1}
                                          value={[field.value ?? 3]}
                                          onValueChange={(vals) => field.onChange(vals[0])}
                                          className="mt-1"
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {(!watchedValues.reviewCriteria || watchedValues.reviewCriteria.length === 0) && (
                    <div className="text-center py-8 px-4 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30">
                      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-3">
                        <Star className="h-6 w-6 text-slate-400" />
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 mb-3">No review criteria defined yet</p>
                      <Button type="button" variant="outline" size="sm" onClick={addReviewCriteria}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Your First Criteria
                      </Button>
                    </div>
                  )}
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
