'use client';

/**
 * Modern Review Team Section
 * 
 * Glassmorphism cards with gradient accents and smooth animations.
 */

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
  Sparkles,
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

function truncateBio(bio: string | null | undefined, maxLength: number = 120): string {
  if (!bio) return '';
  if (bio.length <= maxLength) return bio;
  return bio.slice(0, maxLength).trim() + '...';
}

// Gradient colors for cards
const gradients = [
  'from-violet-500/20 to-fuchsia-500/20',
  'from-cyan-500/20 to-blue-500/20',
  'from-emerald-500/20 to-teal-500/20',
  'from-orange-500/20 to-rose-500/20',
  'from-pink-500/20 to-purple-500/20',
  'from-amber-500/20 to-yellow-500/20',
];

const borderGradients = [
  'hover:border-violet-500/30',
  'hover:border-cyan-500/30',
  'hover:border-emerald-500/30',
  'hover:border-orange-500/30',
  'hover:border-pink-500/30',
  'hover:border-amber-500/30',
];

export function ReviewTeamSection({ reviewers, isAdmin = false }: ReviewTeamSectionProps) {
  // No reviewers - show appropriate message based on user type
  if (reviewers.length === 0) {
    return (
      <section className="relative py-20 md:py-28">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-violet-500/10 rounded-full blur-[128px]" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-fuchsia-500/10 rounded-full blur-[128px]" />
        
        <div className="relative container mx-auto px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6">
              <Users className="h-4 w-4 text-white/40" />
              <span className="text-sm font-medium text-white/60">Review Team</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Meet Our Reviewers
            </h2>
          </div>
          
          {/* Empty State Card */}
          <div className="max-w-md mx-auto">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-500/50 to-fuchsia-500/50 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-500" />
              <div className="relative p-8 rounded-2xl bg-slate-900/80 backdrop-blur-xl border border-white/10 text-center">
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center">
                  <Users className="h-10 w-10 text-violet-400" />
                </div>
                {isAdmin ? (
                  <>
                    <h3 className="text-xl font-semibold text-white mb-3">No Reviewers Yet</h3>
                    <p className="text-white/50 mb-6">
                      Add reviewers to help evaluate talk submissions. Their profiles will appear here.
                    </p>
                    <Button asChild className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 border-0">
                      <Link href="/admin/reviewers">
                        <UserPlus className="h-4 w-4 mr-2" />
                        Manage Reviewers
                      </Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <h3 className="text-xl font-semibold text-white mb-3">Review Team Coming Soon</h3>
                    <p className="text-white/50">
                      Our expert review team profiles will be displayed here once available.
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative py-20 md:py-28 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900" />
      <div className="absolute top-20 right-20 w-96 h-96 bg-violet-500/10 rounded-full blur-[128px]" />
      <div className="absolute bottom-20 left-20 w-96 h-96 bg-fuchsia-500/10 rounded-full blur-[128px]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
      
      <div className="relative container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 mb-6">
            <Sparkles className="h-4 w-4 text-violet-400" />
            <span className="text-sm font-medium text-violet-400">{reviewers.length} Expert{reviewers.length !== 1 ? 's' : ''}</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
            Meet Our <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">Review Team</span>
          </h2>
          <p className="text-lg text-white/50 max-w-2xl mx-auto">
            Our expert reviewers bring diverse experience and perspectives to ensure every submission receives thoughtful, fair evaluation.
          </p>
        </div>

        {/* Reviewer Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {reviewers.map((reviewer, index) => {
            const gradientClass = gradients[index % gradients.length];
            const borderClass = borderGradients[index % borderGradients.length];
            
            return (
              <div key={reviewer.id} className="group">
                {/* Card with glow effect */}
                <div className="relative h-full">
                  {/* Glow */}
                  <div className={`absolute -inset-0.5 bg-gradient-to-r ${gradientClass} rounded-2xl blur opacity-0 group-hover:opacity-100 transition-all duration-500`} />
                  
                  {/* Card */}
                  <div className={`relative h-full p-6 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10 ${borderClass} transition-all duration-300 group-hover:bg-slate-900/80`}>
                    {/* Avatar */}
                    <div className="flex justify-center mb-5">
                      <div className="relative">
                        <div className="absolute -inset-1 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full opacity-0 group-hover:opacity-50 blur transition-all duration-500" />
                        <Avatar className="relative h-20 w-20 ring-2 ring-white/10 group-hover:ring-white/20 transition-all">
                          <AvatarImage src={reviewer.photoUrl || undefined} alt={reviewer.fullName} />
                          <AvatarFallback className="text-lg bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 text-white font-semibold">
                            {getInitials(reviewer.fullName)}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    </div>

                    {/* Name & Title */}
                    <div className="text-center mb-4">
                      <h3 className="font-semibold text-lg text-white group-hover:text-white/90 transition-colors">
                        {reviewer.fullName}
                      </h3>
                      {(reviewer.designation || reviewer.company) && (
                        <p className="text-sm text-white/40 mt-1">
                          {reviewer.designation}
                          {reviewer.designation && reviewer.company && ' at '}
                          <span className="text-white/50">{reviewer.company}</span>
                        </p>
                      )}
                    </div>

                    {/* Bio */}
                    {reviewer.bio && (
                      <p className="text-sm text-white/40 text-center mb-4 line-clamp-3">
                        {truncateBio(reviewer.bio)}
                      </p>
                    )}

                    {/* Expertise Tags */}
                    {reviewer.expertiseAreas.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 justify-center mb-4">
                        {reviewer.expertiseAreas.slice(0, 3).map((area) => (
                          <Badge 
                            key={area} 
                            variant="secondary" 
                            className="text-xs bg-white/5 text-white/60 border border-white/10 hover:bg-white/10"
                          >
                            {area}
                          </Badge>
                        ))}
                        {reviewer.expertiseAreas.length > 3 && (
                          <Badge 
                            variant="outline" 
                            className="text-xs border-white/10 text-white/40"
                          >
                            +{reviewer.expertiseAreas.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Social Links */}
                    {(reviewer.linkedinUrl || reviewer.twitterHandle || reviewer.githubUsername || reviewer.websiteUrl) && (
                      <div className="flex gap-3 justify-center pt-4 border-t border-white/5">
                        {reviewer.linkedinUrl && (
                          <a
                            href={reviewer.linkedinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all"
                          >
                            <Linkedin className="h-4 w-4" />
                          </a>
                        )}
                        {reviewer.twitterHandle && (
                          <a
                            href={`https://twitter.com/${reviewer.twitterHandle}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all"
                          >
                            <Twitter className="h-4 w-4" />
                          </a>
                        )}
                        {reviewer.githubUsername && (
                          <a
                            href={`https://github.com/${reviewer.githubUsername}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all"
                          >
                            <Github className="h-4 w-4" />
                          </a>
                        )}
                        {reviewer.websiteUrl && (
                          <a
                            href={reviewer.websiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all"
                          >
                            <Globe className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {isAdmin && (
          <div className="text-center mt-12">
            <Button variant="outline" asChild className="border-white/20 text-white hover:bg-white/10 hover:border-white/30">
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
