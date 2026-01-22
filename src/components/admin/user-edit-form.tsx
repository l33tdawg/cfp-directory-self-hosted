'use client';

/**
 * User Edit Form Component
 * 
 * Role-contextual profile editing form for admin users.
 * Shows only relevant profile sections based on user role.
 * Uses topic selection for expertise tags.
 */

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

// Dynamic import for RichTextEditor to avoid SSR issues
const RichTextEditor = dynamic(
  () => import('@/components/editors/rich-text-editor').then(mod => mod.RichTextEditor),
  { ssr: false }
);
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  Loader2,
  User,
  UserCheck,
  Briefcase,
  Building,
  MapPin,
  Globe,
  Linkedin,
  Twitter,
  Github,
  X,
  ChevronsUpDown,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { UserRole } from '@prisma/client';

interface SpeakerProfileData {
  fullName: string;
  bio: string;
  company: string;
  position: string;
  location: string;
  linkedinUrl: string;
  twitterHandle: string;
  githubUsername: string;
  websiteUrl: string;
  speakingExperience: string;
  expertiseTags: string[];
}

interface ReviewerProfileData {
  fullName: string;
  designation: string;
  company: string;
  bio: string;
  linkedinUrl: string;
  twitterHandle: string;
  githubUsername: string;
  websiteUrl: string;
  yearsOfExperience: number;
  expertiseAreas: string[];
  hasReviewedBefore: boolean;
  conferencesReviewed: string;
}

interface UserEditFormProps {
  initialData: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    speakerProfile: SpeakerProfileData | null;
    reviewerProfile: ReviewerProfileData | null;
  };
  availableTopics?: string[];
}

export function UserEditForm({ initialData, availableTopics = [] }: UserEditFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  
  // Basic user data
  const [name, setName] = useState(initialData.name);
  const [email, setEmail] = useState(initialData.email);
  const [role, setRole] = useState<UserRole>(initialData.role);
  
  // Determine which profile sections to show based on role and existing data
  const showSpeakerProfile = useMemo(() => {
    return role === 'USER' || role === 'SPEAKER' || initialData.speakerProfile !== null;
  }, [role, initialData.speakerProfile]);
  
  const showReviewerProfile = useMemo(() => {
    return role === 'REVIEWER' || initialData.reviewerProfile !== null;
  }, [role, initialData.reviewerProfile]);
  
  // Speaker profile
  const [speakerProfile, setSpeakerProfile] = useState<SpeakerProfileData>(
    initialData.speakerProfile || {
      fullName: '',
      bio: '',
      company: '',
      position: '',
      location: '',
      linkedinUrl: '',
      twitterHandle: '',
      githubUsername: '',
      websiteUrl: '',
      speakingExperience: '',
      expertiseTags: [],
    }
  );
  const [speakerTagOpen, setSpeakerTagOpen] = useState(false);
  
  // Reviewer profile
  const [reviewerProfile, setReviewerProfile] = useState<ReviewerProfileData>(
    initialData.reviewerProfile || {
      fullName: '',
      designation: '',
      company: '',
      bio: '',
      linkedinUrl: '',
      twitterHandle: '',
      githubUsername: '',
      websiteUrl: '',
      yearsOfExperience: 0,
      expertiseAreas: [],
      hasReviewedBefore: false,
      conferencesReviewed: '',
    }
  );
  const [reviewerAreaOpen, setReviewerAreaOpen] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const payload: Record<string, unknown> = {
        name,
        email,
        role,
      };
      
      // Include speaker profile if showing and has data
      if (showSpeakerProfile && (initialData.speakerProfile || speakerProfile.fullName)) {
        payload.speakerProfile = speakerProfile;
      }
      
      // Include reviewer profile if showing and has data
      if (showReviewerProfile && (initialData.reviewerProfile || reviewerProfile.fullName)) {
        payload.reviewerProfile = reviewerProfile;
      }
      
      const response = await fetch(`/api/admin/users/${initialData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update user');
      }
      
      toast.success('User updated successfully');
      router.push(`/admin/users/${initialData.id}`);
      router.refresh();
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update user');
    } finally {
      setIsLoading(false);
    }
  };
  
  const toggleSpeakerTag = (tag: string) => {
    setSpeakerProfile(prev => ({
      ...prev,
      expertiseTags: prev.expertiseTags.includes(tag)
        ? prev.expertiseTags.filter(t => t !== tag)
        : [...prev.expertiseTags, tag],
    }));
  };
  
  const removeSpeakerTag = (tag: string) => {
    setSpeakerProfile(prev => ({
      ...prev,
      expertiseTags: prev.expertiseTags.filter(t => t !== tag),
    }));
  };
  
  const toggleReviewerArea = (area: string) => {
    setReviewerProfile(prev => ({
      ...prev,
      expertiseAreas: prev.expertiseAreas.includes(area)
        ? prev.expertiseAreas.filter(a => a !== area)
        : [...prev.expertiseAreas, area],
    }));
  };
  
  const removeReviewerArea = (area: string) => {
    setReviewerProfile(prev => ({
      ...prev,
      expertiseAreas: prev.expertiseAreas.filter(a => a !== area),
    }));
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Basic User Info */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <User className="h-5 w-5" />
          Basic Information
        </h3>
        
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Display Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@example.com"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USER">User</SelectItem>
                <SelectItem value="SPEAKER">Speaker</SelectItem>
                <SelectItem value="REVIEWER">Reviewer</SelectItem>
                <SelectItem value="ORGANIZER">Organizer</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      
      {/* Speaker Profile Section - Only show for speakers/users */}
      {showSpeakerProfile && (
        <>
          <Separator />
          
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Speaker Profile
              {!initialData.speakerProfile && (
                <Badge variant="secondary" className="ml-2">New</Badge>
              )}
            </h3>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="speaker-fullName">Full Name</Label>
                <Input
                  id="speaker-fullName"
                  value={speakerProfile.fullName}
                  onChange={(e) => setSpeakerProfile(prev => ({ ...prev, fullName: e.target.value }))}
                  placeholder="Full name for speaker profile"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="speaker-position">Position</Label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="speaker-position"
                    value={speakerProfile.position}
                    onChange={(e) => setSpeakerProfile(prev => ({ ...prev, position: e.target.value }))}
                    placeholder="e.g. Senior Developer"
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="speaker-company">Company</Label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="speaker-company"
                    value={speakerProfile.company}
                    onChange={(e) => setSpeakerProfile(prev => ({ ...prev, company: e.target.value }))}
                    placeholder="Company name"
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="speaker-location">Location</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="speaker-location"
                    value={speakerProfile.location}
                    onChange={(e) => setSpeakerProfile(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="City, Country"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="speaker-bio">Bio</Label>
              <RichTextEditor
                content={speakerProfile.bio || ''}
                onChange={(content) => setSpeakerProfile(prev => ({ ...prev, bio: content }))}
                placeholder="A brief bio about the speaker..."
                minHeight={120}
                maxHeight={300}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="speaker-experience">Speaking Experience</Label>
              <RichTextEditor
                content={speakerProfile.speakingExperience || ''}
                onChange={(content) => setSpeakerProfile(prev => ({ ...prev, speakingExperience: content }))}
                placeholder="Previous conferences, talks, etc."
                minHeight={100}
                maxHeight={250}
              />
            </div>
            
            {/* Social Links */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="speaker-linkedin">LinkedIn URL</Label>
                <div className="relative">
                  <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="speaker-linkedin"
                    value={speakerProfile.linkedinUrl}
                    onChange={(e) => setSpeakerProfile(prev => ({ ...prev, linkedinUrl: e.target.value }))}
                    placeholder="https://linkedin.com/in/..."
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="speaker-twitter">Twitter Handle</Label>
                <div className="relative">
                  <Twitter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="speaker-twitter"
                    value={speakerProfile.twitterHandle}
                    onChange={(e) => setSpeakerProfile(prev => ({ ...prev, twitterHandle: e.target.value }))}
                    placeholder="@username"
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="speaker-github">GitHub Username</Label>
                <div className="relative">
                  <Github className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="speaker-github"
                    value={speakerProfile.githubUsername}
                    onChange={(e) => setSpeakerProfile(prev => ({ ...prev, githubUsername: e.target.value }))}
                    placeholder="username"
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="speaker-website">Website</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="speaker-website"
                    value={speakerProfile.websiteUrl}
                    onChange={(e) => setSpeakerProfile(prev => ({ ...prev, websiteUrl: e.target.value }))}
                    placeholder="https://..."
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
            
            {/* Expertise Tags - Select from Topics */}
            <div className="space-y-2">
              <Label>Expertise Tags</Label>
              <Popover open={speakerTagOpen} onOpenChange={setSpeakerTagOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={speakerTagOpen}
                    className="w-full justify-between"
                  >
                    Select expertise areas...
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search topics..." />
                    <CommandList>
                      <CommandEmpty>No topics found.</CommandEmpty>
                      <CommandGroup className="max-h-64 overflow-auto">
                        {availableTopics.map((topic) => (
                          <CommandItem
                            key={topic}
                            value={topic}
                            onSelect={() => toggleSpeakerTag(topic)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                speakerProfile.expertiseTags.includes(topic) ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {topic}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <div className="flex flex-wrap gap-2 mt-2">
                {speakerProfile.expertiseTags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button type="button" onClick={() => removeSpeakerTag(tag)} className="ml-1 hover:text-red-500">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {speakerProfile.expertiseTags.length === 0 && (
                  <span className="text-sm text-muted-foreground">No tags selected</span>
                )}
              </div>
            </div>
          </div>
        </>
      )}
      
      {/* Reviewer Profile Section - Only show for reviewers */}
      {showReviewerProfile && (
        <>
          <Separator />
          
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Reviewer Profile
              {!initialData.reviewerProfile && (
                <Badge variant="secondary" className="ml-2">New</Badge>
              )}
            </h3>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="reviewer-fullName">Full Name</Label>
                <Input
                  id="reviewer-fullName"
                  value={reviewerProfile.fullName}
                  onChange={(e) => setReviewerProfile(prev => ({ ...prev, fullName: e.target.value }))}
                  placeholder="Full name for reviewer profile"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reviewer-designation">Designation</Label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="reviewer-designation"
                    value={reviewerProfile.designation}
                    onChange={(e) => setReviewerProfile(prev => ({ ...prev, designation: e.target.value }))}
                    placeholder="e.g. Tech Lead, CTO"
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reviewer-company">Company</Label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="reviewer-company"
                    value={reviewerProfile.company}
                    onChange={(e) => setReviewerProfile(prev => ({ ...prev, company: e.target.value }))}
                    placeholder="Company name"
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reviewer-experience">Years of Experience</Label>
                <Input
                  id="reviewer-experience"
                  type="number"
                  min={0}
                  value={reviewerProfile.yearsOfExperience}
                  onChange={(e) => setReviewerProfile(prev => ({ ...prev, yearsOfExperience: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="reviewer-bio">Bio</Label>
              <RichTextEditor
                content={reviewerProfile.bio || ''}
                onChange={(content) => setReviewerProfile(prev => ({ ...prev, bio: content }))}
                placeholder="A brief bio about the reviewer..."
                minHeight={120}
                maxHeight={300}
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Checkbox
                id="reviewer-reviewed-before"
                checked={reviewerProfile.hasReviewedBefore}
                onCheckedChange={(checked) => setReviewerProfile(prev => ({ ...prev, hasReviewedBefore: !!checked }))}
              />
              <Label htmlFor="reviewer-reviewed-before" className="cursor-pointer">
                Has reviewed conferences before
              </Label>
            </div>
            
            {reviewerProfile.hasReviewedBefore && (
              <div className="space-y-2">
                <Label htmlFor="reviewer-conferences">Conferences Reviewed</Label>
                <RichTextEditor
                  content={reviewerProfile.conferencesReviewed || ''}
                  onChange={(content) => setReviewerProfile(prev => ({ ...prev, conferencesReviewed: content }))}
                  placeholder="List of conferences previously reviewed..."
                  minHeight={80}
                  maxHeight={200}
                />
              </div>
            )}
            
            {/* Social Links */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="reviewer-linkedin">LinkedIn URL</Label>
                <div className="relative">
                  <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="reviewer-linkedin"
                    value={reviewerProfile.linkedinUrl}
                    onChange={(e) => setReviewerProfile(prev => ({ ...prev, linkedinUrl: e.target.value }))}
                    placeholder="https://linkedin.com/in/..."
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reviewer-twitter">Twitter Handle</Label>
                <div className="relative">
                  <Twitter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="reviewer-twitter"
                    value={reviewerProfile.twitterHandle}
                    onChange={(e) => setReviewerProfile(prev => ({ ...prev, twitterHandle: e.target.value }))}
                    placeholder="@username"
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reviewer-github">GitHub Username</Label>
                <div className="relative">
                  <Github className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="reviewer-github"
                    value={reviewerProfile.githubUsername}
                    onChange={(e) => setReviewerProfile(prev => ({ ...prev, githubUsername: e.target.value }))}
                    placeholder="username"
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reviewer-website">Website</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="reviewer-website"
                    value={reviewerProfile.websiteUrl}
                    onChange={(e) => setReviewerProfile(prev => ({ ...prev, websiteUrl: e.target.value }))}
                    placeholder="https://..."
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
            
            {/* Expertise Areas - Select from Topics */}
            <div className="space-y-2">
              <Label>Expertise Areas</Label>
              <Popover open={reviewerAreaOpen} onOpenChange={setReviewerAreaOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={reviewerAreaOpen}
                    className="w-full justify-between"
                  >
                    Select expertise areas...
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search topics..." />
                    <CommandList>
                      <CommandEmpty>No topics found.</CommandEmpty>
                      <CommandGroup className="max-h-64 overflow-auto">
                        {availableTopics.map((topic) => (
                          <CommandItem
                            key={topic}
                            value={topic}
                            onSelect={() => toggleReviewerArea(topic)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                reviewerProfile.expertiseAreas.includes(topic) ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {topic}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <div className="flex flex-wrap gap-2 mt-2">
                {reviewerProfile.expertiseAreas.map((area) => (
                  <Badge key={area} variant="secondary" className="gap-1">
                    {area}
                    <button type="button" onClick={() => removeReviewerArea(area)} className="ml-1 hover:text-red-500">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {reviewerProfile.expertiseAreas.length === 0 && (
                  <span className="text-sm text-muted-foreground">No areas selected</span>
                )}
              </div>
            </div>
          </div>
        </>
      )}
      
      <Separator />
      
      {/* Action Buttons */}
      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </div>
    </form>
  );
}
