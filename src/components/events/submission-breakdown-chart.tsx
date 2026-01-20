'use client';

/**
 * Submission Breakdown Chart
 * 
 * Pie/donut chart showing submission status distribution.
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface SubmissionBreakdownChartProps {
  stats: {
    pending: number;
    accepted: number;
    rejected: number;
    underReview: number;
  };
  title?: string;
}

const COLORS = {
  pending: '#f59e0b',      // Yellow
  underReview: '#3b82f6',  // Blue
  accepted: '#22c55e',     // Green
  rejected: '#ef4444',     // Red
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: { name: string; value: number; color: string };
  }>;
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border">
        <p className="font-medium">{data.name}</p>
        <p className="text-sm text-slate-500">{data.value} submissions</p>
      </div>
    );
  }
  return null;
};

export function SubmissionBreakdownChart({ stats, title = 'Submission Status' }: SubmissionBreakdownChartProps) {
  const data = [
    { name: 'Pending', value: stats.pending, color: COLORS.pending },
    { name: 'Under Review', value: stats.underReview, color: COLORS.underReview },
    { name: 'Accepted', value: stats.accepted, color: COLORS.accepted },
    { name: 'Rejected', value: stats.rejected, color: COLORS.rejected },
  ].filter(item => item.value > 0);
  
  const total = stats.pending + stats.underReview + stats.accepted + stats.rejected;
  
  if (total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription>Distribution of submission statuses</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[200px]">
          <p className="text-slate-500 dark:text-slate-400">No submissions yet</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{total} total submissions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }: { name?: string; percent?: number }) => name && percent ? `${name} ${(percent * 100).toFixed(0)}%` : ''}
                labelLine={false}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                formatter={(value: string) => (
                  <span className="text-sm text-slate-600 dark:text-slate-400">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        {/* Stats summary */}
        <div className="grid grid-cols-4 gap-2 mt-4 text-center text-sm">
          <div>
            <p className="font-bold text-yellow-600">{stats.pending}</p>
            <p className="text-xs text-slate-500">Pending</p>
          </div>
          <div>
            <p className="font-bold text-blue-600">{stats.underReview}</p>
            <p className="text-xs text-slate-500">Reviewing</p>
          </div>
          <div>
            <p className="font-bold text-green-600">{stats.accepted}</p>
            <p className="text-xs text-slate-500">Accepted</p>
          </div>
          <div>
            <p className="font-bold text-red-600">{stats.rejected}</p>
            <p className="text-xs text-slate-500">Rejected</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
