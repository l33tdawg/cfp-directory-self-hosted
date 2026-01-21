/**
 * Admin User Edit Page
 * 
 * Full profile editing for users.
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { UserEditForm } from '@/components/admin/user-edit-form';

export const dynamic = 'force-dynamic';

export default async function AdminUserEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const currentUser = await getCurrentUser();
  
  if (currentUser.role !== 'ADMIN') {
    redirect('/dashboard?error=unauthorized');
  }
  
  // Fetch user with all related data and topics for tag selection
  const [user, topics] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      include: {
        speakerProfile: true,
        reviewerProfile: true,
      },
    }),
    prisma.topic.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
  ]);
  
  if (!user) {
    notFound();
  }
  
  // Decrypt user PII
  const decryptedUser = decryptPiiFields(
    user as unknown as Record<string, unknown>,
    USER_PII_FIELDS
  );
  
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
  
  // Prepare initial data for the form
  const initialData = {
    id: user.id,
    name: decryptedUser.name as string || '',
    email: user.email,
    role: user.role,
    speakerProfile: decryptedSpeakerProfile && user.speakerProfile ? {
      fullName: String(decryptedSpeakerProfile.fullName || ''),
      bio: String(decryptedSpeakerProfile.bio || ''),
      company: String(decryptedSpeakerProfile.company || ''),
      position: String(decryptedSpeakerProfile.position || ''),
      location: String(decryptedSpeakerProfile.location || ''),
      linkedinUrl: String(decryptedSpeakerProfile.linkedinUrl || ''),
      twitterHandle: String(decryptedSpeakerProfile.twitterHandle || ''),
      githubUsername: String(decryptedSpeakerProfile.githubUsername || ''),
      websiteUrl: String(decryptedSpeakerProfile.websiteUrl || ''),
      speakingExperience: String(decryptedSpeakerProfile.speakingExperience || ''),
      expertiseTags: user.speakerProfile.expertiseTags || [],
    } : null,
    reviewerProfile: decryptedReviewerProfile && user.reviewerProfile ? {
      fullName: String(decryptedReviewerProfile.fullName || ''),
      designation: String(decryptedReviewerProfile.designation || ''),
      company: String(decryptedReviewerProfile.company || ''),
      bio: String(decryptedReviewerProfile.bio || ''),
      linkedinUrl: String(decryptedReviewerProfile.linkedinUrl || ''),
      twitterHandle: String(decryptedReviewerProfile.twitterHandle || ''),
      githubUsername: String(decryptedReviewerProfile.githubUsername || ''),
      websiteUrl: String(decryptedReviewerProfile.websiteUrl || ''),
      yearsOfExperience: user.reviewerProfile.yearsOfExperience || 0,
      expertiseAreas: user.reviewerProfile.expertiseAreas || [],
      hasReviewedBefore: user.reviewerProfile.hasReviewedBefore || false,
      conferencesReviewed: String(decryptedReviewerProfile.conferencesReviewed || ''),
    } : null,
  };
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Back Link */}
      <Link 
        href={`/admin/users/${id}`}
        className="inline-flex items-center text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to User Details
      </Link>
      
      <Card>
        <CardHeader>
          <CardTitle>Edit User: {initialData.name || initialData.email}</CardTitle>
        </CardHeader>
        <CardContent>
          <UserEditForm 
            initialData={initialData} 
            availableTopics={topics.map(t => t.name)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
