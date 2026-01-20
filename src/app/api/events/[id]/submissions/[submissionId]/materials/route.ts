/**
 * Submission Materials API
 * 
 * GET /api/events/[id]/submissions/[submissionId]/materials - List materials
 * POST /api/events/[id]/submissions/[submissionId]/materials - Add a material
 * DELETE /api/events/[id]/submissions/[submissionId]/materials - Delete a material
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getAuthenticatedUser, canReviewEvent } from '@/lib/api/auth';
import {
  successResponse,
  createdResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  noContentResponse,
  errorResponse,
  handleApiError,
} from '@/lib/api/response';
import { createMaterialSchema } from '@/lib/validations/submission';

interface RouteParams {
  params: Promise<{ id: string; submissionId: string }>;
}

// ============================================================================
// GET /api/events/[id]/submissions/[submissionId]/materials
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: eventId, submissionId } = await params;
    const { user, error } = await getAuthenticatedUser();
    
    if (!user) {
      return unauthorizedResponse(error);
    }
    
    // Check if submission exists and user has access
    const submission = await prisma.submission.findFirst({
      where: {
        id: submissionId,
        eventId,
      },
      select: {
        id: true,
        speakerId: true,
      },
    });
    
    if (!submission) {
      return notFoundResponse('Submission');
    }
    
    const isOwner = submission.speakerId === user.id;
    const canReview = await canReviewEvent(user, eventId);
    
    if (!isOwner && !canReview) {
      return forbiddenResponse('You do not have access to this submission');
    }
    
    const materials = await prisma.submissionMaterial.findMany({
      where: { submissionId },
      orderBy: { createdAt: 'asc' },
    });
    
    return successResponse(materials);
  } catch (error) {
    return handleApiError(error);
  }
}

// ============================================================================
// POST /api/events/[id]/submissions/[submissionId]/materials
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: eventId, submissionId } = await params;
    const { user, error } = await getAuthenticatedUser();
    
    if (!user) {
      return unauthorizedResponse(error);
    }
    
    // Check if submission exists and user is the owner
    const submission = await prisma.submission.findFirst({
      where: {
        id: submissionId,
        eventId,
      },
      select: {
        id: true,
        speakerId: true,
      },
    });
    
    if (!submission) {
      return notFoundResponse('Submission');
    }
    
    if (submission.speakerId !== user.id) {
      return forbiddenResponse('Only the speaker can add materials');
    }
    
    const body = await request.json();
    const data = createMaterialSchema.parse(body);
    
    // Must have either fileUrl or externalUrl
    if (!data.fileUrl && !data.externalUrl) {
      return errorResponse('Either file URL or external URL is required', 400);
    }
    
    const material = await prisma.submissionMaterial.create({
      data: {
        submissionId,
        type: data.type,
        title: data.title,
        description: data.description,
        fileUrl: data.fileUrl,
        externalUrl: data.externalUrl,
        fileName: data.fileName,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
      },
    });
    
    return createdResponse(material);
  } catch (error) {
    return handleApiError(error);
  }
}

// ============================================================================
// DELETE /api/events/[id]/submissions/[submissionId]/materials
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: eventId, submissionId } = await params;
    const { user, error } = await getAuthenticatedUser();
    
    if (!user) {
      return unauthorizedResponse(error);
    }
    
    const searchParams = request.nextUrl.searchParams;
    const materialId = searchParams.get('materialId');
    
    if (!materialId) {
      return errorResponse('materialId query parameter is required', 400);
    }
    
    // Check if submission exists and user is the owner
    const submission = await prisma.submission.findFirst({
      where: {
        id: submissionId,
        eventId,
      },
      select: {
        id: true,
        speakerId: true,
      },
    });
    
    if (!submission) {
      return notFoundResponse('Submission');
    }
    
    if (submission.speakerId !== user.id) {
      return forbiddenResponse('Only the speaker can delete materials');
    }
    
    // Check if material exists
    const material = await prisma.submissionMaterial.findFirst({
      where: {
        id: materialId,
        submissionId,
      },
    });
    
    if (!material) {
      return notFoundResponse('Material');
    }
    
    await prisma.submissionMaterial.delete({
      where: { id: materialId },
    });
    
    return noContentResponse();
  } catch (error) {
    return handleApiError(error);
  }
}
