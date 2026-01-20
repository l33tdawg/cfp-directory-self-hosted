/**
 * Admin Topics Management Page
 * 
 * Manage the database-driven topic system used across
 * speakers, talks, reviewers, and events.
 */

import { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { TopicManager } from '@/components/admin/topic-manager';

export const metadata: Metadata = {
  title: 'Manage Topics',
  description: 'Manage topics for speakers, talks, and events',
};

export default async function AdminTopicsPage() {
  const user = await getCurrentUser();
  
  if (user.role !== 'ADMIN') {
    redirect('/dashboard?error=unauthorized');
  }
  
  // Get initial topics data
  const [topics, categories, stats] = await Promise.all([
    prisma.topic.findMany({
      orderBy: [
        { category: 'asc' },
        { sortOrder: 'asc' },
        { name: 'asc' },
      ],
    }),
    prisma.topic.groupBy({
      by: ['category'],
      _count: { id: true },
      orderBy: { category: 'asc' },
    }),
    prisma.topic.aggregate({
      _count: { id: true },
      _sum: { usageCount: true },
      where: { isActive: true },
    }),
  ]);
  
  const categoryStats = categories.map(c => ({
    name: c.category || 'Uncategorized',
    count: c._count.id,
  }));
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          Manage Topics
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Topics are used for speaker expertise, talk tags, reviewer expertise, and event categorization.
        </p>
      </div>
      
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4">
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {stats._count.id}
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-400">
            Active Topics
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4">
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {categoryStats.length}
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-400">
            Categories
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4">
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {stats._sum.usageCount || 0}
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-400">
            Total Usage
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4">
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {topics.filter(t => !t.isActive).length}
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-400">
            Inactive Topics
          </div>
        </div>
      </div>
      
      {/* Topic Manager Component */}
      <TopicManager 
        initialTopics={topics}
        categoryStats={categoryStats}
      />
    </div>
  );
}
