'use client';

/**
 * Modern Review Team Section
 * 
 * Glassmorphism cards with gradient accents, smooth animations,
 * and expandable slide-down functionality to show full bio.
 */

import { useState } from 'react';
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
  ChevronDown,
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

// Gradient colors for cards
const gradients = [
  { bg: 'from-violet-500/20 to-fuchsia-500/20', glow: 'from-violet-500/30 to-fuchsia-500/30', accent: 'violet' },
  { bg: 'from-cyan-500/20 to-blue-500/20', glow: 'from-cyan-500/30 to-blue-500/30', accent: 'cyan' },
  { bg: 'from-emerald-500/20 to-teal-500/20', glow: 'from-emerald-500/30 to-teal-500/30', accent: 'emerald' },
  { bg: 'from-orange-500/20 to-rose-500/20', glow: 'from-orange-500/30 to-rose-500/30', accent: 'orange' },
  { bg: 'from-pink-500/20 to-purple-500/20', glow: 'from-pink-500/30 to-purple-500/30', accent: 'pink' },
  { bg: 'from-amber-500/20 to-yellow-500/20', glow: 'from-amber-500/30 to-yellow-500/30', accent: 'amber' },
];

// Reviewer Card Component with slide-down expand functionality - light/dark mode support
function ReviewerCard({ reviewer, index }: { reviewer: Reviewer; index: number }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const gradient = gradients[index % gradients.length];
  const hasBio = reviewer.bio && reviewer.bio.length > 0;
  const hasSocialLinks = reviewer.linkedinUrl || reviewer.twitterHandle || reviewer.githubUsername || reviewer.websiteUrl;
  const hasExpandableContent = hasBio || reviewer.expertiseAreas.length > 2;
  
  return (
    <div className="group">
      <div className="relative">
        {/* Glow effect - only in dark mode */}
        <div className={`absolute -inset-0.5 bg-gradient-to-r ${gradient.glow} rounded-2xl blur opacity-0 dark:group-hover:opacity-100 transition-all duration-500`} />
        
        {/* Card content - light/dark mode support */}
        <div className="relative rounded-2xl bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 group-hover:border-slate-300 dark:group-hover:border-white/20 group-hover:bg-white dark:group-hover:bg-slate-900/80 group-hover:shadow-lg dark:group-hover:shadow-none transition-all duration-300 overflow-hidden">
          {/* Clickable header area */}
          <div 
            className={`p-6 ${hasExpandableContent ? 'cursor-pointer' : ''}`}
            onClick={() => hasExpandableContent && setIsExpanded(!isExpanded)}
          >
            {/* Avatar with gradient ring */}
            <div className="flex justify-center mb-5">
              <div className="relative">
                <div className={`absolute -inset-1.5 bg-gradient-to-r ${gradient.glow} rounded-full opacity-0 group-hover:opacity-75 blur-sm transition-all duration-500`} />
                <Avatar className="relative h-24 w-24 ring-2 ring-slate-200 dark:ring-white/10 group-hover:ring-slate-300 dark:group-hover:ring-white/30 transition-all shadow-xl">
                  <AvatarImage src={reviewer.photoUrl || undefined} alt={reviewer.fullName} className="object-cover" />
                  <AvatarFallback className={`text-xl bg-gradient-to-br ${gradient.bg} text-slate-700 dark:text-white font-bold`}>
                    {getInitials(reviewer.fullName)}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>

            {/* Name */}
            <h3 className="font-bold text-lg text-slate-900 dark:text-white text-center mb-1 group-hover:text-slate-700 dark:group-hover:text-white transition-colors">
              {reviewer.fullName}
            </h3>
            
            {/* Designation & Company */}
            {(reviewer.designation || reviewer.company) && (
              <p className="text-sm text-center mb-4">
                {reviewer.designation && (
                  <span className="text-slate-500 dark:text-white/60">{reviewer.designation}</span>
                )}
                {reviewer.designation && reviewer.company && (
                  <span className="text-slate-400 dark:text-white/40"> at </span>
                )}
                {reviewer.company && (
                  <span className="text-slate-600 dark:text-white/70 font-medium">{reviewer.company}</span>
                )}
              </p>
            )}

            {/* Expertise Tags - show first 2 when collapsed */}
            {reviewer.expertiseAreas.length > 0 && !isExpanded && (
              <div className="flex flex-wrap gap-1.5 justify-center mb-4">
                {reviewer.expertiseAreas.slice(0, 2).map((area) => (
                  <Badge 
                    key={area} 
                    className="text-xs bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/60 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 px-2 py-0.5"
                  >
                    {area}
                  </Badge>
                ))}
                {reviewer.expertiseAreas.length > 2 && (
                  <Badge 
                    className="text-xs bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-white/40 border border-slate-200 dark:border-white/10 px-2 py-0.5"
                  >
                    +{reviewer.expertiseAreas.length - 2}
                  </Badge>
                )}
              </div>
            )}

            {/* Social Links Row */}
            {hasSocialLinks && !isExpanded && (
              <div className="flex gap-2 justify-center pt-3 border-t border-slate-100 dark:border-white/5">
                {reviewer.linkedinUrl && (
                  <a
                    href={reviewer.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-white/40 hover:text-[#0A66C2] hover:bg-[#0A66C2]/10 transition-all"
                  >
                    <Linkedin className="h-4 w-4" />
                  </a>
                )}
                {reviewer.twitterHandle && (
                  <a
                    href={`https://twitter.com/${reviewer.twitterHandle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-white/40 hover:text-[#1DA1F2] hover:bg-[#1DA1F2]/10 transition-all"
                  >
                    <Twitter className="h-4 w-4" />
                  </a>
                )}
                {reviewer.githubUsername && (
                  <a
                    href={`https://github.com/${reviewer.githubUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-white/40 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
                  >
                    <Github className="h-4 w-4" />
                  </a>
                )}
                {reviewer.websiteUrl && (
                  <a
                    href={reviewer.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-white/40 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-500/10 transition-all"
                  >
                    <Globe className="h-4 w-4" />
                  </a>
                )}
              </div>
            )}

            {/* Expand indicator */}
            {hasExpandableContent && (
              <div className={`flex items-center justify-center gap-1.5 mt-4 text-xs text-slate-400 dark:text-white/40 group-hover:text-slate-600 dark:group-hover:text-white/60 transition-colors ${isExpanded ? 'mb-0' : ''}`}>
                <span>{isExpanded ? 'Show less' : 'View full profile'}</span>
                <ChevronDown className={`h-3 w-3 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
              </div>
            )}
          </div>

          {/* Expandable Content - Smooth slide down */}
          <div 
            className={`grid transition-all duration-500 ease-in-out ${
              isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
            }`}
          >
            <div className="overflow-hidden">
              <div className="px-6 pb-6 pt-2 border-t border-slate-100 dark:border-white/10">
                {/* Full Bio */}
                {reviewer.bio && (
                  <div className="mb-5">
                    <h4 className="text-xs font-semibold text-slate-400 dark:text-white/50 uppercase tracking-wider mb-2">About</h4>
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                      <p className="text-sm text-slate-600 dark:text-white/70 leading-relaxed whitespace-pre-wrap">
                        {reviewer.bio}
                      </p>
                    </div>
                  </div>
                )}

                {/* All Expertise Tags */}
                {reviewer.expertiseAreas.length > 0 && (
                  <div className="mb-5">
                    <h4 className="text-xs font-semibold text-slate-400 dark:text-white/50 uppercase tracking-wider mb-2">Expertise</h4>
                    <div className="flex flex-wrap gap-2">
                      {reviewer.expertiseAreas.map((area) => (
                        <Badge 
                          key={area} 
                          className="bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/70 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 px-3 py-1"
                        >
                          {area}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Social Links - Full version */}
                {hasSocialLinks && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-400 dark:text-white/50 uppercase tracking-wider mb-2">Connect</h4>
                    <div className="flex flex-wrap gap-2">
                      {reviewer.linkedinUrl && (
                        <a
                          href={reviewer.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#0A66C2]/10 text-[#0A66C2] hover:bg-[#0A66C2]/20 transition-all text-sm font-medium"
                        >
                          <Linkedin className="h-4 w-4" />
                          <span>LinkedIn</span>
                        </a>
                      )}
                      {reviewer.twitterHandle && (
                        <a
                          href={`https://twitter.com/${reviewer.twitterHandle}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#1DA1F2]/10 text-[#1DA1F2] hover:bg-[#1DA1F2]/20 transition-all text-sm font-medium"
                        >
                          <Twitter className="h-4 w-4" />
                          <span>Twitter</span>
                        </a>
                      )}
                      {reviewer.githubUsername && (
                        <a
                          href={`https://github.com/${reviewer.githubUsername}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/70 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-all text-sm font-medium"
                        >
                          <Github className="h-4 w-4" />
                          <span>GitHub</span>
                        </a>
                      )}
                      {reviewer.websiteUrl && (
                        <a
                          href={reviewer.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 hover:bg-violet-500/20 transition-all text-sm font-medium"
                        >
                          <Globe className="h-4 w-4" />
                          <span>Website</span>
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ReviewTeamSection({ reviewers, isAdmin = false }: ReviewTeamSectionProps) {
  // No reviewers - show appropriate message based on user type
  if (reviewers.length === 0) {
    return (
      <section className="relative py-20 md:py-28">
        {/* Background - light/dark mode */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-100 via-slate-50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-violet-500/10 rounded-full blur-[128px]" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-fuchsia-500/10 rounded-full blur-[128px]" />
        
        <div className="relative container mx-auto px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-200/50 dark:bg-white/5 border border-slate-300 dark:border-white/10 mb-6">
              <Users className="h-4 w-4 text-slate-400 dark:text-white/40" />
              <span className="text-sm font-medium text-slate-500 dark:text-white/60">Review Team</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Meet Our Reviewers
            </h2>
          </div>
          
          {/* Empty State Card */}
          <div className="max-w-md mx-auto">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-500/50 to-fuchsia-500/50 rounded-2xl blur opacity-0 dark:opacity-30 dark:group-hover:opacity-50 transition duration-500" />
              <div className="relative p-8 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-white/10 text-center shadow-lg dark:shadow-none">
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center">
                  <Users className="h-10 w-10 text-violet-500 dark:text-violet-400" />
                </div>
                {isAdmin ? (
                  <>
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">No Reviewers Yet</h3>
                    <p className="text-slate-500 dark:text-white/50 mb-6">
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
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">Review Team Coming Soon</h3>
                    <p className="text-slate-500 dark:text-white/50">
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
      {/* Background - light/dark mode */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-200/50 via-slate-100 to-slate-200/50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900" />
      <div className="absolute top-20 right-20 w-96 h-96 bg-violet-500/10 rounded-full blur-[128px]" />
      <div className="absolute bottom-20 left-20 w-96 h-96 bg-fuchsia-500/10 rounded-full blur-[128px]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
      
      <div className="relative container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 mb-6">
            <Sparkles className="h-4 w-4 text-violet-500 dark:text-violet-400" />
            <span className="text-sm font-medium text-violet-600 dark:text-violet-400">{reviewers.length} Expert{reviewers.length !== 1 ? 's' : ''}</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-4">
            Meet Our <span className="bg-gradient-to-r from-violet-600 to-fuchsia-600 dark:from-violet-400 dark:to-fuchsia-400 bg-clip-text text-transparent">Review Team</span>
          </h2>
          <p className="text-lg text-slate-600 dark:text-white/50 max-w-2xl mx-auto">
            Our expert reviewers bring diverse experience and perspectives to ensure every submission receives thoughtful, fair evaluation.
          </p>
        </div>

        {/* Reviewer Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {reviewers.map((reviewer, index) => (
            <ReviewerCard key={reviewer.id} reviewer={reviewer} index={index} />
          ))}
        </div>

        {isAdmin && (
          <div className="text-center mt-12">
            <Button variant="outline" asChild className="border-slate-300 dark:border-white/20 text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 hover:border-slate-400 dark:hover:border-white/30">
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
