/**
 * Bulk Topics API Routes
 * 
 * POST: Bulk import topics (admin only)
 * DELETE: Bulk delete topics (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

// =============================================================================
// POST - Bulk import topics (admin only)
// =============================================================================

const bulkImportSchema = z.object({
  topics: z.array(z.object({
    name: z.string().min(1).max(100),
    category: z.string().max(100).optional(),
    description: z.string().max(500).optional(),
  })),
  skipDuplicates: z.boolean().optional().default(true),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const { topics, skipDuplicates } = bulkImportSchema.parse(body);
    
    if (topics.length === 0) {
      return NextResponse.json(
        { error: 'No topics provided' },
        { status: 400 }
      );
    }
    
    if (topics.length > 500) {
      return NextResponse.json(
        { error: 'Maximum 500 topics per import' },
        { status: 400 }
      );
    }
    
    // Get existing topic names
    const existingTopics = await prisma.topic.findMany({
      select: { name: true },
    });
    const existingNames = new Set(existingTopics.map(t => t.name.toLowerCase()));
    
    // Filter out duplicates if requested
    const newTopics = skipDuplicates
      ? topics.filter(t => !existingNames.has(t.name.toLowerCase()))
      : topics;
    
    if (newTopics.length === 0) {
      return NextResponse.json({
        imported: 0,
        skipped: topics.length,
        message: 'All topics already exist',
      });
    }
    
    // Get max sort order per category
    const categorySortOrders = new Map<string | null, number>();
    const categories = [...new Set(newTopics.map(t => t.category || null))];
    
    for (const category of categories) {
      const maxSortOrder = await prisma.topic.aggregate({
        _max: { sortOrder: true },
        where: { category },
      });
      categorySortOrders.set(category, maxSortOrder._max.sortOrder || 0);
    }
    
    // Prepare topics for creation
    const topicsToCreate = newTopics.map((topic, index) => {
      const category = topic.category || null;
      const currentOrder = categorySortOrders.get(category) || 0;
      const newOrder = currentOrder + index + 1;
      categorySortOrders.set(category, newOrder);
      
      return {
        name: topic.name,
        category,
        description: topic.description || null,
        sortOrder: newOrder,
        isActive: true,
        usageCount: 0,
      };
    });
    
    // Create topics
    const result = await prisma.topic.createMany({
      data: topicsToCreate,
      skipDuplicates: true,
    });
    
    return NextResponse.json({
      imported: result.count,
      skipped: topics.length - newTopics.length,
      message: `Successfully imported ${result.count} topics`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error importing topics:', error);
    return NextResponse.json(
      { error: 'Failed to import topics' },
      { status: 500 }
    );
  }
}

// =============================================================================
// DELETE - Bulk delete/deactivate topics (admin only)
// =============================================================================

const bulkDeleteSchema = z.object({
  ids: z.array(z.string()).min(1).max(100),
  permanent: z.boolean().optional().default(false),
});

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const { ids, permanent } = bulkDeleteSchema.parse(body);
    
    if (permanent) {
      // Permanent delete
      const result = await prisma.topic.deleteMany({
        where: { id: { in: ids } },
      });
      
      return NextResponse.json({
        deleted: result.count,
        message: `Permanently deleted ${result.count} topics`,
      });
    } else {
      // Soft delete (deactivate)
      const result = await prisma.topic.updateMany({
        where: { id: { in: ids } },
        data: { isActive: false },
      });
      
      return NextResponse.json({
        deactivated: result.count,
        message: `Deactivated ${result.count} topics`,
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error deleting topics:', error);
    return NextResponse.json(
      { error: 'Failed to delete topics' },
      { status: 500 }
    );
  }
}
