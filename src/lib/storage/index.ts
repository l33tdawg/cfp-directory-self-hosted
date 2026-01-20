/**
 * Storage Module Exports
 * 
 * Re-exports all storage utilities for easy importing.
 */

// Storage provider interface and types
export {
  type StorageProvider,
  type UploadOptions,
  type UploadResult,
  type FileMetadata,
  StorageError,
  StoragePaths,
  MIME_EXTENSIONS,
  getExtensionFromMime,
  validateFile,
} from './storage-provider';

// Local storage implementation
export {
  LocalStorageProvider,
  getStorage,
  initializeStorage,
} from './local-storage-provider';
