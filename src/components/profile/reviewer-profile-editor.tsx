'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
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
  Loader2,
  Save,
  Target,
  Clock,
  Eye,
} from 'lucide-react';
import {
  REVIEWER_EXPERTISE_AREAS,
  REVIEW_CRITERIA_OPTIONS,
  HOURS_PER_WEEK_OPTIONS,
  EVENT_SIZE_OPTIONS,
} from '@/lib/constants/reviewer-options';

interface ReviewerProfileData {
  id: string;
  fullName: string;
  designation?: string | null;
  company?: string | null;
  bio?: string | null;
  photoUrl?: string | null;
  linkedinUrl?: string | null;
  twitterHandle?: string | null;
  githubUsername?: string | null;
  websiteUrl?: string | null;
  hasReviewedBefore: boolean;
  conferencesReviewed?: string | null;
  expertiseAreas: string[];
  yearsOfExperience?: number | null;
  reviewCriteria: string[];
  additionalNotes?: string | null;
  hoursPerWeek?: string | null;
  preferredEventSize?: string | null;
  showOnTeamPage: boolean;
}

interface ReviewerProfileEditorProps {
  profile: ReviewerProfileData;
}

export function ReviewerProfileEditor({ profile }: ReviewerProfileEditorProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    fullName: profile.fullName,
    designation: profile.designation || '',
    company: profile.company || '',
    bio: profile.bio || '',
    linkedinUrl: profile.linkedinUrl || '',
    twitterHandle: profile.twitterHandle || '',
    githubUsername: profile.githubUsername || '',
    websiteUrl: profile.websiteUrl || '',
    hasReviewedBefore: profile.hasReviewedBefore,
    conferencesReviewed: profile.conferencesReviewed || '',
    expertiseAreas: profile.expertiseAreas,
    yearsOfExperience: profile.yearsOfExperience || 5,
    reviewCriteria: profile.reviewCriteria,
    additionalNotes: profile.additionalNotes || '',
    hoursPerWeek: profile.hoursPerWeek || '2-5',
    preferredEventSize: profile.preferredEventSize || 'any',
    showOnTeamPage: profile.showOnTeamPage,
  });

  const updateField = (field: string, value: unknown) => {
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

  const handleSave = async () => {
    if (!formData.fullName.trim()) {
      toast.error('Name is required');
      return;
    }
    if (formData.bio.length < 50) {
      toast.error('Bio must be at least 50 characters');
      return;
    }
    if (formData.expertiseAreas.length === 0) {
      toast.error('Please select at least one expertise area');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/reviewer-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save profile');
      }

      toast.success('Profile updated successfully');
      router.refresh();
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Tabs defaultValue="basic" className="space-y-6">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="basic" className="flex items-center gap-2">
          <User className="h-4 w-4" />
          <span className="hidden sm:inline">Basic Info</span>
        </TabsTrigger>
        <TabsTrigger value="expertise" className="flex items-center gap-2">
          <Target className="h-4 w-4" />
          <span className="hidden sm:inline">Expertise</span>
        </TabsTrigger>
        <TabsTrigger value="availability" className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <span className="hidden sm:inline">Availability</span>
        </TabsTrigger>
        <TabsTrigger value="visibility" className="flex items-center gap-2">
          <Eye className="h-4 w-4" />
          <span className="hidden sm:inline">Visibility</span>
        </TabsTrigger>
      </TabsList>

      {/* Basic Info Tab */}
      <TabsContent value="basic">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Your professional details and contact information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fullName">
                  Full Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => updateField('fullName', e.target.value)}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="designation">Job Title</Label>
                <Input
                  id="designation"
                  value={formData.designation}
                  onChange={(e) => updateField('designation', e.target.value)}
                  placeholder="Senior Engineer"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="company">Company / Organization</Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) => updateField('company', e.target.value)}
                placeholder="Acme Inc."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">
                Bio <span className="text-destructive">*</span>
                <span className="text-muted-foreground text-sm ml-2">
                  ({formData.bio.length} characters, min 50)
                </span>
              </Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => updateField('bio', e.target.value)}
                placeholder="Tell us about your background..."
                rows={4}
              />
            </div>

            <div className="space-y-4">
              <Label>Social Links</Label>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Linkedin className="h-4 w-4" /> LinkedIn
                  </div>
                  <Input
                    value={formData.linkedinUrl}
                    onChange={(e) => updateField('linkedinUrl', e.target.value)}
                    placeholder="https://linkedin.com/in/username"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Twitter className="h-4 w-4" /> Twitter
                  </div>
                  <Input
                    value={formData.twitterHandle}
                    onChange={(e) => updateField('twitterHandle', e.target.value)}
                    placeholder="@username"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Github className="h-4 w-4" /> GitHub
                  </div>
                  <Input
                    value={formData.githubUsername}
                    onChange={(e) => updateField('githubUsername', e.target.value)}
                    placeholder="username"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Globe className="h-4 w-4" /> Website
                  </div>
                  <Input
                    value={formData.websiteUrl}
                    onChange={(e) => updateField('websiteUrl', e.target.value)}
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
                  onCheckedChange={(checked) => updateField('hasReviewedBefore', checked === true)}
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
                    onChange={(e) => updateField('conferencesReviewed', e.target.value)}
                    placeholder="JSConf, React Summit, etc."
                    rows={2}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Expertise Tab */}
      <TabsContent value="expertise">
        <Card>
          <CardHeader>
            <CardTitle>Expertise & Review Focus</CardTitle>
            <CardDescription>Your areas of expertise and what you focus on when reviewing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <Label>
                Areas of Expertise <span className="text-destructive">*</span>
              </Label>
              <p className="text-sm text-muted-foreground">
                Select the topics you feel confident reviewing. Selected: {formData.expertiseAreas.length}
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="experience">Years of Experience in Tech</Label>
              <Select
                value={String(formData.yearsOfExperience)}
                onValueChange={(v) => updateField('yearsOfExperience', parseInt(v))}
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

            <div className="space-y-4 border-t pt-4">
              <Label>Review Focus Areas</Label>
              <p className="text-sm text-muted-foreground">
                What do you focus on when evaluating submissions?
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

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Review Notes</Label>
              <Textarea
                id="notes"
                value={formData.additionalNotes}
                onChange={(e) => updateField('additionalNotes', e.target.value)}
                placeholder="Any other information about your review style..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Availability Tab */}
      <TabsContent value="availability">
        <Card>
          <CardHeader>
            <CardTitle>Availability</CardTitle>
            <CardDescription>How much time you can dedicate to reviewing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="hours">Hours per Week Available for Reviews</Label>
              <Select
                value={formData.hoursPerWeek}
                onValueChange={(v) => updateField('hoursPerWeek', v)}
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
                onValueChange={(v) => updateField('preferredEventSize', v)}
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
          </CardContent>
        </Card>
      </TabsContent>

      {/* Visibility Tab */}
      <TabsContent value="visibility">
        <Card>
          <CardHeader>
            <CardTitle>Profile Visibility</CardTitle>
            <CardDescription>Control how your profile appears on the site</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="showOnTeamPage">Show on Review Team Page</Label>
                <p className="text-sm text-muted-foreground">
                  Display your profile on the &quot;Meet Our Review Team&quot; section of the landing page
                </p>
              </div>
              <Switch
                id="showOnTeamPage"
                checked={formData.showOnTeamPage}
                onCheckedChange={(checked) => updateField('showOnTeamPage', checked)}
              />
            </div>

            {formData.showOnTeamPage && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">Profile Preview</p>
                <p className="text-sm text-muted-foreground">
                  The following will be visible on the team page:
                </p>
                <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                  <li>• Name: {formData.fullName}</li>
                  <li>• Title: {formData.designation || 'Not set'}</li>
                  <li>• Company: {formData.company || 'Not set'}</li>
                  <li>• Bio: {formData.bio ? `${formData.bio.substring(0, 100)}...` : 'Not set'}</li>
                  <li>• Expertise: {formData.expertiseAreas.slice(0, 3).join(', ')}...</li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </Tabs>
  );
}
