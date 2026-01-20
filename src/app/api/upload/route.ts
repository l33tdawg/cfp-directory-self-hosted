/**
 * File Upload API Route
 * 
 * POST /api/upload
 * 
 * Handles file uploads with validation for size and type.
 * Requires authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { getStorage, StorageError, StoragePaths } from '@/lib/storage';
import { config } from '@/lib/env';
import { v4 as uuidv4 } from 'uuid';

// Upload type configuration
interface UploadTypeConfig {
  maxSize: number;
  allowedTypes: string[];
  getPath: (...args: string[]) => string;
  isPublic: boolean;
}

// Allowed upload types and their configurations
const UPLOAD_TYPES: Record<string, UploadTypeConfig> = {
  avatar: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    getPath: (userId: string, ext: string) => `${StoragePaths.avatar(userId)}${ext}`,
    isPublic: true,
  },
  'submission-material': {
    maxSize: config.storage.maxFileSizeBytes,
    allowedTypes: [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-powerpoint',
      'application/vnd.oasis.opendocument.presentation',
      'video/mp4',
      'video/webm',
      'image/jpeg',
      'image/png',
    ],
    getPath: (submissionId: string, filename: string) => 
      StoragePaths.submissionMaterial(submissionId, filename),
    isPublic: false,
  },
  'organization-logo': {
    maxSize: 2 * 1024 * 1024, // 2MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    getPath: (orgId: string, ext: string) => `${StoragePaths.organizationLogo(orgId)}${ext}`,
    isPublic: true,
  },
  'event-banner': {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    getPath: (eventId: string, ext: string) => `${StoragePaths.eventBanner(eventId)}${ext}`,
    isPublic: true,
  },
  temp: {
    maxSize: config.storage.maxFileSizeBytes,
    allowedTypes: config.storage.allowedTypes.map(t => getMimeFromExt(t)),
    getPath: (filename: string) => StoragePaths.temp(`${uuidv4()}-${filename}`),
    isPublic: false,
  },
};

type UploadType = keyof typeof UPLOAD_TYPES;

/**
 * Get MIME type from file extension
 */
function getMimeFromExt(ext: string): string {
  const mimeMap: Record<string, string> = {
    pdf: 'application/pdf',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ppt: 'application/vnd.ms-powerpoint',
    odp: 'application/vnd.oasis.opendocument.presentation',
    key: 'application/vnd.apple.keynote',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    mp4: 'video/mp4',
    webm: 'video/webm',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
  };
  return mimeMap[ext.toLowerCase()] || 'application/octet-stream';
}

/**
 * Get file extension from MIME type
 */
function getExtFromMime(mime: string): string {
  const extMap: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'application/pdf': '.pdf',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
    'application/vnd.ms-powerpoint': '.ppt',
    'application/vnd.oasis.opendocument.presentation': '.odp',
    'application/vnd.apple.keynote': '.key',
    'video/mp4': '.mp4',
    'video/webm': '.webm',
  };
  return extMap[mime] || '';
}

/**
 * Sanitize filename to prevent path traversal
 */
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.+/g, '.')
    .slice(0, 100);
}

/**
 * POST handler - Upload file
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const type = formData.get('type') as UploadType | null;
    const targetId = formData.get('targetId') as string | null;

    // Validate required fields
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!type || !UPLOAD_TYPES[type]) {
      return NextResponse.json(
        { error: 'Invalid upload type' },
        { status: 400 }
      );
    }

    const uploadConfig = UPLOAD_TYPES[type];

    // Check file size
    if (file.size > uploadConfig.maxSize) {
      const maxSizeMB = Math.round(uploadConfig.maxSize / (1024 * 1024));
      return NextResponse.json(
        { error: `File size exceeds maximum allowed (${maxSizeMB}MB)` },
        { status: 400 }
      );
    }

    // Check file type
    if (!uploadConfig.allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `File type "${file.type}" is not allowed` },
        { status: 400 }
      );
    }

    // Generate storage path based on type
    let storagePath: string;
    const ext = getExtFromMime(file.type);
    const sanitizedName = sanitizeFilename(file.name);

    switch (type) {
      case 'avatar':
        storagePath = uploadConfig.getPath(session.user.id, ext);
        break;
      case 'submission-material':
        if (!targetId) {
          return NextResponse.json(
            { error: 'Submission ID is required' },
            { status: 400 }
          );
        }
        storagePath = uploadConfig.getPath(targetId, `${uuidv4()}-${sanitizedName}`);
        break;
      case 'organization-logo':
        if (!targetId) {
          return NextResponse.json(
            { error: 'Organization ID is required' },
            { status: 400 }
          );
        }
        storagePath = uploadConfig.getPath(targetId, ext);
        break;
      case 'event-banner':
        if (!targetId) {
          return NextResponse.json(
            { error: 'Event ID is required' },
            { status: 400 }
          );
        }
        storagePath = uploadConfig.getPath(targetId, ext);
        break;
      case 'temp':
      default:
        storagePath = uploadConfig.getPath(sanitizedName);
        break;
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to storage
    const storage = getStorage();
    const result = await storage.upload(storagePath, buffer, {
      contentType: file.type,
      isPublic: uploadConfig.isPublic,
      metadata: {
        originalName: file.name,
        uploadedBy: session.user.id,
        uploadedAt: new Date().toISOString(),
      },
    });

    console.log(`File uploaded: ${result.path} by user ${session.user.id}`);

    return NextResponse.json({
      success: true,
      file: {
        path: result.path,
        url: result.url,
        size: result.size,
        contentType: result.contentType,
      },
    });
  } catch (error) {
    console.error('Upload error:', error);

    if (error instanceof StorageError) {
      if (error.code === 'SIZE_EXCEEDED') {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
      if (error.code === 'TYPE_NOT_ALLOWED') {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}

/**
 * DELETE handler - Delete uploaded file
 */
export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('path');

    if (!filePath) {
      return NextResponse.json(
        { error: 'File path is required' },
        { status: 400 }
      );
    }

    // Security: Only allow users to delete their own uploads or admins
    const storage = getStorage();
    
    try {
      const metadata = await storage.getMetadata(filePath);
      const uploadedBy = metadata.metadata?.uploadedBy;
      
      if (uploadedBy && uploadedBy !== session.user.id && session.user.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Permission denied' },
          { status: 403 }
        );
      }
    } catch {
      // If we can't get metadata, only admins can delete
      if (session.user.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Permission denied' },
          { status: 403 }
        );
      }
    }

    // Delete the file
    await storage.delete(filePath);

    console.log(`File deleted: ${filePath} by user ${session.user.id}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);

    if (error instanceof StorageError && error.code === 'NOT_FOUND') {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}
