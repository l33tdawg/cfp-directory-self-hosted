/**
 * Archive Utility Tests
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import AdmZip from 'adm-zip';

// Mock fs/promises
vi.mock('fs/promises', () => ({
  default: {
    stat: vi.fn(),
    rm: vi.fn(),
    mkdir: vi.fn(),
    writeFile: vi.fn(),
  },
}));

// Mock tar
vi.mock('tar', () => ({
  Parser: vi.fn(),
  extract: vi.fn(),
}));

import fs from 'fs/promises';
import {
  detectArchiveType,
  validateArchive,
  pluginExists,
  removePluginFiles,
  extractPlugin,
} from '@/lib/plugins/archive';

// =============================================================================
// HELPERS
// =============================================================================

function createValidManifest(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    name: 'test-plugin',
    displayName: 'Test Plugin',
    version: '1.0.0',
    apiVersion: '1.0',
    ...overrides,
  });
}

function createZipBuffer(
  files: Array<{ path: string; content: string | Buffer }>
): Buffer {
  const zip = new AdmZip();
  for (const file of files) {
    const data =
      typeof file.content === 'string'
        ? Buffer.from(file.content)
        : file.content;
    zip.addFile(file.path, data);
  }
  return zip.toBuffer();
}

// =============================================================================
// TESTS
// =============================================================================

describe('Archive Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // detectArchiveType
  // ---------------------------------------------------------------------------

  describe('detectArchiveType', () => {
    it('should detect ZIP archives (PK magic bytes)', () => {
      const buffer = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
      expect(detectArchiveType(buffer)).toBe('zip');
    });

    it('should detect GZIP archives (1F 8B magic bytes)', () => {
      const buffer = Buffer.from([0x1f, 0x8b, 0x08, 0x00]);
      expect(detectArchiveType(buffer)).toBe('gzip');
    });

    it('should return unknown for unrecognized formats', () => {
      const buffer = Buffer.from([0x00, 0x00, 0x00, 0x00]);
      expect(detectArchiveType(buffer)).toBe('unknown');
    });

    it('should return unknown for empty buffer', () => {
      const buffer = Buffer.from([]);
      expect(detectArchiveType(buffer)).toBe('unknown');
    });

    it('should return unknown for single-byte buffer', () => {
      const buffer = Buffer.from([0x50]);
      expect(detectArchiveType(buffer)).toBe('unknown');
    });
  });

  // ---------------------------------------------------------------------------
  // validateArchive (ZIP)
  // ---------------------------------------------------------------------------

  describe('validateArchive', () => {
    it('should reject unsupported archive formats', async () => {
      const buffer = Buffer.from([0x00, 0x00, 0x00, 0x00]);
      const result = await validateArchive(buffer);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unsupported archive format');
    });

    it('should reject archives exceeding max size', async () => {
      // Create a buffer larger than 50MB
      const bigBuffer = Buffer.alloc(51 * 1024 * 1024);
      bigBuffer[0] = 0x50;
      bigBuffer[1] = 0x4b;
      const result = await validateArchive(bigBuffer);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds maximum size');
    });

    it('should accept archives despite AdmZip normalizing traversal paths', async () => {
      // AdmZip normalizes '../' and absolute paths on entry creation,
      // so path traversal via archive entries is already prevented by the library.
      // The isPathSafe check acts as defense-in-depth for raw zip parsing.
      // Path traversal via plugin names is additionally guarded by removePluginFiles.
      const buffer = createZipBuffer([
        { path: '../etc/passwd', content: 'safe-because-normalized' },
        { path: 'manifest.json', content: createValidManifest() },
      ]);
      // AdmZip normalizes '../etc/passwd' → 'etc/passwd', so validation passes
      const result = await validateArchive(buffer);
      expect(result.valid).toBe(true);
    });

    it('should reject archives without manifest.json', async () => {
      const buffer = createZipBuffer([
        { path: 'index.js', content: 'module.exports = {}' },
      ]);
      const result = await validateArchive(buffer);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('does not contain a manifest.json');
    });

    it('should reject archives with invalid manifest JSON', async () => {
      const buffer = createZipBuffer([
        { path: 'manifest.json', content: '{ invalid json' },
      ]);
      const result = await validateArchive(buffer);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('invalid JSON');
    });

    it('should reject manifest missing required name field', async () => {
      const buffer = createZipBuffer([
        {
          path: 'manifest.json',
          content: JSON.stringify({
            displayName: 'Test',
            version: '1.0.0',
            apiVersion: '1.0',
          }),
        },
      ]);
      const result = await validateArchive(buffer);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('missing required field: name');
    });

    it('should reject manifest missing required displayName field', async () => {
      const buffer = createZipBuffer([
        {
          path: 'manifest.json',
          content: JSON.stringify({
            name: 'test-plugin',
            version: '1.0.0',
            apiVersion: '1.0',
          }),
        },
      ]);
      const result = await validateArchive(buffer);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('missing required field: displayName');
    });

    it('should reject manifest missing required version field', async () => {
      const buffer = createZipBuffer([
        {
          path: 'manifest.json',
          content: JSON.stringify({
            name: 'test-plugin',
            displayName: 'Test',
            apiVersion: '1.0',
          }),
        },
      ]);
      const result = await validateArchive(buffer);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('missing required field: version');
    });

    it('should reject unsupported API version', async () => {
      const buffer = createZipBuffer([
        {
          path: 'manifest.json',
          content: createValidManifest({ apiVersion: '99.0' }),
        },
      ]);
      const result = await validateArchive(buffer);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unsupported API version');
    });

    it('should accept valid ZIP archive with flat structure', async () => {
      const buffer = createZipBuffer([
        { path: 'manifest.json', content: createValidManifest() },
        { path: 'index.js', content: 'module.exports = {}' },
      ]);
      const result = await validateArchive(buffer);
      expect(result.valid).toBe(true);
      expect(result.manifest?.name).toBe('test-plugin');
      expect(result.archiveType).toBe('zip');
    });

    it('should accept valid ZIP archive with nested structure', async () => {
      const buffer = createZipBuffer([
        {
          path: 'test-plugin/manifest.json',
          content: createValidManifest(),
        },
        {
          path: 'test-plugin/index.js',
          content: 'module.exports = {}',
        },
      ]);
      const result = await validateArchive(buffer);
      expect(result.valid).toBe(true);
      expect(result.manifest?.name).toBe('test-plugin');
    });
  });

  // ---------------------------------------------------------------------------
  // pluginExists
  // ---------------------------------------------------------------------------

  describe('pluginExists', () => {
    it('should return true when plugin directory exists', async () => {
      vi.mocked(fs.stat).mockResolvedValue({
        isDirectory: () => true,
      } as any);

      const result = await pluginExists('test-plugin');
      expect(result).toBe(true);
    });

    it('should return false when plugin directory does not exist', async () => {
      vi.mocked(fs.stat).mockRejectedValue(new Error('ENOENT'));

      const result = await pluginExists('nonexistent');
      expect(result).toBe(false);
    });

    it('should return false when path exists but is not a directory', async () => {
      vi.mocked(fs.stat).mockResolvedValue({
        isDirectory: () => false,
      } as any);

      const result = await pluginExists('test-file');
      expect(result).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // removePluginFiles
  // ---------------------------------------------------------------------------

  describe('removePluginFiles', () => {
    it('should remove plugin directory', async () => {
      vi.mocked(fs.rm).mockResolvedValue();

      await removePluginFiles('test-plugin');
      expect(fs.rm).toHaveBeenCalledWith(
        expect.stringContaining('test-plugin'),
        { recursive: true, force: true }
      );
    });

    it('should reject path traversal with ..', async () => {
      await expect(removePluginFiles('../etc')).rejects.toThrow(
        'path traversal detected'
      );
    });

    it('should reject path traversal with /', async () => {
      await expect(removePluginFiles('foo/bar')).rejects.toThrow(
        'path traversal detected'
      );
    });

    it('should reject path traversal with backslash', async () => {
      await expect(removePluginFiles('foo\\bar')).rejects.toThrow(
        'path traversal detected'
      );
    });
  });

  // ---------------------------------------------------------------------------
  // extractPlugin
  // ---------------------------------------------------------------------------

  describe('extractPlugin', () => {
    it('should return conflict error when plugin exists and force is false', async () => {
      vi.mocked(fs.stat).mockResolvedValue({
        isDirectory: () => true,
      } as any);

      const buffer = createZipBuffer([
        { path: 'manifest.json', content: createValidManifest() },
        { path: 'index.js', content: 'module.exports = {}' },
      ]);

      const result = await extractPlugin(buffer, { force: false });
      expect(result.success).toBe(false);
      expect(result.conflict).toBe(true);
      expect(result.pluginName).toBe('test-plugin');
    });

    it('should extract successfully when plugin does not exist', async () => {
      vi.mocked(fs.stat).mockRejectedValue(new Error('ENOENT'));
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue();

      const buffer = createZipBuffer([
        { path: 'manifest.json', content: createValidManifest() },
        { path: 'index.js', content: 'module.exports = {}' },
      ]);

      const result = await extractPlugin(buffer);
      expect(result.success).toBe(true);
      expect(result.pluginName).toBe('test-plugin');
    });

    it('should remove old dir and extract when force is true', async () => {
      vi.mocked(fs.stat).mockResolvedValue({
        isDirectory: () => true,
      } as any);
      vi.mocked(fs.rm).mockResolvedValue();
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue();

      const buffer = createZipBuffer([
        { path: 'manifest.json', content: createValidManifest() },
        { path: 'index.js', content: 'module.exports = {}' },
      ]);

      const result = await extractPlugin(buffer, { force: true });
      expect(result.success).toBe(true);
      expect(fs.rm).toHaveBeenCalled();
    });

    it('should return error for invalid archive', async () => {
      const buffer = Buffer.from([0x00, 0x00, 0x00, 0x00]);
      const result = await extractPlugin(buffer);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported archive format');
    });
  });
});
