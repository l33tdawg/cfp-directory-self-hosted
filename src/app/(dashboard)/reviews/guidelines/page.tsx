/**
 * Review Guidelines Page
 * 
 * Best practices and tips for providing effective, constructive reviews.
 */

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle2, 
  Target, 
  MessageSquare, 
  AlertCircle,
  Star,
  Shield,
  BookOpen,
  Zap
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ReviewerGuidelinesPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/signin?callbackUrl=/reviews/guidelines');
  }

  // Allow access for REVIEWER, ORGANIZER, and ADMIN roles
  const allowedRoles = ['REVIEWER', 'ORGANIZER', 'ADMIN'];
  if (!allowedRoles.includes(session.user.role || '')) {
    redirect('/dashboard?error=reviewer_role_required');
  }
    
  return (
    <div className="container py-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Review Guidelines</h1>
        <p className="text-muted-foreground mt-1">
          Best practices and tips for providing effective, constructive reviews
        </p>
      </div>

      {/* Quick Tips Alert */}
      <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
        <Zap className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800 dark:text-blue-300">
          <strong>Quick Tip:</strong> The best reviews are specific, constructive, and actionable. 
          Focus on helping speakers improve their proposals!
        </AlertDescription>
      </Alert>

      {/* Core Principles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Core Review Principles
          </CardTitle>
          <CardDescription>
            Follow these principles to ensure fair and helpful reviews
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-medium">Be Constructive</h4>
                  <p className="text-sm text-muted-foreground">
                    Focus on how the submission can be improved, not just what&apos;s wrong
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-medium">Stay Objective</h4>
                  <p className="text-sm text-muted-foreground">
                    Evaluate based on content quality, not personal preferences
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-medium">Be Specific</h4>
                  <p className="text-sm text-muted-foreground">
                    Provide concrete examples and actionable feedback
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-medium">Consider the Audience</h4>
                  <p className="text-sm text-muted-foreground">
                    Evaluate if the talk matches the event&apos;s target audience
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Review Process */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            The Review Process
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold">1</span>
              </div>
              <div className="space-y-1">
                <h4 className="font-medium">Read Thoroughly</h4>
                <p className="text-sm text-muted-foreground">
                  Read the entire submission carefully, including abstract, outline, and speaker notes
                </p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold">2</span>
              </div>
              <div className="space-y-1">
                <h4 className="font-medium">Check Alignment</h4>
                <p className="text-sm text-muted-foreground">
                  Verify the talk aligns with the event&apos;s theme, audience level, and format requirements
                </p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold">3</span>
              </div>
              <div className="space-y-1">
                <h4 className="font-medium">Evaluate Content</h4>
                <p className="text-sm text-muted-foreground">
                  Assess the technical accuracy, relevance, originality, and practical value
                </p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold">4</span>
              </div>
              <div className="space-y-1">
                <h4 className="font-medium">Provide Feedback</h4>
                <p className="text-sm text-muted-foreground">
                  Write constructive comments for both the speaker and the organizing team
                </p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold">5</span>
              </div>
              <div className="space-y-1">
                <h4 className="font-medium">Score Fairly</h4>
                <p className="text-sm text-muted-foreground">
                  Use the scoring rubric consistently across all submissions
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scoring Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" />
            Scoring Guide
          </CardTitle>
          <CardDescription>
            How to use the 5-star rating system effectively
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                ))}
              </div>
              <div>
                <span className="font-medium">Excellent</span>
                <span className="text-sm text-muted-foreground ml-2">
                  Outstanding proposal, perfectly aligned, highly valuable
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                {[...Array(4)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                ))}
                <Star className="h-4 w-4 text-gray-300" />
              </div>
              <div>
                <span className="font-medium">Very Good</span>
                <span className="text-sm text-muted-foreground ml-2">
                  Strong proposal with minor improvements needed
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                {[...Array(3)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                ))}
                {[...Array(2)].map((_, i) => (
                  <Star key={i + 3} className="h-4 w-4 text-gray-300" />
                ))}
              </div>
              <div>
                <span className="font-medium">Good</span>
                <span className="text-sm text-muted-foreground ml-2">
                  Solid proposal but needs some work
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                {[...Array(2)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                ))}
                {[...Array(3)].map((_, i) => (
                  <Star key={i + 2} className="h-4 w-4 text-gray-300" />
                ))}
              </div>
              <div>
                <span className="font-medium">Fair</span>
                <span className="text-sm text-muted-foreground ml-2">
                  Has potential but significant improvements needed
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                {[...Array(4)].map((_, i) => (
                  <Star key={i + 1} className="h-4 w-4 text-gray-300" />
                ))}
              </div>
              <div>
                <span className="font-medium">Poor</span>
                <span className="text-sm text-muted-foreground ml-2">
                  Not suitable in current form, major issues
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Do's and Don'ts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-green-200 dark:border-green-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-5 w-5" />
              Do&apos;s
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm">✓ Be respectful and professional</p>
            <p className="text-sm">✓ Provide specific examples</p>
            <p className="text-sm">✓ Suggest improvements</p>
            <p className="text-sm">✓ Consider speaker experience level</p>
            <p className="text-sm">✓ Review promptly</p>
            <p className="text-sm">✓ Use private notes for team discussion</p>
            <p className="text-sm">✓ Recuse yourself if there&apos;s a conflict</p>
          </CardContent>
        </Card>
        
        <Card className="border-red-200 dark:border-red-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
              <AlertCircle className="h-5 w-5" />
              Don&apos;ts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm">✗ Don&apos;t make personal attacks</p>
            <p className="text-sm">✗ Don&apos;t reveal speaker identity to others</p>
            <p className="text-sm">✗ Don&apos;t let bias influence your review</p>
            <p className="text-sm">✗ Don&apos;t rush through reviews</p>
            <p className="text-sm">✗ Don&apos;t share submission details publicly</p>
            <p className="text-sm">✗ Don&apos;t ignore the review criteria</p>
            <p className="text-sm">✗ Don&apos;t forget to submit your review</p>
          </CardContent>
        </Card>
      </div>

      {/* Code of Conduct */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Code of Conduct
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            As a reviewer, you play a crucial role in maintaining a respectful and inclusive environment.
            Always adhere to the event&apos;s code of conduct and ensure your reviews promote:
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">Inclusivity</Badge>
            <Badge variant="secondary">Respect</Badge>
            <Badge variant="secondary">Professionalism</Badge>
            <Badge variant="secondary">Fairness</Badge>
            <Badge variant="secondary">Confidentiality</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Contact Support */}
      <Alert>
        <MessageSquare className="h-4 w-4" />
        <AlertDescription>
          <strong>Need help?</strong> If you have questions about the review process or encounter any issues,
          contact your event organizer or admin.
        </AlertDescription>
      </Alert>
    </div>
  );
}
