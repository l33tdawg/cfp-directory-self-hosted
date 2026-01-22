'use client';

/**
 * Profile Editor Component
 * 
 * Allows speakers to edit their profile after onboarding.
 * 
 * Features:
 * - Rich text editors for bio and speaking experience
 * - Topics loaded from database for expertise selection
 * - Photo upload for profile picture
 * - PII encryption handled by the API
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { 
  User, 
  MapPin, 
  Building2, 
  Briefcase, 
  Globe, 
  Linkedin, 
  Twitter, 
  Github,
  Mic,
  Languages,
  Plane,
  Monitor,
  Save,
  Loader2,
  Tag
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { PhotoUpload } from '@/components/ui/photo-upload';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { speakerProfileSchema, type SpeakerProfileData } from '@/lib/validations/speaker-profile';
import {
  EXPERTISE_TAGS,
  LANGUAGES,
  EXPERIENCE_LEVELS,
  SESSION_FORMATS,
  AUDIENCE_TYPES,
} from '@/lib/constants/speaker-options';

// Dynamic import for RichTextEditor to avoid SSR issues
const RichTextEditor = dynamic(
  () => import('@/components/editors/rich-text-editor').then(mod => mod.RichTextEditor),
  { 
    ssr: false,
    loading: () => <Skeleton className="h-[150px] w-full" />
  }
);

// Topic type from API
interface Topic {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  isActive: boolean;
}

interface ProfileEditorProps {
  profile: {
    id: string;
    fullName?: string | null;
    bio?: string | null;
    location?: string | null;
    company?: string | null;
    position?: string | null;
    photoUrl?: string | null;
    websiteUrl?: string | null;
    linkedinUrl?: string | null;
    twitterHandle?: string | null;
    githubUsername?: string | null;
    expertiseTags: string[];
    speakingExperience?: string | null;
    experienceLevel?: string | null;
    languages: string[];
    presentationTypes: string[];
    audienceTypes: string[];
    willingToTravel: boolean;
    travelRequirements?: string | null;
    virtualEventExperience: boolean;
    techRequirements?: string | null;
  };
}

export function ProfileEditor({ profile }: ProfileEditorProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>(profile.expertiseTags);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(profile.languages);
  const [selectedFormats, setSelectedFormats] = useState<string[]>(profile.presentationTypes);
  const [selectedAudiences, setSelectedAudiences] = useState<string[]>(profile.audienceTypes);
  const [photoUrl, setPhotoUrl] = useState<string | null>(profile.photoUrl ?? null);
  
  // Topics from database
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [topicsError, setTopicsError] = useState<string | null>(null);
  const [topicCategories, setTopicCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Fetch topics from database
  const fetchTopics = useCallback(async () => {
    try {
      setTopicsLoading(true);
      setTopicsError(null);
      const response = await fetch('/api/topics?limit=500');
      if (!response.ok) {
        throw new Error('Failed to fetch topics');
      }
      const data = await response.json();
      setTopics(data.topics || []);
      setTopicCategories(data.categories || []);
    } catch (error) {
      console.error('Error fetching topics:', error);
      setTopicsError('Failed to load topics. Using fallback list.');
      // Fallback to static tags if API fails
      setTopics(EXPERTISE_TAGS.map((tag, idx) => ({ 
        id: `fallback-${idx}`, 
        name: tag, 
        category: null, 
        description: null,
        isActive: true 
      })));
    } finally {
      setTopicsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTopics();
  }, [fetchTopics]);

  // Get filtered topics based on category selection
  const filteredTopics = selectedCategory
    ? topics.filter(t => t.category === selectedCategory)
    : topics;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<SpeakerProfileData>({
    resolver: zodResolver(speakerProfileSchema),
    defaultValues: {
      fullName: profile.fullName ?? '',
      bio: profile.bio ?? '',
      location: profile.location ?? '',
      company: profile.company ?? '',
      position: profile.position ?? '',
      websiteUrl: profile.websiteUrl ?? '',
      linkedinUrl: profile.linkedinUrl ?? '',
      twitterHandle: profile.twitterHandle ?? '',
      githubUsername: profile.githubUsername ?? '',
      expertiseTags: profile.expertiseTags,
      speakingExperience: profile.speakingExperience ?? '',
      experienceLevel: profile.experienceLevel as SpeakerProfileData['experienceLevel'],
      languages: profile.languages,
      presentationTypes: profile.presentationTypes,
      audienceTypes: profile.audienceTypes,
      willingToTravel: profile.willingToTravel,
      travelRequirements: profile.travelRequirements ?? '',
      virtualEventExperience: profile.virtualEventExperience,
      techRequirements: profile.techRequirements ?? '',
    },
  });

  // Sync arrays with form
  const syncArrayField = (field: keyof SpeakerProfileData, values: string[]) => {
    setValue(field, values as never, { shouldDirty: true });
  };

  const toggleTag = (tag: string) => {
    const newTags = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : selectedTags.length < 25 ? [...selectedTags, tag] : selectedTags;
    
    if (!selectedTags.includes(tag) && selectedTags.length >= 25) {
      toast.error('Maximum 25 expertise tags');
      return;
    }
    setSelectedTags(newTags);
    syncArrayField('expertiseTags', newTags);
  };

  const toggleLanguage = (lang: string) => {
    if (selectedLanguages.includes(lang)) {
      if (selectedLanguages.length <= 1) {
        toast.error('Select at least one language');
        return;
      }
      const newLangs = selectedLanguages.filter(l => l !== lang);
      setSelectedLanguages(newLangs);
      syncArrayField('languages', newLangs);
    } else if (selectedLanguages.length < 5) {
      const newLangs = [...selectedLanguages, lang];
      setSelectedLanguages(newLangs);
      syncArrayField('languages', newLangs);
    } else {
      toast.error('Maximum 5 languages');
    }
  };

  const toggleFormat = (format: string) => {
    const newFormats = selectedFormats.includes(format)
      ? selectedFormats.filter(f => f !== format)
      : selectedFormats.length < 6 ? [...selectedFormats, format] : selectedFormats;
    
    if (!selectedFormats.includes(format) && selectedFormats.length >= 6) {
      toast.error('Maximum 6 presentation types');
      return;
    }
    setSelectedFormats(newFormats);
    syncArrayField('presentationTypes', newFormats);
  };

  const toggleAudience = (audience: string) => {
    const newAudiences = selectedAudiences.includes(audience)
      ? selectedAudiences.filter(a => a !== audience)
      : selectedAudiences.length < 8 ? [...selectedAudiences, audience] : selectedAudiences;
    
    if (!selectedAudiences.includes(audience) && selectedAudiences.length >= 8) {
      toast.error('Maximum 8 audience types');
      return;
    }
    setSelectedAudiences(newAudiences);
    syncArrayField('audienceTypes', newAudiences);
  };

  const onSubmit = async (data: SpeakerProfileData) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/speaker-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          photoUrl,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update profile');
      }

      toast.success('Profile updated successfully!');
      router.refresh();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Tabs defaultValue="basic" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="experience">Experience</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        {/* Basic Info Tab */}
        <TabsContent value="basic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Photo Upload */}
              <div className="flex flex-col items-center pb-4 border-b">
                <Label className="mb-4">Profile Photo</Label>
                <PhotoUpload
                  currentPhotoUrl={photoUrl}
                  name={watch('fullName') || 'User'}
                  onPhotoChange={setPhotoUrl}
                  size="lg"
                />
              </div>

              <div>
                <Label htmlFor="fullName">Full Name *</Label>
                <Input id="fullName" {...register('fullName')} />
                {errors.fullName && (
                  <p className="text-sm text-destructive mt-1">{errors.fullName.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="bio">Bio *</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Tell us about yourself and your background. Use formatting to highlight key achievements.
                </p>
                <RichTextEditor
                  content={watch('bio') || ''}
                  onChange={(content) => setValue('bio', content, { shouldValidate: true, shouldDirty: true })}
                  placeholder="Tell us about yourself and your background (minimum 50 characters)"
                  minLength={50}
                  maxLength={5000}
                  minHeight={120}
                  showToolbar={true}
                  showCharacterCount={true}
                />
                {errors.bio && (
                  <p className="text-sm text-destructive mt-1">{errors.bio.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="location">Location *</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="location" {...register('location')} className="pl-10" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="company">Company</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="company" {...register('company')} className="pl-10" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="position">Job Title</Label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="position" {...register('position')} className="pl-10" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="websiteUrl">Website</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="websiteUrl" type="url" {...register('websiteUrl')} className="pl-10" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Social Links</CardTitle>
              <CardDescription>At least one social link required</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="linkedinUrl">LinkedIn</Label>
                <div className="relative">
                  <Linkedin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input id="linkedinUrl" type="url" {...register('linkedinUrl')} className="pl-10" />
                </div>
              </div>

              <div>
                <Label htmlFor="twitterHandle">Twitter/X</Label>
                <div className="relative">
                  <Twitter className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input id="twitterHandle" {...register('twitterHandle')} className="pl-10" placeholder="@username" />
                </div>
              </div>

              <div>
                <Label htmlFor="githubUsername">GitHub</Label>
                <div className="relative">
                  <Github className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input id="githubUsername" {...register('githubUsername')} className="pl-10" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Experience Tab */}
        <TabsContent value="experience" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Areas of Expertise
              </CardTitle>
              <CardDescription>Select up to 25 topics ({selectedTags.length}/25)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Category filter */}
              {topicCategories.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant={selectedCategory === null ? 'default' : 'outline'}
                    className="cursor-pointer transition-colors"
                    onClick={() => setSelectedCategory(null)}
                  >
                    All Topics
                  </Badge>
                  {topicCategories.map((cat) => (
                    <Badge
                      key={cat}
                      variant={selectedCategory === cat ? 'default' : 'outline'}
                      className="cursor-pointer transition-colors"
                      onClick={() => setSelectedCategory(cat)}
                    >
                      {cat}
                    </Badge>
                  ))}
                </div>
              )}
              
              {topicsLoading ? (
                <div className="flex flex-wrap gap-2 p-4 border rounded-lg">
                  {[...Array(20)].map((_, i) => (
                    <Skeleton key={i} className="h-6 w-20" />
                  ))}
                </div>
              ) : topicsError ? (
                <p className="text-sm text-amber-600 dark:text-amber-400">{topicsError}</p>
              ) : null}
              
              <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto p-2 border rounded-lg">
                {filteredTopics.map((topic) => (
                  <Badge
                    key={topic.id}
                    variant={selectedTags.includes(topic.name) ? 'default' : 'outline'}
                    className="cursor-pointer transition-colors"
                    onClick={() => toggleTag(topic.name)}
                    title={topic.description || undefined}
                  >
                    {topic.name}
                  </Badge>
                ))}
                {filteredTopics.length === 0 && !topicsLoading && (
                  <p className="text-sm text-muted-foreground">No topics found in this category.</p>
                )}
              </div>
              
              {/* Selected tags display */}
              {selectedTags.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground">Selected ({selectedTags.length}):</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedTags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="cursor-pointer text-xs"
                        onClick={() => toggleTag(tag)}
                      >
                        {tag} ×
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mic className="h-5 w-5" />
                Speaking Experience
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="speakingExperience">Experience Description *</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Describe your experience as a speaker. Include notable events, audience sizes, and achievements.
                </p>
                <RichTextEditor
                  content={watch('speakingExperience') || ''}
                  onChange={(content) => setValue('speakingExperience', content, { shouldValidate: true, shouldDirty: true })}
                  placeholder="Describe your speaking experience, including notable events, audience sizes, and achievements (minimum 50 characters)"
                  minLength={50}
                  maxLength={5000}
                  minHeight={120}
                  showToolbar={true}
                  showCharacterCount={true}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Experience Level</Label>
                  <Select
                    value={watch('experienceLevel') ?? ''}
                    onValueChange={(value) => setValue('experienceLevel', value as SpeakerProfileData['experienceLevel'], { shouldDirty: true })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPERIENCE_LEVELS.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="flex items-center gap-2">
                    <Languages className="h-4 w-4" />
                    Languages ({selectedLanguages.length}/5)
                  </Label>
                  <div className="flex flex-wrap gap-2 p-3 border rounded-lg max-h-[100px] overflow-y-auto mt-1">
                    {LANGUAGES.map((lang) => (
                      <Badge
                        key={lang}
                        variant={selectedLanguages.includes(lang) ? 'default' : 'outline'}
                        className="cursor-pointer text-xs"
                        onClick={() => toggleLanguage(lang)}
                      >
                        {lang}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Presentation Types</CardTitle>
              <CardDescription>Select up to 6 ({selectedFormats.length}/6)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {SESSION_FORMATS.map((format) => (
                  <div
                    key={format.value}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedFormats.includes(format.value)
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-muted'
                    }`}
                    onClick={() => toggleFormat(format.value)}
                  >
                    <p className="font-medium text-sm">{format.label}</p>
                    <p className="text-xs text-muted-foreground">{format.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Target Audiences</CardTitle>
              <CardDescription>Select up to 8 ({selectedAudiences.length}/8)</CardDescription>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Travel & Virtual</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="willingToTravel"
                  checked={watch('willingToTravel')}
                  onCheckedChange={(checked) => setValue('willingToTravel', checked === true, { shouldDirty: true })}
                />
                <Label htmlFor="willingToTravel" className="flex items-center gap-2 cursor-pointer">
                  <Plane className="h-4 w-4" />
                  Willing to travel for speaking engagements
                </Label>
              </div>

              {watch('willingToTravel') && (
                <div className="ml-6">
                  <Label htmlFor="travelRequirements">Travel Requirements</Label>
                  <Textarea
                    id="travelRequirements"
                    {...register('travelRequirements')}
                    className="min-h-[80px]"
                    placeholder="e.g., Business class for long flights..."
                  />
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="virtualEventExperience"
                  checked={watch('virtualEventExperience')}
                  onCheckedChange={(checked) => setValue('virtualEventExperience', checked === true, { shouldDirty: true })}
                />
                <Label htmlFor="virtualEventExperience" className="flex items-center gap-2 cursor-pointer">
                  <Monitor className="h-4 w-4" />
                  Experience with virtual/online events
                </Label>
              </div>

              {watch('virtualEventExperience') && (
                <div className="ml-6">
                  <Label htmlFor="techRequirements">Technical Requirements</Label>
                  <Textarea
                    id="techRequirements"
                    {...register('techRequirements')}
                    className="min-h-[80px]"
                    placeholder="e.g., High-speed internet, professional microphone..."
                  />
                </div>
              )}
            </CardContent>
          </Card>

        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end mt-6">
        <Button type="submit" disabled={isLoading || !isDirty}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Save className="mr-2 h-4 w-4" />
          Save Changes
        </Button>
      </div>
    </form>
  );
}
