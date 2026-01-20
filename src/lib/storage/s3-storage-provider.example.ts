/**
 * S3 Storage Provider (Example Implementation)
 * 
 * This file documents how to implement an S3-compatible storage provider.
 * To use S3 storage:
 * 
 * 1. Install required dependencies:
 *    npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
 * 
 * 2. Add environment variables:
 *    AWS_REGION=us-east-1
 *    AWS_ACCESS_KEY_ID=your-access-key
 *    AWS_SECRET_ACCESS_KEY=your-secret-key
 *    S3_BUCKET_NAME=your-bucket-name
 *    S3_ENDPOINT=https://s3.amazonaws.com (optional, for S3-compatible services)
 * 
 * 3. Copy this file to s3-storage-provider.ts and uncomment the implementation
 * 
 * 4. Update src/lib/storage/index.ts to export S3StorageProvider
 * 
 * 5. Update your storage configuration to use S3 instead of local storage
 */

/*
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  CopyObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  StorageProvider,
  UploadOptions,
  UploadResult,
  FileMetadata,
  StorageError,
  validateFile,
} from './storage-provider';

export class S3StorageProvider implements StorageProvider {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl?: string;

  constructor(config: {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucket: string;
    endpoint?: string;
    publicUrl?: string;
  }) {
    this.client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      endpoint: config.endpoint,
    });
    this.bucket = config.bucket;
    this.publicUrl = config.publicUrl;
  }

  async upload(
    path: string,
    file: Buffer,
    options?: UploadOptions
  ): Promise<UploadResult> {
    const contentType = options?.contentType || 'application/octet-stream';
    
    // Validate the file
    validateFile(file, contentType, options);

    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: path,
          Body: file,
          ContentType: contentType,
          Metadata: {
            ...options?.metadata,
            isPublic: String(options?.isPublic ?? false),
          },
        })
      );

      return {
        path,
        url: this.getPublicUrl(path),
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

  async download(path: string): Promise<Buffer> {
    try {
      const response = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: path,
        })
      );

      const stream = response.Body;
      if (!stream) {
        throw new Error('Empty response body');
      }

      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      for await (const chunk of stream as AsyncIterable<Uint8Array>) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    } catch (error) {
      if ((error as Error).name === 'NoSuchKey') {
        throw new StorageError(`File not found: ${path}`, 'NOT_FOUND');
      }
      throw new StorageError(
        `Failed to download file: ${(error as Error).message}`,
        'UNKNOWN',
        error as Error
      );
    }
  }

  async delete(path: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: path,
        })
      );
    } catch (error) {
      throw new StorageError(
        `Failed to delete file: ${(error as Error).message}`,
        'UNKNOWN',
        error as Error
      );
    }
  }

  getPublicUrl(path: string): string {
    if (this.publicUrl) {
      return `${this.publicUrl}/${path}`;
    }
    return `https://${this.bucket}.s3.amazonaws.com/${path}`;
  }

  getInternalUrl(path: string): string {
    // For S3, we can return a presigned URL
    return `/api/files/${path}`;
  }

  async exists(path: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: path,
        })
      );
      return true;
    } catch {
      return false;
    }
  }

  async getMetadata(path: string): Promise<FileMetadata> {
    try {
      const response = await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: path,
        })
      );

      return {
        path,
        size: response.ContentLength || 0,
        contentType: response.ContentType || 'application/octet-stream',
        lastModified: response.LastModified || new Date(),
        isPublic: response.Metadata?.isPublic === 'true',
        metadata: response.Metadata,
      };
    } catch (error) {
      if ((error as Error).name === 'NoSuchKey') {
        throw new StorageError(`File not found: ${path}`, 'NOT_FOUND');
      }
      throw new StorageError(
        `Failed to get metadata: ${(error as Error).message}`,
        'UNKNOWN',
        error as Error
      );
    }
  }

  async list(prefix: string): Promise<string[]> {
    const results: string[] = [];
    let continuationToken: string | undefined;

    do {
      const response = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        })
      );

      if (response.Contents) {
        for (const obj of response.Contents) {
          if (obj.Key) {
            results.push(obj.Key);
          }
        }
      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    return results;
  }

  async copy(sourcePath: string, destPath: string): Promise<void> {
    try {
      await this.client.send(
        new CopyObjectCommand({
          Bucket: this.bucket,
          CopySource: `${this.bucket}/${sourcePath}`,
          Key: destPath,
        })
      );
    } catch (error) {
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

  // Generate a presigned URL for temporary access
  async getPresignedUrl(path: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: path,
    });

    return getSignedUrl(this.client, command, { expiresIn });
  }

  // Generate a presigned URL for direct upload
  async getUploadUrl(path: string, contentType: string, expiresIn: number = 3600): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: path,
      ContentType: contentType,
    });

    return getSignedUrl(this.client, command, { expiresIn });
  }
}

// Factory function to create S3 storage from environment variables
export function createS3Storage(): S3StorageProvider {
  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const bucket = process.env.S3_BUCKET_NAME;

  if (!region || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error('Missing S3 configuration. Required: AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET_NAME');
  }

  return new S3StorageProvider({
    region,
    accessKeyId,
    secretAccessKey,
    bucket,
    endpoint: process.env.S3_ENDPOINT,
    publicUrl: process.env.S3_PUBLIC_URL,
  });
}
*/

/**
 * To switch from local to S3 storage:
 * 
 * 1. Implement and export S3StorageProvider in this file
 * 
 * 2. Update src/lib/storage/index.ts:
 * 
 *    import { S3StorageProvider, createS3Storage } from './s3-storage-provider';
 *    
 *    export function getStorage(): StorageProvider {
 *      if (process.env.STORAGE_PROVIDER === 's3') {
 *        return createS3Storage();
 *      }
 *      return new LocalStorageProvider();
 *    }
 * 
 * 3. Add STORAGE_PROVIDER=s3 to your environment
 * 
 * Benefits of S3:
 * - Scalable storage without disk limits
 * - Built-in redundancy and backups
 * - CDN integration for faster delivery
 * - Works with S3-compatible services (MinIO, DigitalOcean Spaces, etc.)
 */

export {};
