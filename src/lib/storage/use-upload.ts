'use client';

/**
 * File Upload Hook
 * 
 * Client-side utilities for uploading files.
 */

import { useState, useCallback } from 'react';

export type UploadType = 
  | 'avatar'
  | 'submission-material'
  | 'organization-logo'
  | 'event-banner'
  | 'temp';

export interface UploadResult {
  path: string;
  url: string;
  size: number;
  contentType: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UseUploadOptions {
  /** Upload type */
  type: UploadType;
  /** Target ID (submission ID, org ID, etc.) */
  targetId?: string;
  /** Callback when upload starts */
  onStart?: () => void;
  /** Callback when upload completes */
  onSuccess?: (result: UploadResult) => void;
  /** Callback when upload fails */
  onError?: (error: Error) => void;
  /** Callback for upload progress */
  onProgress?: (progress: UploadProgress) => void;
}

export interface UseUploadReturn {
  /** Upload a file */
  upload: (file: File) => Promise<UploadResult | null>;
  /** Delete a file */
  deleteFile: (path: string) => Promise<boolean>;
  /** Whether upload is in progress */
  isUploading: boolean;
  /** Upload progress */
  progress: UploadProgress | null;
  /** Upload error */
  error: Error | null;
  /** Reset error state */
  resetError: () => void;
}

/**
 * Hook for file uploads
 */
export function useUpload(options: UseUploadOptions): UseUploadReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const upload = useCallback(async (file: File): Promise<UploadResult | null> => {
    setIsUploading(true);
    setProgress({ loaded: 0, total: file.size, percentage: 0 });
    setError(null);

    options.onStart?.();

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', options.type);
      if (options.targetId) {
        formData.append('targetId', options.targetId);
      }

      // Use XMLHttpRequest for progress tracking
      const result = await new Promise<UploadResult>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const uploadProgress: UploadProgress = {
              loaded: event.loaded,
              total: event.total,
              percentage: Math.round((event.loaded / event.total) * 100),
            };
            setProgress(uploadProgress);
            options.onProgress?.(uploadProgress);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              if (response.success) {
                resolve(response.file);
              } else {
                reject(new Error(response.error || 'Upload failed'));
              }
            } catch {
              reject(new Error('Invalid response'));
            }
          } else {
            try {
              const response = JSON.parse(xhr.responseText);
              reject(new Error(response.error || `Upload failed with status ${xhr.status}`));
            } catch {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Network error during upload'));
        });

        xhr.addEventListener('abort', () => {
          reject(new Error('Upload aborted'));
        });

        xhr.open('POST', '/api/upload');
        xhr.send(formData);
      });

      setProgress({ loaded: file.size, total: file.size, percentage: 100 });
      options.onSuccess?.(result);
      return result;
    } catch (err) {
      const uploadError = err instanceof Error ? err : new Error('Upload failed');
      setError(uploadError);
      options.onError?.(uploadError);
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [options]);

  const deleteFile = useCallback(async (path: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/upload?path=${encodeURIComponent(path)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Delete failed');
      }

      return true;
    } catch (err) {
      const deleteError = err instanceof Error ? err : new Error('Delete failed');
      setError(deleteError);
      return false;
    }
  }, []);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  return {
    upload,
    deleteFile,
    isUploading,
    progress,
    error,
    resetError,
  };
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Check if file type is allowed
 */
export function isAllowedFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.includes(file.type);
}

/**
 * Check if file size is within limit
 */
export function isWithinSizeLimit(file: File, maxSizeBytes: number): boolean {
  return file.size <= maxSizeBytes;
}
