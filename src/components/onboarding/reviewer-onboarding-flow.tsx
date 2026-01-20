'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  User,
  Globe,
  Linkedin,
  Twitter,
  Github,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  ClipboardList,
  Clock,
  Target,
} from 'lucide-react';
import { PhotoUpload } from '@/components/ui/photo-upload';
import {
  REVIEWER_EXPERTISE_AREAS,
  REVIEW_CRITERIA_OPTIONS,
  HOURS_PER_WEEK_OPTIONS,
  EVENT_SIZE_OPTIONS,
} from '@/lib/constants/reviewer-options';

interface ReviewerOnboardingFlowProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
  };
}

interface FormData {
  // Step 1: Professional Info
  fullName: string;
  designation: string;
  company: string;
  bio: string;
  linkedinUrl: string;
  twitterHandle: string;
  githubUsername: string;
  websiteUrl: string;
  hasReviewedBefore: boolean;
  conferencesReviewed: string;

  // Step 2: Expertise
  expertiseAreas: string[];
  yearsOfExperience: number;

  // Step 3: Review Preferences
  reviewCriteria: string[];
  additionalNotes: string;

  // Step 4: Availability
  hoursPerWeek: string;
  preferredEventSize: string;
}

const TOTAL_STEPS = 4;

const STEPS = [
  { number: 1, title: 'Professional Info', icon: User, description: 'Tell us about yourself' },
  { number: 2, title: 'Expertise', icon: Target, description: 'Your areas of expertise' },
  { number: 3, title: 'Review Focus', icon: ClipboardList, description: 'What you look for in talks' },
  { number: 4, title: 'Availability', icon: Clock, description: 'Your time commitment' },
];

export function ReviewerOnboardingFlow({ user }: ReviewerOnboardingFlowProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormData>({
    fullName: user.name || '',
    designation: '',
    company: '',
    bio: '',
    linkedinUrl: '',
    twitterHandle: '',
    githubUsername: '',
    websiteUrl: '',
    hasReviewedBefore: false,
    conferencesReviewed: '',
    expertiseAreas: [],
    yearsOfExperience: 5,
    reviewCriteria: [],
    additionalNotes: '',
    hoursPerWeek: '2-5',
    preferredEventSize: 'any',
  });

  // Load existing data on mount
  useEffect(() => {
    async function loadExistingData() {
      try {
        const response = await fetch('/api/reviewer-profile/onboarding');
        if (response.ok) {
          const data = await response.json();
          if (data.savedData) {
            setFormData((prev) => ({
              ...prev,
              fullName: data.savedData.fullName || prev.fullName,
              designation: data.savedData.designation || '',
              company: data.savedData.company || '',
              bio: data.savedData.bio || '',
              linkedinUrl: data.savedData.linkedinUrl || '',
              twitterHandle: data.savedData.twitterHandle || '',
              githubUsername: data.savedData.githubUsername || '',
              websiteUrl: data.savedData.websiteUrl || '',
              hasReviewedBefore: data.savedData.hasReviewedBefore || false,
              conferencesReviewed: data.savedData.conferencesReviewed || '',
              expertiseAreas: data.savedData.expertiseAreas || [],
              yearsOfExperience: data.savedData.yearsOfExperience || 5,
              reviewCriteria: data.savedData.reviewCriteria || [],
              additionalNotes: data.savedData.additionalNotes || '',
              hoursPerWeek: data.savedData.hoursPerWeek || '2-5',
              preferredEventSize: data.savedData.preferredEventSize || 'any',
            }));
            setCurrentStep(data.onboardingStep || 1);
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadExistingData();
  }, []);

  const updateFormData = (field: keyof FormData, value: FormData[keyof FormData]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleArrayItem = (field: 'expertiseAreas' | 'reviewCriteria', item: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].includes(item)
        ? prev[field].filter((i) => i !== item)
        : [...prev[field], item],
    }));
  };

  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 1:
        if (!formData.fullName.trim()) {
          toast.error('Please enter your name');
          return false;
        }
        if (formData.bio.length < 50) {
          toast.error('Bio must be at least 50 characters');
          return false;
        }
        if (!formData.linkedinUrl && !formData.twitterHandle && !formData.githubUsername && !formData.websiteUrl) {
          toast.error('Please add at least one social link or website');
          return false;
        }
        return true;

      case 2:
        if (formData.expertiseAreas.length === 0) {
          toast.error('Please select at least one expertise area');
          return false;
        }
        return true;

      case 3:
        if (formData.reviewCriteria.length === 0) {
          toast.error('Please select at least one review criteria');
          return false;
        }
        return true;

      case 4:
        return true;

      default:
        return true;
    }
  };

  const saveStepProgress = async () => {
    try {
      const stepData = getStepData(currentStep);
      await fetch('/api/reviewer-profile/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: currentStep, data: stepData }),
      });
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  const getStepData = (step: number) => {
    switch (step) {
      case 1:
        return {
          fullName: formData.fullName,
          designation: formData.designation,
          company: formData.company,
          bio: formData.bio,
          photoUrl: photoUrl,
          linkedinUrl: formData.linkedinUrl,
          twitterHandle: formData.twitterHandle,
          githubUsername: formData.githubUsername,
          websiteUrl: formData.websiteUrl,
          hasReviewedBefore: formData.hasReviewedBefore,
          conferencesReviewed: formData.conferencesReviewed,
        };
      case 2:
        return {
          expertiseAreas: formData.expertiseAreas,
          yearsOfExperience: formData.yearsOfExperience,
        };
      case 3:
        return {
          reviewCriteria: formData.reviewCriteria,
          additionalNotes: formData.additionalNotes,
        };
      case 4:
        return {
          hoursPerWeek: formData.hoursPerWeek,
          preferredEventSize: formData.preferredEventSize,
        };
      default:
        return {};
    }
  };

  const handleNext = async () => {
    if (!validateCurrentStep()) return;

    await saveStepProgress();
    setCurrentStep((prev) => Math.min(prev + 1, TOTAL_STEPS));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleComplete = async () => {
    if (!validateCurrentStep()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/reviewer-profile/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 4,
          data: getStepData(4),
          complete: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to complete onboarding');
      }

      toast.success('Welcome to the review team!');
      router.push('/reviews');
      router.refresh();
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast.error('Failed to complete setup. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const progress = ((currentStep - 1) / (TOTAL_STEPS - 1)) * 100;

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">Reviewer Profile Setup</h1>
        <p className="text-muted-foreground mt-2">
          Help us understand your expertise and review preferences
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between mt-4">
          {STEPS.map((step) => {
            const Icon = step.icon;
            const isActive = currentStep === step.number;
            const isCompleted = currentStep > step.number;
            return (
              <div
                key={step.number}
                className={`flex flex-col items-center ${
                  isActive ? 'text-primary' : isCompleted ? 'text-green-600' : 'text-muted-foreground'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                    isActive
                      ? 'border-primary bg-primary/10'
                      : isCompleted
                        ? 'border-green-600 bg-green-100'
                        : 'border-muted bg-muted'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                <span className="text-xs mt-1 hidden sm:block">{step.title}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {(() => {
              const StepIcon = STEPS[currentStep - 1].icon;
              return <StepIcon className="h-5 w-5" />;
            })()}
            {STEPS[currentStep - 1].title}
          </CardTitle>
          <CardDescription>{STEPS[currentStep - 1].description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Professional Info */}
          {currentStep === 1 && (
            <>
              {/* Photo Upload */}
              <div className="flex flex-col items-center pb-4 border-b mb-4">
                <Label className="mb-4">Profile Photo</Label>
                <PhotoUpload
                  currentPhotoUrl={photoUrl}
                  name={formData.fullName || user.name || 'User'}
                  onPhotoChange={setPhotoUrl}
                  size="lg"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fullName">
                    Full Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => updateFormData('fullName', e.target.value)}
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="designation">Job Title</Label>
                  <Input
                    id="designation"
                    value={formData.designation}
                    onChange={(e) => updateFormData('designation', e.target.value)}
                    placeholder="Senior Engineer"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="company">Company / Organization</Label>
                <Input
                  id="company"
                  value={formData.company}
                  onChange={(e) => updateFormData('company', e.target.value)}
                  placeholder="Acme Inc."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">
                  Bio <span className="text-destructive">*</span>
                  <span className="text-muted-foreground text-sm ml-2">
                    (min 50 characters, {formData.bio.length}/50)
                  </span>
                </Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => updateFormData('bio', e.target.value)}
                  placeholder="Tell us about your background and why you're passionate about reviewing conference talks..."
                  rows={4}
                />
              </div>

              <div className="space-y-4">
                <Label>
                  Social Links <span className="text-destructive">*</span>
                  <span className="text-muted-foreground text-sm ml-2">(at least one required)</span>
                </Label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Linkedin className="h-4 w-4" /> LinkedIn
                    </div>
                    <Input
                      value={formData.linkedinUrl}
                      onChange={(e) => updateFormData('linkedinUrl', e.target.value)}
                      placeholder="https://linkedin.com/in/username"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Twitter className="h-4 w-4" /> Twitter
                    </div>
                    <Input
                      value={formData.twitterHandle}
                      onChange={(e) => updateFormData('twitterHandle', e.target.value)}
                      placeholder="@username"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Github className="h-4 w-4" /> GitHub
                    </div>
                    <Input
                      value={formData.githubUsername}
                      onChange={(e) => updateFormData('githubUsername', e.target.value)}
                      placeholder="username"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Globe className="h-4 w-4" /> Website
                    </div>
                    <Input
                      value={formData.websiteUrl}
                      onChange={(e) => updateFormData('websiteUrl', e.target.value)}
                      placeholder="https://yourwebsite.com"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hasReviewed"
                    checked={formData.hasReviewedBefore}
                    onCheckedChange={(checked) =>
                      updateFormData('hasReviewedBefore', checked === true)
                    }
                  />
                  <Label htmlFor="hasReviewed" className="cursor-pointer">
                    I have reviewed conference talks before
                  </Label>
                </div>
                {formData.hasReviewedBefore && (
                  <div className="space-y-2">
                    <Label htmlFor="conferences">Which conferences have you reviewed for?</Label>
                    <Textarea
                      id="conferences"
                      value={formData.conferencesReviewed}
                      onChange={(e) => updateFormData('conferencesReviewed', e.target.value)}
                      placeholder="JSConf, React Summit, etc."
                      rows={2}
                    />
                  </div>
                )}
              </div>
            </>
          )}

          {/* Step 2: Expertise */}
          {currentStep === 2 && (
            <>
              <div className="space-y-4">
                <div>
                  <Label>
                    Areas of Expertise <span className="text-destructive">*</span>
                  </Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Select the topics you feel confident reviewing. You&apos;ll be matched with submissions in these areas.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {REVIEWER_EXPERTISE_AREAS.map((area) => (
                      <Badge
                        key={area}
                        variant={formData.expertiseAreas.includes(area) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => toggleArrayItem('expertiseAreas', area)}
                      >
                        {area}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Selected: {formData.expertiseAreas.length} areas
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="experience">Years of Experience in Tech</Label>
                <Select
                  value={String(formData.yearsOfExperience)}
                  onValueChange={(v) => updateFormData('yearsOfExperience', parseInt(v))}
                >
                  <SelectTrigger id="experience">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1-2 years</SelectItem>
                    <SelectItem value="3">3-5 years</SelectItem>
                    <SelectItem value="5">5-10 years</SelectItem>
                    <SelectItem value="10">10-15 years</SelectItem>
                    <SelectItem value="15">15+ years</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Step 3: Review Preferences */}
          {currentStep === 3 && (
            <>
              <div className="space-y-4">
                <div>
                  <Label>
                    What do you focus on when reviewing? <span className="text-destructive">*</span>
                  </Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Select the criteria that matter most to you when evaluating submissions.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {REVIEW_CRITERIA_OPTIONS.map((criteria) => (
                      <div
                        key={criteria.value}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          formData.reviewCriteria.includes(criteria.value)
                            ? 'border-primary bg-primary/5'
                            : 'hover:bg-muted'
                        }`}
                        onClick={() => toggleArrayItem('reviewCriteria', criteria.value)}
                      >
                        <div className="font-medium">{criteria.label}</div>
                        <div className="text-sm text-muted-foreground">{criteria.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.additionalNotes}
                  onChange={(e) => updateFormData('additionalNotes', e.target.value)}
                  placeholder="Any other information about your review style or preferences..."
                  rows={3}
                />
              </div>
            </>
          )}

          {/* Step 4: Availability */}
          {currentStep === 4 && (
            <>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="hours">Hours per Week Available for Reviews</Label>
                  <Select
                    value={formData.hoursPerWeek}
                    onValueChange={(v) => updateFormData('hoursPerWeek', v)}
                  >
                    <SelectTrigger id="hours">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HOURS_PER_WEEK_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="eventSize">Preferred Event Size</Label>
                  <Select
                    value={formData.preferredEventSize}
                    onValueChange={(v) => updateFormData('preferredEventSize', v)}
                  >
                    <SelectTrigger id="eventSize">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EVENT_SIZE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Summary */}
              <div className="border-t pt-6 mt-6">
                <h3 className="font-semibold mb-4">Profile Summary</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name:</span>
                    <span className="font-medium">{formData.fullName}</span>
                  </div>
                  {formData.designation && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Role:</span>
                      <span>{formData.designation}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expertise Areas:</span>
                    <span>{formData.expertiseAreas.length} selected</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Review Focus:</span>
                    <span>{formData.reviewCriteria.length} criteria</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Availability:</span>
                    <span>{HOURS_PER_WEEK_OPTIONS.find(h => h.value === formData.hoursPerWeek)?.label}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <Button variant="outline" onClick={handleBack} disabled={currentStep === 1}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        {currentStep < TOTAL_STEPS ? (
          <Button onClick={handleNext}>
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleComplete} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Completing...
              </>
            ) : (
              <>
                Complete Setup
                <CheckCircle2 className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
