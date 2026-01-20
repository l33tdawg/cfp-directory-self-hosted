'use client';

/**
 * Speaker Onboarding Flow Component
 * 
 * A 4-step onboarding flow for new speakers:
 * 1. Basic Information & Social Links
 * 2. Speaking Experience & Expertise
 * 3. Preferences & Requirements (optional)
 * 4. Terms & Conditions
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
  ChevronRight,
  ChevronLeft,
  Check,
  Settings,
  FileText,
  Loader2,
  Tag
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { PhotoUpload } from '@/components/ui/photo-upload';

import {
  basicInfoSchema,
  speakingExperienceSchema,
  preferencesSchema,
  validateSocialLinks,
  type BasicInfoData,
  type SpeakingExperienceData,
  type PreferencesData,
} from '@/lib/validations/speaker-profile';
import {
  EXPERTISE_TAGS,
  LANGUAGES,
  EXPERIENCE_LEVELS,
  SESSION_FORMATS,
  AUDIENCE_TYPES,
} from '@/lib/constants/speaker-options';

interface SpeakerOnboardingFlowProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  existingProfile?: {
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
    expertiseTags?: string[];
    speakingExperience?: string | null;
    experienceLevel?: string | null;
    languages?: string[];
    presentationTypes?: string[];
    audienceTypes?: string[];
    willingToTravel?: boolean;
    travelRequirements?: string | null;
    virtualEventExperience?: boolean;
    techRequirements?: string | null;
    onboardingStep?: number;
  } | null;
}

const TOTAL_STEPS = 4;

export function SpeakerOnboardingFlow({ user, existingProfile }: SpeakerOnboardingFlowProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(existingProfile?.onboardingStep ?? 1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(
    existingProfile?.photoUrl ?? user.image ?? null
  );

  // Step 1: Basic Info
  const basicInfoForm = useForm<BasicInfoData>({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: {
      fullName: existingProfile?.fullName ?? user.name ?? '',
      bio: existingProfile?.bio ?? '',
      location: existingProfile?.location ?? '',
      company: existingProfile?.company ?? '',
      position: existingProfile?.position ?? '',
      websiteUrl: existingProfile?.websiteUrl ?? '',
      linkedinUrl: existingProfile?.linkedinUrl ?? '',
      twitterHandle: existingProfile?.twitterHandle ?? '',
      githubUsername: existingProfile?.githubUsername ?? '',
    },
  });

  // Step 2: Speaking Experience
  const [selectedTags, setSelectedTags] = useState<string[]>(
    existingProfile?.expertiseTags ?? []
  );
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(
    existingProfile?.languages ?? ['English']
  );
  const speakingForm = useForm<SpeakingExperienceData>({
    resolver: zodResolver(speakingExperienceSchema),
    defaultValues: {
      expertiseTags: existingProfile?.expertiseTags ?? [],
      speakingExperience: existingProfile?.speakingExperience ?? '',
      experienceLevel: existingProfile?.experienceLevel as SpeakingExperienceData['experienceLevel'],
      languages: existingProfile?.languages ?? ['English'],
    },
  });

  // Step 3: Preferences
  const [selectedFormats, setSelectedFormats] = useState<string[]>(
    existingProfile?.presentationTypes ?? []
  );
  const [selectedAudiences, setSelectedAudiences] = useState<string[]>(
    existingProfile?.audienceTypes ?? []
  );
  const preferencesForm = useForm<PreferencesData>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      presentationTypes: existingProfile?.presentationTypes ?? [],
      audienceTypes: existingProfile?.audienceTypes ?? [],
      willingToTravel: existingProfile?.willingToTravel ?? false,
      travelRequirements: existingProfile?.travelRequirements ?? '',
      virtualEventExperience: existingProfile?.virtualEventExperience ?? false,
      techRequirements: existingProfile?.techRequirements ?? '',
    },
  });

  // Sync selected tags with form
  useEffect(() => {
    speakingForm.setValue('expertiseTags', selectedTags);
  }, [selectedTags, speakingForm]);

  useEffect(() => {
    speakingForm.setValue('languages', selectedLanguages);
  }, [selectedLanguages, speakingForm]);

  useEffect(() => {
    preferencesForm.setValue('presentationTypes', selectedFormats);
  }, [selectedFormats, preferencesForm]);

  useEffect(() => {
    preferencesForm.setValue('audienceTypes', selectedAudiences);
  }, [selectedAudiences, preferencesForm]);

  // Save progress to API
  const saveStepProgress = async (step: number, data: Record<string, unknown>) => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/speaker-profile/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step, data }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save progress');
      }

      return true;
    } catch (error) {
      console.error('Error saving progress:', error);
      toast.error('Failed to save progress');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Handle step 1 next
  const handleStep1Next = async () => {
    const isValid = await basicInfoForm.trigger();
    if (!isValid) return;

    const data = basicInfoForm.getValues();
    
    // Validate at least one social link
    if (!validateSocialLinks(data)) {
      toast.error('Please provide at least one social link (LinkedIn, Twitter, GitHub, or Website)');
      return;
    }

    // Include photoUrl in the data
    const saved = await saveStepProgress(1, { ...data, photoUrl });
    if (saved) {
      setCurrentStep(2);
    }
  };

  // Handle step 2 next
  const handleStep2Next = async () => {
    if (selectedTags.length === 0) {
      toast.error('Please select at least one area of expertise');
      return;
    }

    const isValid = await speakingForm.trigger();
    if (!isValid) return;

    const data = speakingForm.getValues();
    const saved = await saveStepProgress(2, data);
    if (saved) {
      setCurrentStep(3);
    }
  };

  // Handle step 3 next
  const handleStep3Next = async () => {
    const data = preferencesForm.getValues();
    const saved = await saveStepProgress(3, data);
    if (saved) {
      setCurrentStep(4);
    }
  };

  // Handle complete onboarding
  const handleComplete = async () => {
    if (!termsAccepted) {
      toast.error('Please accept the terms and conditions');
      return;
    }

    setIsLoading(true);
    try {
      const basicInfo = basicInfoForm.getValues();
      const speakingInfo = speakingForm.getValues();
      const preferences = preferencesForm.getValues();

      const response = await fetch('/api/speaker-profile/onboarding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...basicInfo,
          ...speakingInfo,
          ...preferences,
          photoUrl,
          termsAccepted: true,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to complete onboarding');
      }

      toast.success('Profile created successfully!', {
        description: 'Welcome! You can now submit talks to events.',
      });

      router.push('/dashboard');
      router.refresh();
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to complete onboarding');
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle tag selection
  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else if (selectedTags.length < 25) {
      setSelectedTags([...selectedTags, tag]);
    } else {
      toast.error('Maximum 25 expertise tags allowed');
    }
  };

  // Toggle language selection
  const toggleLanguage = (lang: string) => {
    if (selectedLanguages.includes(lang)) {
      if (selectedLanguages.length > 1) {
        setSelectedLanguages(selectedLanguages.filter(l => l !== lang));
      } else {
        toast.error('You must select at least one language');
      }
    } else if (selectedLanguages.length < 5) {
      setSelectedLanguages([...selectedLanguages, lang]);
    } else {
      toast.error('Maximum 5 languages allowed');
    }
  };

  // Toggle format selection
  const toggleFormat = (format: string) => {
    if (selectedFormats.includes(format)) {
      setSelectedFormats(selectedFormats.filter(f => f !== format));
    } else if (selectedFormats.length < 6) {
      setSelectedFormats([...selectedFormats, format]);
    } else {
      toast.error('Maximum 6 presentation types allowed');
    }
  };

  // Toggle audience selection
  const toggleAudience = (audience: string) => {
    if (selectedAudiences.includes(audience)) {
      setSelectedAudiences(selectedAudiences.filter(a => a !== audience));
    } else if (selectedAudiences.length < 8) {
      setSelectedAudiences([...selectedAudiences, audience]);
    } else {
      toast.error('Maximum 8 audience types allowed');
    }
  };

  const getStepIcon = () => {
    switch (currentStep) {
      case 1: return <User className="h-5 w-5" />;
      case 2: return <Mic className="h-5 w-5" />;
      case 3: return <Settings className="h-5 w-5" />;
      case 4: return <FileText className="h-5 w-5" />;
      default: return null;
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return 'Basic Information';
      case 2: return 'Speaking Experience';
      case 3: return 'Preferences & Requirements';
      case 4: return 'Terms & Conditions';
      default: return '';
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case 1: return 'Tell us about yourself and add your social links';
      case 2: return 'Share your speaking experience and areas of expertise';
      case 3: return 'Set your preferences for speaking engagements (optional)';
      case 4: return 'Review and accept our terms to complete setup';
      default: return '';
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">
            Step {currentStep} of {TOTAL_STEPS}
          </span>
          <span className="text-sm text-muted-foreground">
            {Math.round((currentStep / TOTAL_STEPS) * 100)}% Complete
          </span>
        </div>
        <Progress value={(currentStep / TOTAL_STEPS) * 100} className="h-2" />
      </div>

      {/* Step indicators */}
      <div className="flex justify-center mb-8">
        <div className="flex items-center space-x-4">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-medium transition-colors ${
                  step < currentStep
                    ? 'bg-green-500 text-white'
                    : step === currentStep
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {step < currentStep ? <Check className="h-5 w-5" /> : step}
              </div>
              {step < TOTAL_STEPS && (
                <div
                  className={`w-12 h-1 ml-4 ${
                    step < currentStep ? 'bg-green-500' : 'bg-muted'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              {getStepIcon()}
            </div>
            <div>
              <CardTitle>{getStepTitle()}</CardTitle>
              <CardDescription>{getStepDescription()}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className="space-y-4">
              {/* Photo Upload */}
              <div className="flex flex-col items-center pb-4 border-b">
                <Label className="mb-4">Profile Photo</Label>
                <PhotoUpload
                  currentPhotoUrl={photoUrl}
                  name={basicInfoForm.watch('fullName') || user.name || 'User'}
                  onPhotoChange={setPhotoUrl}
                  size="lg"
                />
              </div>

              <div>
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  {...basicInfoForm.register('fullName')}
                  placeholder="John Doe"
                />
                {basicInfoForm.formState.errors.fullName && (
                  <p className="text-sm text-destructive mt-1">
                    {basicInfoForm.formState.errors.fullName.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="bio">Bio *</Label>
                <Textarea
                  id="bio"
                  {...basicInfoForm.register('bio')}
                  placeholder="Tell us about yourself and your background (minimum 50 characters)"
                  className="min-h-[120px]"
                />
                {basicInfoForm.formState.errors.bio && (
                  <p className="text-sm text-destructive mt-1">
                    {basicInfoForm.formState.errors.bio.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="location">Location *</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="location"
                      {...basicInfoForm.register('location')}
                      placeholder="City, Country"
                      className="pl-10"
                    />
                  </div>
                  {basicInfoForm.formState.errors.location && (
                    <p className="text-sm text-destructive mt-1">
                      {basicInfoForm.formState.errors.location.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="company">Company</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="company"
                      {...basicInfoForm.register('company')}
                      placeholder="Your company"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="position">Job Title</Label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="position"
                      {...basicInfoForm.register('position')}
                      placeholder="Your position"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="websiteUrl">Website</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="websiteUrl"
                      type="url"
                      {...basicInfoForm.register('websiteUrl')}
                      placeholder="https://yourwebsite.com"
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              {/* Social Links */}
              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Social Links (at least one required) *
                </h4>
                <p className="text-xs text-muted-foreground mb-4">
                  Provide at least one way for event organizers to verify your identity
                </p>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="linkedinUrl">LinkedIn Profile</Label>
                    <div className="relative">
                      <Linkedin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="linkedinUrl"
                        type="url"
                        {...basicInfoForm.register('linkedinUrl')}
                        placeholder="https://linkedin.com/in/username"
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="twitterHandle">Twitter/X Handle</Label>
                    <div className="relative">
                      <Twitter className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="twitterHandle"
                        {...basicInfoForm.register('twitterHandle')}
                        placeholder="@username"
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="githubUsername">GitHub Username</Label>
                    <div className="relative">
                      <Github className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="githubUsername"
                        {...basicInfoForm.register('githubUsername')}
                        placeholder="username"
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Speaking Experience */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <Label className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Areas of Expertise *
                </Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Select up to 25 topics you can speak about ({selectedTags.length}/25)
                </p>
                <div className="flex flex-wrap gap-2 p-4 border rounded-lg max-h-[200px] overflow-y-auto">
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
                {speakingForm.formState.errors.expertiseTags && (
                  <p className="text-sm text-destructive mt-1">
                    {speakingForm.formState.errors.expertiseTags.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="speakingExperience">Speaking Experience *</Label>
                <Textarea
                  id="speakingExperience"
                  {...speakingForm.register('speakingExperience')}
                  placeholder="Describe your experience as a speaker, including notable events, audience sizes, and achievements (minimum 50 characters)"
                  className="min-h-[120px]"
                />
                {speakingForm.formState.errors.speakingExperience && (
                  <p className="text-sm text-destructive mt-1">
                    {speakingForm.formState.errors.speakingExperience.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="experienceLevel">Experience Level</Label>
                  <Select
                    value={speakingForm.watch('experienceLevel') ?? ''}
                    onValueChange={(value) => speakingForm.setValue('experienceLevel', value as SpeakingExperienceData['experienceLevel'])}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your level" />
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
            </div>
          )}

          {/* Step 3: Preferences */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <Label>Presentation Types ({selectedFormats.length}/6)</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  What types of presentations are you comfortable delivering?
                </p>
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
              </div>

              <div>
                <Label>Target Audiences ({selectedAudiences.length}/8)</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  What audiences do you typically speak to?
                </p>
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
              </div>

              <div className="space-y-3 pt-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="willingToTravel"
                    checked={preferencesForm.watch('willingToTravel')}
                    onCheckedChange={(checked) => 
                      preferencesForm.setValue('willingToTravel', checked === true)
                    }
                  />
                  <Label htmlFor="willingToTravel" className="flex items-center gap-2 cursor-pointer">
                    <Plane className="h-4 w-4" />
                    Willing to travel for speaking engagements
                  </Label>
                </div>

                {preferencesForm.watch('willingToTravel') && (
                  <div className="ml-6">
                    <Label htmlFor="travelRequirements">Travel Requirements</Label>
                    <Textarea
                      id="travelRequirements"
                      {...preferencesForm.register('travelRequirements')}
                      placeholder="e.g., Business class for flights over 5 hours, specific dietary requirements"
                      className="min-h-[80px]"
                    />
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="virtualEventExperience"
                    checked={preferencesForm.watch('virtualEventExperience')}
                    onCheckedChange={(checked) => 
                      preferencesForm.setValue('virtualEventExperience', checked === true)
                    }
                  />
                  <Label htmlFor="virtualEventExperience" className="flex items-center gap-2 cursor-pointer">
                    <Monitor className="h-4 w-4" />
                    Experience with virtual/online events
                  </Label>
                </div>

                {preferencesForm.watch('virtualEventExperience') && (
                  <div className="ml-6">
                    <Label htmlFor="techRequirements">Technical Requirements</Label>
                    <Textarea
                      id="techRequirements"
                      {...preferencesForm.register('techRequirements')}
                      placeholder="e.g., High-speed internet, professional microphone, webcam"
                      className="min-h-[80px]"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Terms */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Almost done!</h3>
                <p className="text-sm text-muted-foreground">
                  Please review and accept our terms to complete your registration
                </p>
              </div>

              <div className="bg-muted rounded-lg p-6 max-h-96 overflow-y-auto border">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <h4 className="text-base font-semibold mb-3">Speaker Agreement</h4>
                  
                  <p className="mb-3">
                    By creating a speaker profile, you agree to the following:
                  </p>

                  <h5 className="font-medium mt-4 mb-2">1. Profile Information</h5>
                  <p className="mb-3 text-sm">
                    You agree to provide accurate and truthful information in your speaker profile.
                  </p>

                  <h5 className="font-medium mt-4 mb-2">2. Content Ownership</h5>
                  <p className="mb-3 text-sm">
                    You retain ownership of all content you submit. By creating a profile, you grant 
                    this platform a license to display your information to event organizers.
                  </p>

                  <h5 className="font-medium mt-4 mb-2">3. Professional Conduct</h5>
                  <p className="mb-3 text-sm">
                    You agree to maintain professional conduct when interacting with event organizers 
                    and other speakers through the platform.
                  </p>

                  <h5 className="font-medium mt-4 mb-2">4. Privacy and Data</h5>
                  <p className="mb-3 text-sm">
                    Your profile information will be visible to event organizers searching for speakers.
                    You can control visibility through your profile settings.
                  </p>

                  <div className="mt-6 text-sm">
                    <p>
                      For complete details, please read our{' '}
                      <Link href="/terms" className="text-primary hover:underline" target="_blank">
                        Terms of Service
                      </Link>{' '}
                      and{' '}
                      <Link href="/privacy" className="text-primary hover:underline" target="_blank">
                        Privacy Policy
                      </Link>
                      .
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="termsAccepted"
                    checked={termsAccepted}
                    onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                  />
                  <Label htmlFor="termsAccepted" className="text-sm cursor-pointer">
                    I have read and agree to the{' '}
                    <Link href="/terms" className="text-primary hover:underline" target="_blank">
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link href="/privacy" className="text-primary hover:underline" target="_blank">
                      Privacy Policy
                    </Link>
                  </Label>
                </div>
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
              disabled={currentStep === 1 || isLoading || isSaving}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            {currentStep < TOTAL_STEPS ? (
              <Button
                onClick={
                  currentStep === 1 ? handleStep1Next :
                  currentStep === 2 ? handleStep2Next :
                  handleStep3Next
                }
                disabled={isLoading || isSaving}
              >
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleComplete}
                disabled={isLoading || !termsAccepted}
              >
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Complete Profile
                <Check className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
