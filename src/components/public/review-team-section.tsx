'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Linkedin,
  Twitter,
  Github,
  Globe,
  Users,
  UserPlus,
} from 'lucide-react';
import Link from 'next/link';

interface Reviewer {
  id: string;
  fullName: string;
  designation?: string | null;
  company?: string | null;
  bio?: string | null;
  photoUrl?: string | null;
  expertiseAreas: string[];
  linkedinUrl?: string | null;
  twitterHandle?: string | null;
  githubUsername?: string | null;
  websiteUrl?: string | null;
}

interface ReviewTeamSectionProps {
  reviewers: Reviewer[];
  isAdmin?: boolean;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function truncateBio(bio: string | null | undefined, maxLength: number = 150): string {
  if (!bio) return '';
  if (bio.length <= maxLength) return bio;
  return bio.slice(0, maxLength).trim() + '...';
}

export function ReviewTeamSection({ reviewers, isAdmin = false }: ReviewTeamSectionProps) {
  // No reviewers - show appropriate message based on user type
  if (reviewers.length === 0) {
    return (
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold">Meet Our Review Team</h2>
            <p className="text-muted-foreground mt-2">
              Expert reviewers who evaluate submissions
            </p>
          </div>
          
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              {isAdmin ? (
                <>
                  <h3 className="font-semibold text-lg mb-2">No Reviewers Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Add reviewers to help evaluate talk submissions. Their profiles will appear here.
                  </p>
                  <Button asChild>
                    <Link href="/admin/reviewers">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Manage Reviewers
                    </Link>
                  </Button>
                </>
              ) : (
                <>
                  <h3 className="font-semibold text-lg mb-2">Review Team Coming Soon</h3>
                  <p className="text-muted-foreground">
                    Our expert review team profiles will be displayed here once available.
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold">Meet Our Review Team</h2>
          <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
            Our expert reviewers bring diverse experience and perspectives to ensure 
            every submission receives thoughtful, fair evaluation.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {reviewers.map((reviewer) => (
            <Card key={reviewer.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center">
                  <Avatar className="h-24 w-24 mb-4">
                    <AvatarImage src={reviewer.photoUrl || undefined} alt={reviewer.fullName} />
                    <AvatarFallback className="text-lg bg-primary/10 text-primary">
                      {getInitials(reviewer.fullName)}
                    </AvatarFallback>
                  </Avatar>

                  <h3 className="font-semibold text-lg">{reviewer.fullName}</h3>
                  
                  {(reviewer.designation || reviewer.company) && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {reviewer.designation}
                      {reviewer.designation && reviewer.company && ' at '}
                      {reviewer.company}
                    </p>
                  )}

                  {reviewer.bio && (
                    <p className="text-sm text-muted-foreground mt-3 line-clamp-3">
                      {truncateBio(reviewer.bio)}
                    </p>
                  )}

                  {reviewer.expertiseAreas.length > 0 && (
                    <div className="flex flex-wrap gap-1 justify-center mt-4">
                      {reviewer.expertiseAreas.slice(0, 3).map((area) => (
                        <Badge key={area} variant="secondary" className="text-xs">
                          {area}
                        </Badge>
                      ))}
                      {reviewer.expertiseAreas.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{reviewer.expertiseAreas.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Social Links */}
                  <div className="flex gap-2 mt-4">
                    {reviewer.linkedinUrl && (
                      <a
                        href={reviewer.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Linkedin className="h-4 w-4" />
                      </a>
                    )}
                    {reviewer.twitterHandle && (
                      <a
                        href={`https://twitter.com/${reviewer.twitterHandle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Twitter className="h-4 w-4" />
                      </a>
                    )}
                    {reviewer.githubUsername && (
                      <a
                        href={`https://github.com/${reviewer.githubUsername}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Github className="h-4 w-4" />
                      </a>
                    )}
                    {reviewer.websiteUrl && (
                      <a
                        href={reviewer.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Globe className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {isAdmin && (
          <div className="text-center mt-8">
            <Button variant="outline" asChild>
              <Link href="/dashboard/team">
                <UserPlus className="h-4 w-4 mr-2" />
                Manage Review Team
              </Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
