/**
 * Storage Provider Interface
 * 
 * Abstraction layer for file storage operations.
 * This allows easy switching between local filesystem storage
 * and cloud storage providers like S3.
 */

/**
 * Options for file upload
 */
export interface UploadOptions {
  /** MIME type of the file */
  contentType?: string;
  /** Maximum file size in bytes */
  maxSize?: number;
  /** Allowed MIME types */
  allowedTypes?: string[];
  /** Whether the file should be publicly accessible */
  isPublic?: boolean;
  /** Custom metadata */
  metadata?: Record<string, string>;
}

/**
 * Result of a successful upload
 */
export interface UploadResult {
  /** Storage path of the file */
  path: string;
  /** URL to access the file */
  url: string;
  /** Size of the uploaded file in bytes */
  size: number;
  /** MIME type of the file */
  contentType: string;
}

/**
 * File metadata
 */
export interface FileMetadata {
  /** Storage path */
  path: string;
  /** File size in bytes */
  size: number;
  /** MIME type */
  contentType: string;
  /** Last modified date */
  lastModified: Date;
  /** Whether the file is publicly accessible */
  isPublic: boolean;
  /** Custom metadata */
  metadata?: Record<string, string>;
}

/**
 * Storage error types
 */
export class StorageError extends Error {
  constructor(
    message: string,
    public code: 'NOT_FOUND' | 'PERMISSION_DENIED' | 'INVALID_FILE' | 'SIZE_EXCEEDED' | 'TYPE_NOT_ALLOWED' | 'UNKNOWN',
    public originalError?: Error
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

/**
 * Abstract storage provider interface
 * 
 * Implementations:
 * - LocalStorageProvider: Filesystem storage (default)
 * - S3StorageProvider: AWS S3 storage (optional, documented)
 */
export interface StorageProvider {
  /**
   * Upload a file to storage
   * 
   * @param path - Storage path (e.g., "avatars/user-123.jpg")
   * @param file - File buffer to upload
   * @param options - Upload options
   * @returns Upload result with URL and metadata
   * @throws StorageError if upload fails
   */
  upload(path: string, file: Buffer, options?: UploadOptions): Promise<UploadResult>;

  /**
   * Download a file from storage
   * 
   * @param path - Storage path
   * @returns File buffer
   * @throws StorageError if file not found
   */
  download(path: string): Promise<Buffer>;

  /**
   * Delete a file from storage
   * 
   * @param path - Storage path
   * @throws StorageError if deletion fails
   */
  delete(path: string): Promise<void>;

  /**
   * Get the public URL for a file
   * 
   * @param path - Storage path
   * @returns Public URL to access the file
   */
  getPublicUrl(path: string): string;

  /**
   * Get the internal/API URL for a file (for auth-protected files)
   * 
   * @param path - Storage path
   * @returns Internal API URL
   */
  getInternalUrl(path: string): string;

  /**
   * Check if a file exists
   * 
   * @param path - Storage path
   * @returns True if file exists
   */
  exists(path: string): Promise<boolean>;

  /**
   * Get file metadata
   * 
   * @param path - Storage path
   * @returns File metadata
   * @throws StorageError if file not found
   */
  getMetadata(path: string): Promise<FileMetadata>;

  /**
   * List files in a directory
   * 
   * @param prefix - Directory prefix
   * @returns Array of file paths
   */
  list(prefix: string): Promise<string[]>;

  /**
   * Copy a file to a new location
   * 
   * @param sourcePath - Source path
   * @param destPath - Destination path
   */
  copy(sourcePath: string, destPath: string): Promise<void>;

  /**
   * Move/rename a file
   * 
   * @param sourcePath - Source path
   * @param destPath - Destination path
   */
  move(sourcePath: string, destPath: string): Promise<void>;
}

/**
 * Storage path utilities
 */
export const StoragePaths = {
  /** Avatar storage path */
  avatar: (userId: string) => `avatars/${userId}`,
  
  /** Submission materials path */
  submissionMaterial: (submissionId: string, filename: string) => 
    `submissions/${submissionId}/materials/${filename}`,
  
  /** Organization logo path */
  organizationLogo: (orgId: string) => `organizations/${orgId}/logo`,
  
  /** Event banner path */
  eventBanner: (eventId: string) => `events/${eventId}/banner`,
  
  /** Temporary upload path */
  temp: (filename: string) => `temp/${filename}`,
};

/**
 * MIME type to extension mapping
 */
export const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
  'application/vnd.ms-powerpoint': '.ppt',
  'application/vnd.oasis.opendocument.presentation': '.odp',
  'application/vnd.apple.keynote': '.key',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
};

/**
 * Get file extension from MIME type
 */
export function getExtensionFromMime(mimeType: string): string {
  return MIME_EXTENSIONS[mimeType] || '';
}

/**
 * Validate file against options
 */
export function validateFile(
  file: Buffer,
  contentType: string,
  options?: UploadOptions
): void {
  // Check file size
  if (options?.maxSize && file.length > options.maxSize) {
    throw new StorageError(
      `File size (${file.length} bytes) exceeds maximum allowed (${options.maxSize} bytes)`,
      'SIZE_EXCEEDED'
    );
  }

  // Check file type
  if (options?.allowedTypes && !options.allowedTypes.includes(contentType)) {
    throw new StorageError(
      `File type "${contentType}" is not allowed. Allowed types: ${options.allowedTypes.join(', ')}`,
      'TYPE_NOT_ALLOWED'
    );
  }
}
