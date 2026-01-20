/**
 * Topics API Routes
 * 
 * GET: List all active topics (public)
 * POST: Create new topic (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// =============================================================================
// GET - List all active topics
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const limit = parseInt(searchParams.get('limit') || '500', 10);
    
    const where: Record<string, unknown> = {};
    
    // Filter by active status (unless admin requests inactive)
    if (!includeInactive) {
      where.isActive = true;
    }
    
    // Search by name
    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive',
      };
    }
    
    // Filter by category
    if (category) {
      where.category = category;
    }
    
    const topics = await prisma.topic.findMany({
      where,
      orderBy: [
        { category: 'asc' },
        { sortOrder: 'asc' },
        { name: 'asc' },
      ],
      take: limit,
    });
    
    // Get unique categories
    const categories = await prisma.topic.groupBy({
      by: ['category'],
      where: { isActive: true },
      orderBy: { category: 'asc' },
    });
    
    return NextResponse.json({
      topics,
      categories: categories.map(c => c.category).filter(Boolean),
      total: topics.length,
    });
  } catch (error) {
    console.error('Error fetching topics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch topics' },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST - Create new topic (admin only)
// =============================================================================

const createTopicSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
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
    
    // Only admins can create topics
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const data = createTopicSchema.parse(body);
    
    // Check if topic already exists
    const existing = await prisma.topic.findUnique({
      where: { name: data.name },
    });
    
    if (existing) {
      // If inactive, reactivate it
      if (!existing.isActive) {
        const updated = await prisma.topic.update({
          where: { id: existing.id },
          data: {
            isActive: true,
            category: data.category || existing.category,
            description: data.description || existing.description,
          },
        });
        return NextResponse.json(updated);
      }
      
      return NextResponse.json(
        { error: 'Topic already exists' },
        { status: 409 }
      );
    }
    
    // Get max sort order for category
    const maxSortOrder = await prisma.topic.aggregate({
      _max: { sortOrder: true },
      where: { category: data.category },
    });
    
    const topic = await prisma.topic.create({
      data: {
        name: data.name,
        category: data.category || null,
        description: data.description || null,
        sortOrder: (maxSortOrder._max.sortOrder || 0) + 1,
      },
    });
    
    return NextResponse.json(topic, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating topic:', error);
    return NextResponse.json(
      { error: 'Failed to create topic' },
      { status: 500 }
    );
  }
}
