/**
 * Email Templates API
 * 
 * GET - List all email templates
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    
    // Only admins can access email templates
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const templates = await prisma.emailTemplate.findMany({
      orderBy: [
        { category: 'asc' },
        { name: 'asc' },
      ],
    });

    // Group by category for easier UI display
    const byCategory = templates.reduce((acc, template) => {
      const category = template.category || 'general';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(template);
      return acc;
    }, {} as Record<string, typeof templates>);

    return NextResponse.json({
      templates,
      byCategory,
      total: templates.length,
    });
  } catch (error) {
    console.error('Failed to fetch email templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email templates' },
      { status: 500 }
    );
  }
}
