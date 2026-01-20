'use client';

/**
 * Reviewer Workload Component
 * 
 * Displays reviewer workload distribution across events.
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  User,
  BarChart3,
  MessageSquare
} from 'lucide-react';
import Link from 'next/link';

interface ReviewerData {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  reviewerProfile: {
    fullName: string;
    expertiseAreas: string[];
    onboardingCompleted: boolean;
  } | null;
  reviewCount: number;
  eventsAssigned: number;
  avgScore: number | null;
  pendingReviews: number;
}

interface ReviewerWorkloadProps {
  reviewers: ReviewerData[];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: { name: string; reviews: number };
  }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border">
        <p className="font-medium">{label}</p>
        <p className="text-sm text-slate-500">{payload[0].value} reviews</p>
      </div>
    );
  }
  return null;
}

function ReviewerCard({ reviewer }: { reviewer: ReviewerData }) {
  const initials = reviewer.name
    ? reviewer.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : reviewer.email[0].toUpperCase();
  
  const hasOnboarded = reviewer.reviewerProfile?.onboardingCompleted;
  const completionRate = reviewer.reviewCount > 0 && reviewer.pendingReviews >= 0
    ? Math.round((reviewer.reviewCount / (reviewer.reviewCount + reviewer.pendingReviews)) * 100)
    : 0;
  
  return (
    <Card className="hover:shadow-md transition-all duration-200">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={reviewer.image || undefined} />
            <AvatarFallback className="bg-slate-200 dark:bg-slate-700">
              {initials}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900 dark:text-white truncate">
                  {reviewer.reviewerProfile?.fullName || reviewer.name || reviewer.email}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{reviewer.email}</p>
              </div>
              <div className="flex items-center gap-1">
                {hasOnboarded ? (
                  <Badge variant="secondary" className="text-xs">
                    <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" />
                    Active
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">
                    <Clock className="h-3 w-3 mr-1 text-yellow-500" />
                    Pending Setup
                  </Badge>
                )}
              </div>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded">
                <p className="font-bold">{reviewer.reviewCount}</p>
                <p className="text-xs text-slate-500">Reviews</p>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded">
                <p className="font-bold">{reviewer.eventsAssigned}</p>
                <p className="text-xs text-slate-500">Events</p>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded">
                <p className="font-bold">{reviewer.pendingReviews}</p>
                <p className="text-xs text-slate-500">Pending</p>
              </div>
            </div>
            
            {/* Progress Bar */}
            {(reviewer.reviewCount + reviewer.pendingReviews) > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Completion</span>
                  <span>{completionRate}%</span>
                </div>
                <Progress value={completionRate} className="h-1.5" />
              </div>
            )}
            
            {/* Expertise */}
            {reviewer.reviewerProfile?.expertiseAreas && reviewer.reviewerProfile.expertiseAreas.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {reviewer.reviewerProfile.expertiseAreas.slice(0, 3).map((area) => (
                  <Badge key={area} variant="outline" className="text-xs">
                    {area}
                  </Badge>
                ))}
                {reviewer.reviewerProfile.expertiseAreas.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{reviewer.reviewerProfile.expertiseAreas.length - 3}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ReviewerWorkload({ reviewers }: ReviewerWorkloadProps) {
  // Prepare chart data
  const chartData = reviewers
    .filter(r => r.reviewCount > 0)
    .sort((a, b) => b.reviewCount - a.reviewCount)
    .slice(0, 10)
    .map(r => ({
      name: r.reviewerProfile?.fullName || r.name || r.email.split('@')[0],
      reviews: r.reviewCount,
    }));
  
  // Calculate summary stats
  const totalReviews = reviewers.reduce((sum, r) => sum + r.reviewCount, 0);
  const totalPending = reviewers.reduce((sum, r) => sum + r.pendingReviews, 0);
  const activeReviewers = reviewers.filter(r => r.reviewCount > 0).length;
  const avgReviewsPerReviewer = activeReviewers > 0 
    ? Math.round(totalReviews / activeReviewers) 
    : 0;
  
  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{reviewers.length}</p>
                <p className="text-sm text-slate-500">Total Reviewers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/50">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalReviews}</p>
                <p className="text-sm text-slate-500">Total Reviews</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/50">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalPending}</p>
                <p className="text-sm text-slate-500">Pending Reviews</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/50">
                <BarChart3 className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{avgReviewsPerReviewer}</p>
                <p className="text-sm text-slate-500">Avg per Reviewer</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Workload Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Review Distribution</CardTitle>
            <CardDescription>Top reviewers by number of reviews completed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    width={120}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="reviews" 
                    fill="#8b5cf6" 
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Reviewer Cards */}
      <div>
        <h3 className="text-lg font-semibold mb-4">All Reviewers</h3>
        {reviewers.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <User className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
              <p className="text-slate-500 dark:text-slate-400 mb-4">
                No reviewers assigned yet
              </p>
              <Button asChild>
                <Link href="/admin/users?role=REVIEWER">
                  Add Reviewers
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {reviewers.map((reviewer) => (
              <ReviewerCard key={reviewer.id} reviewer={reviewer} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
