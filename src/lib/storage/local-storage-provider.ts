/**
 * Local Filesystem Storage Provider
 * 
 * Stores files on the local filesystem.
 * This is the default storage provider for self-hosted instances.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { config } from '@/lib/env';
import {
  StorageProvider,
  UploadOptions,
  UploadResult,
  FileMetadata,
  StorageError,
  validateFile,
} from './storage-provider';

/**
 * Local filesystem storage provider
 */
export class LocalStorageProvider implements StorageProvider {
  private readonly baseDir: string;
  private readonly baseUrl: string;

  constructor(baseDir?: string, baseUrl?: string) {
    // Resolve the base directory (default to UPLOAD_DIR from env)
    this.baseDir = path.resolve(baseDir || config.storage.uploadDir);
    // Base URL for file access (default to /api/files)
    this.baseUrl = baseUrl || '/api/files';
  }

  /**
   * Initialize the storage directory
   */
  async initialize(): Promise<void> {
    await fs.mkdir(this.baseDir, { recursive: true });
  }

  /**
   * Get the full filesystem path for a storage path
   */
  private getFullPath(storagePath: string): string {
    // Sanitize the path to prevent directory traversal
    const sanitized = path.normalize(storagePath).replace(/^(\.\.(\/|\\|$))+/, '');
    return path.join(this.baseDir, sanitized);
  }

  async upload(
    storagePath: string,
    file: Buffer,
    options?: UploadOptions
  ): Promise<UploadResult> {
    const contentType = options?.contentType || 'application/octet-stream';

    // Validate the file
    validateFile(file, contentType, options);

    const fullPath = this.getFullPath(storagePath);
    const dirPath = path.dirname(fullPath);

    try {
      // Create directory if it doesn't exist
      await fs.mkdir(dirPath, { recursive: true });

      // Write the file
      await fs.writeFile(fullPath, file);

      // Write metadata file
      const metadataPath = `${fullPath}.meta.json`;
      const metadata: FileMetadata = {
        path: storagePath,
        size: file.length,
        contentType,
        lastModified: new Date(),
        isPublic: options?.isPublic ?? false,
        metadata: options?.metadata,
      };
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

      return {
        path: storagePath,
        url: this.getPublicUrl(storagePath),
        size: file.length,
        contentType,
      };
    } catch (error) {
      throw new StorageError(
        `Failed to upload file: ${(error as Error).message}`,
        'UNKNOWN',
        error as Error
      );
    }
  }

  async download(storagePath: string): Promise<Buffer> {
    const fullPath = this.getFullPath(storagePath);

    try {
      return await fs.readFile(fullPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new StorageError(`File not found: ${storagePath}`, 'NOT_FOUND');
      }
      throw new StorageError(
        `Failed to download file: ${(error as Error).message}`,
        'UNKNOWN',
        error as Error
      );
    }
  }

  async delete(storagePath: string): Promise<void> {
    const fullPath = this.getFullPath(storagePath);
    const metadataPath = `${fullPath}.meta.json`;

    try {
      // Delete the file
      await fs.unlink(fullPath);
      
      // Delete metadata if it exists
      try {
        await fs.unlink(metadataPath);
      } catch {
        // Ignore if metadata doesn't exist
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new StorageError(`File not found: ${storagePath}`, 'NOT_FOUND');
      }
      throw new StorageError(
        `Failed to delete file: ${(error as Error).message}`,
        'UNKNOWN',
        error as Error
      );
    }
  }

  getPublicUrl(storagePath: string): string {
    // Return the API route URL for file serving
    return `${this.baseUrl}/${storagePath}`;
  }

  getInternalUrl(storagePath: string): string {
    return `${this.baseUrl}/${storagePath}`;
  }

  async exists(storagePath: string): Promise<boolean> {
    const fullPath = this.getFullPath(storagePath);
    
    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  async getMetadata(storagePath: string): Promise<FileMetadata> {
    const fullPath = this.getFullPath(storagePath);
    const metadataPath = `${fullPath}.meta.json`;

    try {
      // Try to read metadata file first
      const metadataContent = await fs.readFile(metadataPath, 'utf-8');
      const metadata = JSON.parse(metadataContent);
      return {
        ...metadata,
        lastModified: new Date(metadata.lastModified),
      };
    } catch {
      // Fall back to stat if no metadata file
      try {
        const stat = await fs.stat(fullPath);
        return {
          path: storagePath,
          size: stat.size,
          contentType: 'application/octet-stream',
          lastModified: stat.mtime,
          isPublic: false,
        };
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          throw new StorageError(`File not found: ${storagePath}`, 'NOT_FOUND');
        }
        throw new StorageError(
          `Failed to get metadata: ${(error as Error).message}`,
          'UNKNOWN',
          error as Error
        );
      }
    }
  }

  async list(prefix: string): Promise<string[]> {
    const fullPath = this.getFullPath(prefix);
    const results: string[] = [];

    async function walkDir(dir: string, basePath: string): Promise<void> {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const entryPath = path.join(dir, entry.name);
          const relativePath = path.join(basePath, entry.name);
          
          if (entry.isDirectory()) {
            await walkDir(entryPath, relativePath);
          } else if (!entry.name.endsWith('.meta.json')) {
            results.push(relativePath);
          }
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw error;
        }
      }
    }

    await walkDir(fullPath, prefix);
    return results;
  }

  async copy(sourcePath: string, destPath: string): Promise<void> {
    const sourceFullPath = this.getFullPath(sourcePath);
    const destFullPath = this.getFullPath(destPath);
    const destDir = path.dirname(destFullPath);

    try {
      // Create destination directory
      await fs.mkdir(destDir, { recursive: true });
      
      // Copy the file
      await fs.copyFile(sourceFullPath, destFullPath);
      
      // Copy metadata if it exists
      const sourceMetaPath = `${sourceFullPath}.meta.json`;
      const destMetaPath = `${destFullPath}.meta.json`;
      try {
        await fs.copyFile(sourceMetaPath, destMetaPath);
        
        // Update path in metadata
        const metadataContent = await fs.readFile(destMetaPath, 'utf-8');
        const metadata = JSON.parse(metadataContent);
        metadata.path = destPath;
        await fs.writeFile(destMetaPath, JSON.stringify(metadata, null, 2));
      } catch {
        // Ignore if no metadata file
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new StorageError(`Source file not found: ${sourcePath}`, 'NOT_FOUND');
      }
      throw new StorageError(
        `Failed to copy file: ${(error as Error).message}`,
        'UNKNOWN',
        error as Error
      );
    }
  }

  async move(sourcePath: string, destPath: string): Promise<void> {
    await this.copy(sourcePath, destPath);
    await this.delete(sourcePath);
  }
}

// Singleton instance
let storageInstance: LocalStorageProvider | null = null;

/**
 * Get the storage provider singleton
 */
export function getStorage(): LocalStorageProvider {
  if (!storageInstance) {
    storageInstance = new LocalStorageProvider();
  }
  return storageInstance;
}

/**
 * Initialize storage (call on app startup)
 */
export async function initializeStorage(): Promise<void> {
  const storage = getStorage();
  await storage.initialize();
}
