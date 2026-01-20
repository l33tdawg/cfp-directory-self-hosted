/**
 * Storage Provider Interface Tests
 * 
 * Tests for storage utilities and validation functions.
 */

import { describe, it, expect } from 'vitest';
import {
  StorageError,
  StoragePaths,
  MIME_EXTENSIONS,
  getExtensionFromMime,
  validateFile,
} from '@/lib/storage/storage-provider';

describe('Storage Provider Utilities', () => {
  describe('StorageError', () => {
    it('should create an error with code', () => {
      const error = new StorageError('File not found', 'NOT_FOUND');
      
      expect(error.message).toBe('File not found');
      expect(error.code).toBe('NOT_FOUND');
      expect(error.name).toBe('StorageError');
    });

    it('should include original error if provided', () => {
      const originalError = new Error('Original error');
      const error = new StorageError('Wrapped error', 'UNKNOWN', originalError);
      
      expect(error.originalError).toBe(originalError);
    });
  });

  describe('StoragePaths', () => {
    it('should generate correct avatar path', () => {
      const path = StoragePaths.avatar('user-123');
      expect(path).toBe('avatars/user-123');
    });

    it('should generate correct submission material path', () => {
      const path = StoragePaths.submissionMaterial('sub-456', 'slides.pdf');
      expect(path).toBe('submissions/sub-456/materials/slides.pdf');
    });

    it('should generate correct organization logo path', () => {
      const path = StoragePaths.organizationLogo('org-789');
      expect(path).toBe('organizations/org-789/logo');
    });

    it('should generate correct event banner path', () => {
      const path = StoragePaths.eventBanner('event-101');
      expect(path).toBe('events/event-101/banner');
    });

    it('should generate correct temp path', () => {
      const path = StoragePaths.temp('upload.tmp');
      expect(path).toBe('temp/upload.tmp');
    });
  });

  describe('MIME_EXTENSIONS', () => {
    it('should have correct extension for JPEG', () => {
      expect(MIME_EXTENSIONS['image/jpeg']).toBe('.jpg');
    });

    it('should have correct extension for PNG', () => {
      expect(MIME_EXTENSIONS['image/png']).toBe('.png');
    });

    it('should have correct extension for PDF', () => {
      expect(MIME_EXTENSIONS['application/pdf']).toBe('.pdf');
    });

    it('should have correct extension for PPTX', () => {
      expect(MIME_EXTENSIONS['application/vnd.openxmlformats-officedocument.presentationml.presentation']).toBe('.pptx');
    });

    it('should have correct extension for MP4', () => {
      expect(MIME_EXTENSIONS['video/mp4']).toBe('.mp4');
    });
  });

  describe('getExtensionFromMime', () => {
    it('should return correct extension for known MIME types', () => {
      expect(getExtensionFromMime('image/jpeg')).toBe('.jpg');
      expect(getExtensionFromMime('image/png')).toBe('.png');
      expect(getExtensionFromMime('application/pdf')).toBe('.pdf');
    });

    it('should return empty string for unknown MIME types', () => {
      expect(getExtensionFromMime('application/unknown')).toBe('');
      expect(getExtensionFromMime('foo/bar')).toBe('');
    });
  });

  describe('validateFile', () => {
    const createBuffer = (size: number): Buffer => {
      return Buffer.alloc(size);
    };

    it('should accept valid file within size limit', () => {
      const file = createBuffer(1024); // 1KB
      const options = { maxSize: 2048 }; // 2KB limit
      
      expect(() => validateFile(file, 'image/jpeg', options)).not.toThrow();
    });

    it('should reject file exceeding size limit', () => {
      const file = createBuffer(3072); // 3KB
      const options = { maxSize: 2048 }; // 2KB limit
      
      expect(() => validateFile(file, 'image/jpeg', options)).toThrow(StorageError);
      
      try {
        validateFile(file, 'image/jpeg', options);
      } catch (error) {
        expect(error).toBeInstanceOf(StorageError);
        expect((error as StorageError).code).toBe('SIZE_EXCEEDED');
      }
    });

    it('should accept allowed file type', () => {
      const file = createBuffer(1024);
      const options = { allowedTypes: ['image/jpeg', 'image/png'] };
      
      expect(() => validateFile(file, 'image/jpeg', options)).not.toThrow();
    });

    it('should reject disallowed file type', () => {
      const file = createBuffer(1024);
      const options = { allowedTypes: ['image/jpeg', 'image/png'] };
      
      expect(() => validateFile(file, 'application/pdf', options)).toThrow(StorageError);
      
      try {
        validateFile(file, 'application/pdf', options);
      } catch (error) {
        expect(error).toBeInstanceOf(StorageError);
        expect((error as StorageError).code).toBe('TYPE_NOT_ALLOWED');
      }
    });

    it('should accept any file when no options provided', () => {
      const file = createBuffer(10000);
      
      expect(() => validateFile(file, 'application/octet-stream')).not.toThrow();
    });

    it('should validate both size and type when both specified', () => {
      const file = createBuffer(3072); // 3KB - too large
      const options = {
        maxSize: 2048,
        allowedTypes: ['image/jpeg'],
      };
      
      // Size check happens first
      expect(() => validateFile(file, 'image/jpeg', options)).toThrow(StorageError);
    });
  });
});
