/**
 * Admin User Detail Page
 * 
 * Detailed view of a user with management options.
 * Shows role-contextual information (submissions for speakers, reviews for reviewers).
 */

import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { 
  decryptPiiFields, 
  USER_PII_FIELDS, 
  SPEAKER_PROFILE_PII_FIELDS,
  REVIEWER_PROFILE_PII_FIELDS 
} from '@/lib/security/encryption';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserActionButtons } from '@/components/admin/user-action-buttons';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Mail, 
  Calendar, 
  Shield, 
  FileText, 
  Star,
  User,
  Users,
  UserCheck,
  Linkedin,
  Twitter,
  Github,
  Globe,
  Building,
  Briefcase,
  MapPin,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import type { UserRole } from '@prisma/client';

export const dynamic = 'force-dynamic';

const roleConfig: Record<UserRole, { color: string; icon: typeof User }> = {
  ADMIN: { color: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300', icon: Shield },
  ORGANIZER: { color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300', icon: Users },
  REVIEWER: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300', icon: UserCheck },
  SPEAKER: { color: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300', icon: User },
  USER: { color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/50 dark:text-gray-300', icon: User },
};

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const currentUser = await getCurrentUser();
  
  if (currentUser.role !== 'ADMIN') {
    redirect('/dashboard?error=unauthorized');
  }
  
  // Fetch user with all related data
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      speakerProfile: true,
      reviewerProfile: true,
      submissions: {
        include: {
          event: { select: { name: true, slug: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
      reviews: {
        include: {
          submission: { 
            select: { 
              title: true,
              event: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
      _count: {
        select: {
          submissions: true,
          reviews: true,
        },
      },
    },
  });
  
  if (!user) {
    notFound();
  }
  
  // Decrypt user PII
  const decryptedUser = decryptPiiFields(
    user as unknown as Record<string, unknown>,
    USER_PII_FIELDS
  );
  const userName = decryptedUser.name as string | null;
  const userEmail = decryptedUser.email as string;
  
  // Decrypt speaker profile if exists
  const decryptedSpeakerProfile = user.speakerProfile 
    ? decryptPiiFields(
        user.speakerProfile as unknown as Record<string, unknown>,
        SPEAKER_PROFILE_PII_FIELDS
      )
    : null;
  
  // Decrypt reviewer profile if exists
  const decryptedReviewerProfile = user.reviewerProfile
    ? decryptPiiFields(
        user.reviewerProfile as unknown as Record<string, unknown>,
        REVIEWER_PROFILE_PII_FIELDS
      )
    : null;
  
  const config = roleConfig[user.role];
  const RoleIcon = config.icon;
  const initials = userName
    ? userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : userEmail[0].toUpperCase();
  
  const isCurrentUser = user.id === currentUser.id;
  
  // Determine which tabs to show based on role and data
  const isReviewer = user.role === 'REVIEWER' || user.reviewerProfile !== null;
  const isSpeaker = user.role === 'USER' || user.role === 'SPEAKER' || user.speakerProfile !== null;
  const hasSubmissions = user._count.submissions > 0;
  const hasReviews = user._count.reviews > 0;
  
  // Determine default tab
  const defaultTab = isReviewer && hasReviews ? 'reviews' : 
                     isSpeaker && hasSubmissions ? 'submissions' : 'profile';
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Back Link */}
      <Link 
        href="/admin/users" 
        className="inline-flex items-center text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Users
      </Link>
      
      {/* User Header */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <Avatar className="h-20 w-20 flex-shrink-0">
              <AvatarImage src={user.image || undefined} alt={userName || userEmail} />
              <AvatarFallback className="text-2xl bg-slate-200 dark:bg-slate-700">
                {initials}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {userName || 'Unnamed User'}
                </h1>
                {isCurrentUser && (
                  <Badge variant="outline">You</Badge>
                )}
              </div>
              
              <div className="flex flex-wrap items-center gap-4 text-slate-500 dark:text-slate-400 mb-3">
                <span className="flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  {userEmail}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Joined {format(user.createdAt, 'MMM d, yyyy')}
                </span>
              </div>
              
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <Badge className={config.color}>
                  <RoleIcon className="h-3 w-3 mr-1" />
                  {user.role}
                </Badge>
                {user.speakerProfile?.onboardingCompleted && (
                  <Badge variant="secondary">Speaker Profile Complete</Badge>
                )}
                {user.reviewerProfile?.onboardingCompleted && (
                  <Badge variant="secondary">Reviewer Profile Complete</Badge>
                )}
              </div>
              
              {/* Social Links for Quick Contact */}
              {(decryptedSpeakerProfile || decryptedReviewerProfile) ? (
                <div className="flex flex-wrap gap-2 mb-4">
                  {(decryptedSpeakerProfile?.linkedinUrl || decryptedReviewerProfile?.linkedinUrl) ? (
                    <a 
                      href={String(decryptedSpeakerProfile?.linkedinUrl || decryptedReviewerProfile?.linkedinUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 text-sm hover:bg-blue-200 dark:hover:bg-blue-900 transition-colors"
                    >
                      <Linkedin className="h-4 w-4" />
                      LinkedIn
                    </a>
                  ) : null}
                  {(decryptedSpeakerProfile?.twitterHandle || decryptedReviewerProfile?.twitterHandle) ? (
                    <a 
                      href={`https://twitter.com/${String(decryptedSpeakerProfile?.twitterHandle || decryptedReviewerProfile?.twitterHandle)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300 text-sm hover:bg-sky-200 dark:hover:bg-sky-900 transition-colors"
                    >
                      <Twitter className="h-4 w-4" />
                      @{String(decryptedSpeakerProfile?.twitterHandle || decryptedReviewerProfile?.twitterHandle)}
                    </a>
                  ) : null}
                  {(decryptedSpeakerProfile?.githubUsername || decryptedReviewerProfile?.githubUsername) ? (
                    <a 
                      href={`https://github.com/${String(decryptedSpeakerProfile?.githubUsername || decryptedReviewerProfile?.githubUsername)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      <Github className="h-4 w-4" />
                      {String(decryptedSpeakerProfile?.githubUsername || decryptedReviewerProfile?.githubUsername)}
                    </a>
                  ) : null}
                  {(decryptedSpeakerProfile?.websiteUrl || decryptedReviewerProfile?.websiteUrl) ? (
                    <a 
                      href={String(decryptedSpeakerProfile?.websiteUrl || decryptedReviewerProfile?.websiteUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 text-sm hover:bg-green-200 dark:hover:bg-green-900 transition-colors"
                    >
                      <Globe className="h-4 w-4" />
                      Website
                    </a>
                  ) : null}
                </div>
              ) : null}
              
              {/* Stats */}
              <div className="flex gap-6">
                {(isSpeaker || hasSubmissions) && (
                  <div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">
                      {user._count.submissions}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Submissions</p>
                  </div>
                )}
                {(isReviewer || hasReviews) && (
                  <div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">
                      {user._count.reviews}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Reviews</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Action Buttons - Full Width */}
      {!isCurrentUser && (
        <UserActionButtons 
          userId={user.id} 
          currentRole={user.role}
          userName={userName || userEmail}
        />
      )}
      
      {/* Tabs for Details - Role Contextual */}
      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList>
          {/* Only show Submissions tab for speakers or users with submissions */}
          {(isSpeaker || hasSubmissions) && (
            <TabsTrigger value="submissions" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Submissions ({user._count.submissions})
            </TabsTrigger>
          )}
          {/* Only show Reviews tab for reviewers or users with reviews */}
          {(isReviewer || hasReviews) && (
            <TabsTrigger value="reviews" className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              Reviews ({user._count.reviews})
            </TabsTrigger>
          )}
          <TabsTrigger value="profile">Profile Details</TabsTrigger>
        </TabsList>
        
        {/* Submissions Tab - Only for speakers */}
        {(isSpeaker || hasSubmissions) && (
          <TabsContent value="submissions">
            <Card>
              <CardHeader>
                <CardTitle>Recent Submissions</CardTitle>
                <CardDescription>Talks submitted by this user</CardDescription>
              </CardHeader>
              <CardContent>
                {user.submissions.length === 0 ? (
                  <p className="text-center py-8 text-slate-500 dark:text-slate-400">
                    No submissions yet
                  </p>
                ) : (
                  <div className="space-y-4">
                    {user.submissions.map((submission) => (
                      <div 
                        key={submission.id}
                        className="flex items-center justify-between p-4 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      >
                        <div>
                          <Link 
                            href={`/events/${submission.event.slug}/submissions/${submission.id}`}
                            className="font-medium text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
                          >
                            {submission.title}
                          </Link>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {submission.event.name} • {format(submission.createdAt, 'MMM d, yyyy')}
                          </p>
                        </div>
                        <Badge variant={
                          submission.status === 'ACCEPTED' ? 'default' :
                          submission.status === 'REJECTED' ? 'destructive' :
                          'secondary'
                        }>
                          {submission.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
        
        {/* Reviews Tab - Only for reviewers */}
        {(isReviewer || hasReviews) && (
          <TabsContent value="reviews">
            <Card>
              <CardHeader>
                <CardTitle>Recent Reviews</CardTitle>
                <CardDescription>Reviews submitted by this user</CardDescription>
              </CardHeader>
              <CardContent>
                {user.reviews.length === 0 ? (
                  <p className="text-center py-8 text-slate-500 dark:text-slate-400">
                    No reviews yet
                  </p>
                ) : (
                  <div className="space-y-4">
                    {user.reviews.map((review) => (
                      <div 
                        key={review.id}
                        className="flex items-center justify-between p-4 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      >
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">
                            {review.submission.title}
                          </p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {review.submission.event.name} • {format(review.createdAt, 'MMM d, yyyy')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {review.overallScore && (
                            <Badge variant="secondary">
                              Score: {review.overallScore}/5
                            </Badge>
                          )}
                          {review.recommendation && (
                            <Badge variant={
                              review.recommendation === 'STRONG_ACCEPT' || review.recommendation === 'ACCEPT' 
                                ? 'default' 
                                : review.recommendation === 'REJECT' || review.recommendation === 'STRONG_REJECT'
                                  ? 'destructive'
                                  : 'secondary'
                            }>
                              {review.recommendation.replace('_', ' ')}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
        
        {/* Profile Tab - Full Width */}
        <TabsContent value="profile">
          <div className="space-y-6">
            {/* Speaker Profile - Full Width */}
            {decryptedSpeakerProfile && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Speaker Profile
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 md:grid-cols-2">
                    {/* Left Column - Basic Info */}
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Full Name</p>
                        <p className="font-medium text-lg">{String(decryptedSpeakerProfile.fullName || 'Not set')}</p>
                      </div>
                      
                      {decryptedSpeakerProfile.position ? (
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-slate-400" />
                          <span>{String(decryptedSpeakerProfile.position)}</span>
                        </div>
                      ) : null}
                      
                      {decryptedSpeakerProfile.company ? (
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-slate-400" />
                          <span>{String(decryptedSpeakerProfile.company)}</span>
                        </div>
                      ) : null}
                      
                      {decryptedSpeakerProfile.location ? (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-slate-400" />
                          <span>{String(decryptedSpeakerProfile.location)}</span>
                        </div>
                      ) : null}
                      
                      {/* Social Links */}
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Social Links</p>
                        <div className="flex flex-wrap gap-2">
                          {decryptedSpeakerProfile.linkedinUrl ? (
                            <a 
                              href={String(decryptedSpeakerProfile.linkedinUrl)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 text-sm hover:bg-blue-200 dark:hover:bg-blue-900"
                            >
                              <Linkedin className="h-3 w-3" />
                              LinkedIn
                            </a>
                          ) : null}
                          {decryptedSpeakerProfile.twitterHandle ? (
                            <a 
                              href={`https://twitter.com/${String(decryptedSpeakerProfile.twitterHandle)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300 text-sm hover:bg-sky-200 dark:hover:bg-sky-900"
                            >
                              <Twitter className="h-3 w-3" />
                              @{String(decryptedSpeakerProfile.twitterHandle)}
                            </a>
                          ) : null}
                          {decryptedSpeakerProfile.githubUsername ? (
                            <a 
                              href={`https://github.com/${String(decryptedSpeakerProfile.githubUsername)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-sm hover:bg-slate-200 dark:hover:bg-slate-700"
                            >
                              <Github className="h-3 w-3" />
                              {String(decryptedSpeakerProfile.githubUsername)}
                            </a>
                          ) : null}
                          {decryptedSpeakerProfile.websiteUrl ? (
                            <a 
                              href={String(decryptedSpeakerProfile.websiteUrl)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 text-sm hover:bg-green-200 dark:hover:bg-green-900"
                            >
                              <Globe className="h-3 w-3" />
                              Website
                            </a>
                          ) : null}
                          {!decryptedSpeakerProfile.linkedinUrl && 
                           !decryptedSpeakerProfile.twitterHandle && 
                           !decryptedSpeakerProfile.githubUsername && 
                           !decryptedSpeakerProfile.websiteUrl ? (
                            <span className="text-sm text-slate-400">No social links</span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    
                    {/* Right Column - Bio & Expertise */}
                    <div className="space-y-4">
                      {/* Bio */}
                      {decryptedSpeakerProfile.bio ? (
                        <div>
                          <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Bio</p>
                          <p className="text-sm leading-relaxed">{String(decryptedSpeakerProfile.bio)}</p>
                        </div>
                      ) : null}
                      
                      {/* Expertise Tags */}
                      {user.speakerProfile?.expertiseTags && user.speakerProfile.expertiseTags.length > 0 ? (
                        <div>
                          <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Expertise</p>
                          <div className="flex flex-wrap gap-1">
                            {user.speakerProfile.expertiseTags.map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      
                      {/* Status */}
                      <Badge variant={user.speakerProfile?.onboardingCompleted ? 'default' : 'secondary'}>
                        {user.speakerProfile?.onboardingCompleted ? 'Onboarding Complete' : 'Onboarding Pending'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Reviewer Profile - Full Width */}
            {decryptedReviewerProfile && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserCheck className="h-5 w-5" />
                    Reviewer Profile
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 md:grid-cols-2">
                    {/* Left Column - Basic Info */}
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Full Name</p>
                        <p className="font-medium text-lg">{String(decryptedReviewerProfile.fullName || 'Not set')}</p>
                      </div>
                      
                      {decryptedReviewerProfile.designation ? (
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-slate-400" />
                          <span>{String(decryptedReviewerProfile.designation)}</span>
                        </div>
                      ) : null}
                      
                      {decryptedReviewerProfile.company ? (
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-slate-400" />
                          <span>{String(decryptedReviewerProfile.company)}</span>
                        </div>
                      ) : null}
                      
                      {user.reviewerProfile?.yearsOfExperience ? (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-slate-400" />
                          <span>{user.reviewerProfile.yearsOfExperience} years of experience</span>
                        </div>
                      ) : null}
                      
                      {/* Social Links */}
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Social Links</p>
                        <div className="flex flex-wrap gap-2">
                          {decryptedReviewerProfile.linkedinUrl ? (
                            <a 
                              href={String(decryptedReviewerProfile.linkedinUrl)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 text-sm hover:bg-blue-200 dark:hover:bg-blue-900"
                            >
                              <Linkedin className="h-3 w-3" />
                              LinkedIn
                            </a>
                          ) : null}
                          {decryptedReviewerProfile.twitterHandle ? (
                            <a 
                              href={`https://twitter.com/${String(decryptedReviewerProfile.twitterHandle)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300 text-sm hover:bg-sky-200 dark:hover:bg-sky-900"
                            >
                              <Twitter className="h-3 w-3" />
                              @{String(decryptedReviewerProfile.twitterHandle)}
                            </a>
                          ) : null}
                          {decryptedReviewerProfile.githubUsername ? (
                            <a 
                              href={`https://github.com/${String(decryptedReviewerProfile.githubUsername)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-sm hover:bg-slate-200 dark:hover:bg-slate-700"
                            >
                              <Github className="h-3 w-3" />
                              {String(decryptedReviewerProfile.githubUsername)}
                            </a>
                          ) : null}
                          {decryptedReviewerProfile.websiteUrl ? (
                            <a 
                              href={String(decryptedReviewerProfile.websiteUrl)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 text-sm hover:bg-green-200 dark:hover:bg-green-900"
                            >
                              <Globe className="h-3 w-3" />
                              Website
                            </a>
                          ) : null}
                          {!decryptedReviewerProfile.linkedinUrl && 
                           !decryptedReviewerProfile.twitterHandle && 
                           !decryptedReviewerProfile.githubUsername && 
                           !decryptedReviewerProfile.websiteUrl ? (
                            <span className="text-sm text-slate-400">No social links</span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    
                    {/* Right Column - Bio & Expertise */}
                    <div className="space-y-4">
                      {/* Bio */}
                      {decryptedReviewerProfile.bio ? (
                        <div>
                          <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Bio</p>
                          <p className="text-sm leading-relaxed">{String(decryptedReviewerProfile.bio)}</p>
                        </div>
                      ) : null}
                      
                      {/* Expertise Areas */}
                      {user.reviewerProfile?.expertiseAreas && user.reviewerProfile.expertiseAreas.length > 0 ? (
                        <div>
                          <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Expertise Areas</p>
                          <div className="flex flex-wrap gap-1">
                            {user.reviewerProfile.expertiseAreas.map((area) => (
                              <Badge key={area} variant="outline" className="text-xs">
                                {area}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      
                      {/* Review Experience */}
                      {user.reviewerProfile?.hasReviewedBefore ? (
                        <div>
                          <Badge variant="secondary">Has reviewed before</Badge>
                        </div>
                      ) : null}
                      
                      {/* Conferences Reviewed */}
                      {decryptedReviewerProfile.conferencesReviewed ? (
                        <div>
                          <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Conferences Reviewed</p>
                          <p className="text-sm">{String(decryptedReviewerProfile.conferencesReviewed)}</p>
                        </div>
                      ) : null}
                      
                      {/* Status */}
                      <Badge variant={user.reviewerProfile?.onboardingCompleted ? 'default' : 'secondary'}>
                        {user.reviewerProfile?.onboardingCompleted ? 'Onboarding Complete' : 'Onboarding Pending'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* No profiles message */}
            {!decryptedSpeakerProfile && !decryptedReviewerProfile && (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-slate-500 dark:text-slate-400">
                    This user has not completed any profile setup yet.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
