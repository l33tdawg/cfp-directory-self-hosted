/**
 * File Serving API Route
 * 
 * GET /api/files/[...path]
 * 
 * Serves files from storage with proper authentication and content type handling.
 * Supports both public and private files based on metadata.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { getStorage, StorageError } from '@/lib/storage';
import { prisma } from '@/lib/db/prisma';

// MIME type mappings for common extensions
const EXTENSION_MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.odp': 'application/vnd.oasis.opendocument.presentation',
  '.key': 'application/vnd.apple.keynote',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.json': 'application/json',
};

/**
 * Get MIME type from file extension
 */
function getMimeType(filePath: string): string {
  const ext = filePath.substring(filePath.lastIndexOf('.')).toLowerCase();
  return EXTENSION_MIME_TYPES[ext] || 'application/octet-stream';
}

/**
 * Extract submission ID from file path if it's a submission material
 * Path format: submissions/{submissionId}/materials/{filename}
 */
function extractSubmissionIdFromPath(filePath: string): string | null {
  const match = filePath.match(/^submissions\/([^\/]+)\/materials\//);
  return match ? match[1] : null;
}

/**
 * Check if user has access to a submission's files
 * Access is granted to:
 * - The submission speaker (owner)
 * - Review team members for the event
 * - Admins and Organizers
 */
async function hasSubmissionFileAccess(
  userId: string,
  userRole: string,
  submissionId: string
): Promise<boolean> {
  // Admins and Organizers have full access
  if (['ADMIN', 'ORGANIZER'].includes(userRole)) {
    return true;
  }
  
  // Find the submission
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    select: {
      speakerId: true,
      eventId: true,
    },
  });
  
  if (!submission) {
    return false;
  }
  
  // Speaker (owner) has access
  if (submission.speakerId === userId) {
    return true;
  }
  
  // Check if user is on the review team for this event
  const reviewTeamMember = await prisma.reviewTeamMember.findUnique({
    where: {
      eventId_userId: {
        eventId: submission.eventId,
        userId: userId,
      },
    },
  });
  
  return !!reviewTeamMember;
}

/**
 * GET handler - Serve files
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const filePath = resolvedParams.path.join('/');
    const storage = getStorage();

    // Check if file exists
    const exists = await storage.exists(filePath);
    if (!exists) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Get file metadata
    let metadata;
    try {
      metadata = await storage.getMetadata(filePath);
    } catch {
      // Continue without metadata
      metadata = null;
    }

    // Check authentication for private files
    if (metadata && !metadata.isPublic) {
      const session = await auth();
      if (!session?.user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      // Additional authorization checks for submission materials
      const submissionId = extractSubmissionIdFromPath(filePath);
      if (submissionId) {
        const hasAccess = await hasSubmissionFileAccess(
          session.user.id,
          session.user.role,
          submissionId
        );
        
        if (!hasAccess) {
          return NextResponse.json(
            { error: 'Access denied to this file' },
            { status: 403 }
          );
        }
      }
    }

    // Download the file
    const fileBuffer = await storage.download(filePath);

    // Determine content type
    const contentType = metadata?.contentType || getMimeType(filePath);

    // Convert Buffer to Uint8Array for NextResponse
    const uint8Array = new Uint8Array(fileBuffer);

    // Create response with proper headers
    const response = new NextResponse(uint8Array, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': metadata?.isPublic 
          ? 'public, max-age=31536000, immutable' 
          : 'private, max-age=3600',
      },
    });

    // Add content disposition for downloads
    const isDownload = request.nextUrl.searchParams.get('download') === 'true';
    if (isDownload) {
      const filename = filePath.split('/').pop() || 'file';
      response.headers.set(
        'Content-Disposition',
        `attachment; filename="${filename}"`
      );
    }

    return response;
  } catch (error) {
    console.error('File serving error:', error);

    if (error instanceof StorageError) {
      if (error.code === 'NOT_FOUND') {
        return NextResponse.json(
          { error: 'File not found' },
          { status: 404 }
        );
      }
      if (error.code === 'PERMISSION_DENIED') {
        return NextResponse.json(
          { error: 'Permission denied' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to serve file' },
      { status: 500 }
    );
  }
}

/**
 * HEAD handler - Get file info without downloading
 */
export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const filePath = resolvedParams.path.join('/');
    const storage = getStorage();

    // Check if file exists
    const exists = await storage.exists(filePath);
    if (!exists) {
      return new NextResponse(null, { status: 404 });
    }

    // Get file metadata
    const metadata = await storage.getMetadata(filePath);
    const contentType = metadata.contentType || getMimeType(filePath);

    return new NextResponse(null, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': metadata.size.toString(),
        'Last-Modified': metadata.lastModified.toUTCString(),
      },
    });
  } catch {
    return new NextResponse(null, { status: 500 });
  }
}
