'use client';

/**
 * Profile Editor Component
 * 
 * Allows speakers to edit their profile after onboarding.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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

interface ProfileEditorProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  profile: {
    id: string;
    fullName?: string | null;
    bio?: string | null;
    location?: string | null;
    company?: string | null;
    position?: string | null;
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

export function ProfileEditor({ user: _user, profile }: ProfileEditorProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>(profile.expertiseTags);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(profile.languages);
  const [selectedFormats, setSelectedFormats] = useState<string[]>(profile.presentationTypes);
  const [selectedAudiences, setSelectedAudiences] = useState<string[]>(profile.audienceTypes);

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
        body: JSON.stringify(data),
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
              <div>
                <Label htmlFor="fullName">Full Name *</Label>
                <Input id="fullName" {...register('fullName')} />
                {errors.fullName && (
                  <p className="text-sm text-destructive mt-1">{errors.fullName.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="bio">Bio *</Label>
                <Textarea
                  id="bio"
                  {...register('bio')}
                  className="min-h-[120px]"
                  placeholder="Tell us about yourself..."
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
            <CardContent>
              <div className="flex flex-wrap gap-2 max-h-[300px] overflow-y-auto p-2 border rounded-lg">
                {EXPERTISE_TAGS.map((tag) => (
                  <Badge
                    key={tag}
                    variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                    className="cursor-pointer transition-colors"
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
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
                <Textarea
                  id="speakingExperience"
                  {...register('speakingExperience')}
                  className="min-h-[120px]"
                  placeholder="Describe your speaking experience..."
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
