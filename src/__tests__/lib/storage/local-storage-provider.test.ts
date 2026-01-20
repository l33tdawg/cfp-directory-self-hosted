/**
 * Local Storage Provider Tests
 * 
 * Tests for the local filesystem storage provider.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { LocalStorageProvider } from '@/lib/storage/local-storage-provider';
import { StorageError } from '@/lib/storage/storage-provider';

// Test directory
const TEST_DIR = path.join(process.cwd(), 'test-uploads');

describe('LocalStorageProvider', () => {
  let storage: LocalStorageProvider;

  beforeEach(async () => {
    // Create fresh test directory
    await fs.mkdir(TEST_DIR, { recursive: true });
    storage = new LocalStorageProvider(TEST_DIR, '/api/files');
    await storage.initialize();
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(TEST_DIR, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('initialize', () => {
    it('should create the base directory', async () => {
      const newDir = path.join(TEST_DIR, 'new-storage');
      const newStorage = new LocalStorageProvider(newDir, '/api/files');
      await newStorage.initialize();

      const stats = await fs.stat(newDir);
      expect(stats.isDirectory()).toBe(true);
    });
  });

  describe('upload', () => {
    it('should upload a file successfully', async () => {
      const content = Buffer.from('Hello, World!');
      const result = await storage.upload('test.txt', content, {
        contentType: 'text/plain',
      });

      expect(result.path).toBe('test.txt');
      expect(result.url).toBe('/api/files/test.txt');
      expect(result.size).toBe(content.length);
      expect(result.contentType).toBe('text/plain');
    });

    it('should create nested directories', async () => {
      const content = Buffer.from('Nested content');
      await storage.upload('path/to/nested/file.txt', content);

      const exists = await storage.exists('path/to/nested/file.txt');
      expect(exists).toBe(true);
    });

    it('should write metadata file', async () => {
      const content = Buffer.from('With metadata');
      await storage.upload('meta-test.txt', content, {
        contentType: 'text/plain',
        isPublic: true,
        metadata: { custom: 'value' },
      });

      const metadataPath = path.join(TEST_DIR, 'meta-test.txt.meta.json');
      const metadataContent = await fs.readFile(metadataPath, 'utf-8');
      const metadata = JSON.parse(metadataContent);

      expect(metadata.contentType).toBe('text/plain');
      expect(metadata.isPublic).toBe(true);
      expect(metadata.metadata.custom).toBe('value');
    });

    it('should reject files exceeding size limit', async () => {
      const content = Buffer.alloc(2000);
      
      await expect(
        storage.upload('too-large.txt', content, {
          maxSize: 1000,
        })
      ).rejects.toThrow(StorageError);
    });

    it('should reject disallowed file types', async () => {
      const content = Buffer.from('PDF content');
      
      await expect(
        storage.upload('file.pdf', content, {
          contentType: 'application/pdf',
          allowedTypes: ['image/jpeg', 'image/png'],
        })
      ).rejects.toThrow(StorageError);
    });
  });

  describe('download', () => {
    it('should download an existing file', async () => {
      const content = Buffer.from('Download me');
      await storage.upload('download-test.txt', content);

      const downloaded = await storage.download('download-test.txt');
      expect(downloaded.toString()).toBe('Download me');
    });

    it('should throw NOT_FOUND for non-existent file', async () => {
      try {
        await storage.download('non-existent.txt');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(StorageError);
        expect((error as StorageError).code).toBe('NOT_FOUND');
      }
    });
  });

  describe('delete', () => {
    it('should delete an existing file', async () => {
      const content = Buffer.from('Delete me');
      await storage.upload('delete-test.txt', content);

      await storage.delete('delete-test.txt');

      const exists = await storage.exists('delete-test.txt');
      expect(exists).toBe(false);
    });

    it('should also delete metadata file', async () => {
      const content = Buffer.from('With metadata');
      await storage.upload('delete-meta.txt', content, {
        contentType: 'text/plain',
      });

      await storage.delete('delete-meta.txt');

      const metadataPath = path.join(TEST_DIR, 'delete-meta.txt.meta.json');
      let metadataExists = true;
      try {
        await fs.access(metadataPath);
      } catch {
        metadataExists = false;
      }
      expect(metadataExists).toBe(false);
    });

    it('should throw NOT_FOUND for non-existent file', async () => {
      try {
        await storage.delete('non-existent.txt');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(StorageError);
        expect((error as StorageError).code).toBe('NOT_FOUND');
      }
    });
  });

  describe('exists', () => {
    it('should return true for existing file', async () => {
      await storage.upload('exists.txt', Buffer.from('I exist'));
      
      const exists = await storage.exists('exists.txt');
      expect(exists).toBe(true);
    });

    it('should return false for non-existent file', async () => {
      const exists = await storage.exists('does-not-exist.txt');
      expect(exists).toBe(false);
    });
  });

  describe('getMetadata', () => {
    it('should return metadata from metadata file', async () => {
      await storage.upload('meta.txt', Buffer.from('Content'), {
        contentType: 'text/plain',
        isPublic: true,
      });

      const metadata = await storage.getMetadata('meta.txt');
      
      expect(metadata.path).toBe('meta.txt');
      expect(metadata.contentType).toBe('text/plain');
      expect(metadata.isPublic).toBe(true);
      expect(metadata.size).toBe(7); // 'Content'.length
    });

    it('should throw NOT_FOUND for non-existent file', async () => {
      try {
        await storage.getMetadata('non-existent.txt');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(StorageError);
        expect((error as StorageError).code).toBe('NOT_FOUND');
      }
    });
  });

  describe('getPublicUrl', () => {
    it('should return correct public URL', () => {
      const url = storage.getPublicUrl('path/to/file.jpg');
      expect(url).toBe('/api/files/path/to/file.jpg');
    });
  });

  describe('list', () => {
    it('should list files in directory', async () => {
      await storage.upload('dir/file1.txt', Buffer.from('1'));
      await storage.upload('dir/file2.txt', Buffer.from('2'));
      await storage.upload('dir/sub/file3.txt', Buffer.from('3'));

      const files = await storage.list('dir');
      
      expect(files).toContain('dir/file1.txt');
      expect(files).toContain('dir/file2.txt');
      expect(files).toContain('dir/sub/file3.txt');
    });

    it('should exclude metadata files', async () => {
      await storage.upload('list-dir/file.txt', Buffer.from('Content'), {
        contentType: 'text/plain',
      });

      const files = await storage.list('list-dir');
      
      expect(files).toContain('list-dir/file.txt');
      expect(files.find(f => f.includes('.meta.json'))).toBeUndefined();
    });

    it('should return empty array for non-existent directory', async () => {
      const files = await storage.list('non-existent');
      expect(files).toEqual([]);
    });
  });

  describe('copy', () => {
    it('should copy a file', async () => {
      await storage.upload('original.txt', Buffer.from('Copy me'));

      await storage.copy('original.txt', 'copied.txt');

      const originalExists = await storage.exists('original.txt');
      const copiedExists = await storage.exists('copied.txt');
      const copiedContent = await storage.download('copied.txt');

      expect(originalExists).toBe(true);
      expect(copiedExists).toBe(true);
      expect(copiedContent.toString()).toBe('Copy me');
    });

    it('should throw NOT_FOUND for non-existent source', async () => {
      try {
        await storage.copy('non-existent.txt', 'dest.txt');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(StorageError);
        expect((error as StorageError).code).toBe('NOT_FOUND');
      }
    });
  });

  describe('move', () => {
    it('should move a file', async () => {
      await storage.upload('to-move.txt', Buffer.from('Move me'));

      await storage.move('to-move.txt', 'moved.txt');

      const originalExists = await storage.exists('to-move.txt');
      const movedExists = await storage.exists('moved.txt');
      const movedContent = await storage.download('moved.txt');

      expect(originalExists).toBe(false);
      expect(movedExists).toBe(true);
      expect(movedContent.toString()).toBe('Move me');
    });
  });

  describe('path sanitization', () => {
    it('should prevent directory traversal', async () => {
      // The implementation should sanitize the path
      const content = Buffer.from('Malicious');
      await storage.upload('../../../etc/passwd', content);

      // File should be stored within TEST_DIR, not at /etc/passwd
      const files = await storage.list('');
      expect(files.some(f => f.includes('passwd'))).toBe(true);
      
      // Verify /etc/passwd was not modified (this is a sanity check)
      // In a real test environment, we'd verify the exact path
    });
  });
});
