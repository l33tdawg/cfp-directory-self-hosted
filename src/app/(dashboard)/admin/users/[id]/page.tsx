/**
 * Admin User Detail Page
 * 
 * Detailed view of a user with management options.
 */

import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  UserCheck
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
  
  const config = roleConfig[user.role];
  const RoleIcon = config.icon;
  const initials = user.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user.email[0].toUpperCase();
  
  const isCurrentUser = user.id === currentUser.id;
  
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
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src={user.image || undefined} alt={user.name || user.email} />
              <AvatarFallback className="text-2xl bg-slate-200 dark:bg-slate-700">
                {initials}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {user.name || 'Unnamed User'}
                </h1>
                {isCurrentUser && (
                  <Badge variant="outline">You</Badge>
                )}
              </div>
              
              <div className="flex flex-wrap items-center gap-4 text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  {user.email}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Joined {format(user.createdAt, 'MMM d, yyyy')}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
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
            </div>
            
            {/* Stats */}
            <div className="flex gap-6 text-center">
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {user._count.submissions}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Submissions</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {user._count.reviews}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Reviews</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Tabs for Details */}
      <Tabs defaultValue="submissions" className="space-y-6">
        <TabsList>
          <TabsTrigger value="submissions" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Submissions ({user._count.submissions})
          </TabsTrigger>
          <TabsTrigger value="reviews" className="flex items-center gap-2">
            <Star className="h-4 w-4" />
            Reviews ({user._count.reviews})
          </TabsTrigger>
          <TabsTrigger value="profile">Profile Details</TabsTrigger>
        </TabsList>
        
        {/* Submissions Tab */}
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
        
        {/* Reviews Tab */}
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
        
        {/* Profile Tab */}
        <TabsContent value="profile">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Speaker Profile */}
            <Card>
              <CardHeader>
                <CardTitle>Speaker Profile</CardTitle>
              </CardHeader>
              <CardContent>
                {user.speakerProfile ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Full Name</p>
                      <p className="font-medium">{user.speakerProfile.fullName}</p>
                    </div>
                    {user.speakerProfile.company && (
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Company</p>
                        <p className="font-medium">{user.speakerProfile.company}</p>
                      </div>
                    )}
                    {user.speakerProfile.bio && (
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Bio</p>
                        <p className="text-sm">{user.speakerProfile.bio}</p>
                      </div>
                    )}
                    <Badge variant={user.speakerProfile.onboardingCompleted ? 'default' : 'secondary'}>
                      {user.speakerProfile.onboardingCompleted ? 'Onboarding Complete' : 'Onboarding Pending'}
                    </Badge>
                  </div>
                ) : (
                  <p className="text-slate-500 dark:text-slate-400">No speaker profile</p>
                )}
              </CardContent>
            </Card>
            
            {/* Reviewer Profile */}
            <Card>
              <CardHeader>
                <CardTitle>Reviewer Profile</CardTitle>
              </CardHeader>
              <CardContent>
                {user.reviewerProfile ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Full Name</p>
                      <p className="font-medium">{user.reviewerProfile.fullName}</p>
                    </div>
                    {user.reviewerProfile.company && (
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Company</p>
                        <p className="font-medium">{user.reviewerProfile.company}</p>
                      </div>
                    )}
                    {user.reviewerProfile.expertiseAreas?.length > 0 && (
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Expertise Areas</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {user.reviewerProfile.expertiseAreas.map((area) => (
                            <Badge key={area} variant="outline" className="text-xs">
                              {area}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    <Badge variant={user.reviewerProfile.onboardingCompleted ? 'default' : 'secondary'}>
                      {user.reviewerProfile.onboardingCompleted ? 'Onboarding Complete' : 'Onboarding Pending'}
                    </Badge>
                  </div>
                ) : (
                  <p className="text-slate-500 dark:text-slate-400">No reviewer profile</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
