'use client';

/**
 * Submission Chart Component
 * 
 * Displays submission statistics as a bar or area chart.
 * Uses Recharts for visualization.
 */

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Status colors matching cfp.directory
const STATUS_COLORS = {
  PENDING: '#f59e0b', // amber-500
  UNDER_REVIEW: '#3b82f6', // blue-500
  ACCEPTED: '#22c55e', // green-500
  REJECTED: '#ef4444', // red-500
  WAITLISTED: '#8b5cf6', // purple-500
  WITHDRAWN: '#6b7280', // gray-500
};

interface StatusData {
  status: string;
  count: number;
  [key: string]: string | number; // Index signature for Recharts compatibility
}

interface TimeSeriesData {
  date: string;
  submissions: number;
  accepted?: number;
  rejected?: number;
  [key: string]: string | number | undefined; // Index signature for Recharts compatibility
}

interface SubmissionChartProps {
  title?: string;
  description?: string;
  type?: 'bar' | 'area' | 'pie';
  data: StatusData[] | TimeSeriesData[];
  className?: string;
}

export function SubmissionChart({
  title = 'Submissions',
  description,
  type = 'bar',
  data,
  className,
}: SubmissionChartProps) {
  // Format status labels
  const formatStatus = (status: string) => {
    return status.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
          <p className="text-sm font-medium text-slate-900 dark:text-white mb-1">
            {formatStatus(label)}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm text-slate-600 dark:text-slate-400">
              {entry.name}: <span className="font-medium">{entry.value}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    if (type === 'pie') {
      const pieData = (data as StatusData[]).filter(d => d.count > 0);
      
      return (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={pieData}
              dataKey="count"
              nameKey="status"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label={({ name, value }) => `${formatStatus(String(name))}: ${value}`}
              labelLine={false}
            >
              {pieData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={STATUS_COLORS[entry.status as keyof typeof STATUS_COLORS] || '#6b7280'} 
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              formatter={(value) => formatStatus(value)}
              wrapperStyle={{ paddingTop: '20px' }}
            />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    if (type === 'area') {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data as TimeSeriesData[]}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              className="text-slate-500"
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              className="text-slate-500"
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="submissions"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.2}
            />
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    // Default: bar chart
    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data as StatusData[]}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
          <XAxis 
            dataKey="status" 
            tick={{ fontSize: 12 }}
            tickFormatter={formatStatus}
            className="text-slate-500"
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            className="text-slate-500"
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {(data as StatusData[]).map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={STATUS_COLORS[entry.status as keyof typeof STATUS_COLORS] || '#6b7280'} 
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          renderChart()
        ) : (
          <div className="h-[300px] flex items-center justify-center text-slate-500">
            No data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Simple Status Distribution Chart
 */
export function StatusDistributionChart({
  data,
  className,
}: {
  data: StatusData[];
  className?: string;
}) {
  const total = useMemo(() => data.reduce((sum, d) => sum + d.count, 0), [data]);

  if (total === 0) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">Status Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.filter(d => d.count > 0).map(({ status, count }) => {
            const percentage = Math.round((count / total) * 100);
            const color = STATUS_COLORS[status as keyof typeof STATUS_COLORS] || '#6b7280';
            
            return (
              <div key={status}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-slate-600 dark:text-slate-400">
                    {status.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {count} ({percentage}%)
                  </span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
