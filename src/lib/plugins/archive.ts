/**
 * Plugin Archive Utilities
 * @version 1.6.0
 *
 * Handles validation and extraction of plugin archives (.zip, .tar.gz, .tgz).
 * Enforces security constraints: path traversal prevention, size limits,
 * manifest validation.
 */

import path from 'path';
import fs from 'fs/promises';
import AdmZip from 'adm-zip';
import * as tar from 'tar';
import { Readable } from 'stream';
import type { PluginManifest } from './types';
import { isVersionSupported } from './version';
import { PLUGINS_DIR } from './loader';

// =============================================================================
// CONSTANTS
// =============================================================================

const MAX_ARCHIVE_SIZE = 50 * 1024 * 1024; // 50MB upload limit
const MAX_EXTRACTED_SIZE = 100 * 1024 * 1024; // 100MB extracted limit

// =============================================================================
// TYPES
// =============================================================================

export type ArchiveType = 'zip' | 'gzip' | 'unknown';

export interface ValidationResult {
  valid: boolean;
  error?: string;
  manifest?: PluginManifest;
  archiveType?: ArchiveType;
}

export interface ExtractionResult {
  success: boolean;
  error?: string;
  pluginName?: string;
  pluginPath?: string;
  conflict?: boolean;
}

// =============================================================================
// ARCHIVE TYPE DETECTION
// =============================================================================

/**
 * Detect archive type by magic bytes
 */
export function detectArchiveType(buffer: Buffer): ArchiveType {
  if (buffer.length < 2) return 'unknown';

  // ZIP: starts with PK (0x50 0x4B)
  if (buffer[0] === 0x50 && buffer[1] === 0x4b) {
    return 'zip';
  }

  // GZIP: starts with 0x1F 0x8B
  if (buffer[0] === 0x1f && buffer[1] === 0x8b) {
    return 'gzip';
  }

  return 'unknown';
}

// =============================================================================
// PATH SAFETY
// =============================================================================

/**
 * Check if a path is safe (no traversal)
 */
function isPathSafe(entryPath: string): boolean {
  const normalized = path.normalize(entryPath);
  if (normalized.startsWith('..') || normalized.startsWith('/') || normalized.includes('..')) {
    return false;
  }
  return true;
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Find the manifest.json within archive entries, handling both flat and nested structures.
 * Returns the content of manifest.json and the root directory prefix.
 */
function findManifestInZip(zip: AdmZip): { content: string; rootDir: string } | null {
  const entries = zip.getEntries();

  // Try direct manifest.json first (flat archive)
  for (const entry of entries) {
    if (entry.entryName === 'manifest.json' || entry.entryName === './manifest.json') {
      return { content: entry.getData().toString('utf-8'), rootDir: '' };
    }
  }

  // Try one-level nested: <dirname>/manifest.json
  for (const entry of entries) {
    const parts = entry.entryName.split('/');
    if (parts.length === 2 && parts[1] === 'manifest.json') {
      return { content: entry.getData().toString('utf-8'), rootDir: parts[0] };
    }
  }

  return null;
}

function findManifestInTar(entries: { path: string; data: Buffer }[]): { content: string; rootDir: string } | null {
  // Try direct manifest.json first
  for (const entry of entries) {
    const normalized = entry.path.replace(/^\.\//, '');
    if (normalized === 'manifest.json') {
      return { content: entry.data.toString('utf-8'), rootDir: '' };
    }
  }

  // Try one-level nested
  for (const entry of entries) {
    const normalized = entry.path.replace(/^\.\//, '');
    const parts = normalized.split('/');
    if (parts.length === 2 && parts[1] === 'manifest.json') {
      return { content: entry.data.toString('utf-8'), rootDir: parts[0] };
    }
  }

  return null;
}

/**
 * Validate a manifest object has required fields and supported API version
 */
function validateManifestFields(manifest: Record<string, unknown>): ValidationResult {
  if (!manifest.name || typeof manifest.name !== 'string') {
    return { valid: false, error: 'Manifest missing required field: name' };
  }
  if (!manifest.displayName || typeof manifest.displayName !== 'string') {
    return { valid: false, error: 'Manifest missing required field: displayName' };
  }
  if (!manifest.version || typeof manifest.version !== 'string') {
    return { valid: false, error: 'Manifest missing required field: version' };
  }
  if (!manifest.apiVersion || typeof manifest.apiVersion !== 'string') {
    return { valid: false, error: 'Manifest missing required field: apiVersion' };
  }
  if (!isVersionSupported(manifest.apiVersion as string)) {
    return {
      valid: false,
      error: `Unsupported API version: ${manifest.apiVersion}`,
    };
  }

  // Validate name format (alphanumeric + hyphens)
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(manifest.name as string) && (manifest.name as string).length > 1) {
    return {
      valid: false,
      error: 'Plugin name must contain only lowercase letters, numbers, and hyphens',
    };
  }

  return {
    valid: true,
    manifest: manifest as unknown as PluginManifest,
  };
}

/**
 * Validate an archive buffer without extracting
 */
export async function validateArchive(buffer: Buffer): Promise<ValidationResult> {
  if (buffer.length > MAX_ARCHIVE_SIZE) {
    return { valid: false, error: `Archive exceeds maximum size of ${MAX_ARCHIVE_SIZE / 1024 / 1024}MB` };
  }

  const archiveType = detectArchiveType(buffer);
  if (archiveType === 'unknown') {
    return { valid: false, error: 'Unsupported archive format. Use .zip or .tar.gz' };
  }

  try {
    if (archiveType === 'zip') {
      return validateZipArchive(buffer);
    } else {
      return await validateTarArchive(buffer);
    }
  } catch (error) {
    return {
      valid: false,
      error: `Failed to read archive: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

function validateZipArchive(buffer: Buffer): ValidationResult {
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();

  let totalSize = 0;

  for (const entry of entries) {
    // Check for path traversal
    if (!isPathSafe(entry.entryName)) {
      return { valid: false, error: `Path traversal detected in archive entry: ${entry.entryName}` };
    }
    totalSize += entry.header.size;
  }

  if (totalSize > MAX_EXTRACTED_SIZE) {
    return { valid: false, error: `Extracted size exceeds maximum of ${MAX_EXTRACTED_SIZE / 1024 / 1024}MB` };
  }

  // Find and validate manifest
  const manifestResult = findManifestInZip(zip);
  if (!manifestResult) {
    return { valid: false, error: 'Archive does not contain a manifest.json' };
  }

  let manifest: Record<string, unknown>;
  try {
    manifest = JSON.parse(manifestResult.content);
  } catch {
    return { valid: false, error: 'manifest.json contains invalid JSON' };
  }

  const validation = validateManifestFields(manifest);
  if (!validation.valid) {
    return validation;
  }

  return {
    valid: true,
    manifest: validation.manifest,
    archiveType: 'zip',
  };
}

async function validateTarArchive(buffer: Buffer): Promise<ValidationResult> {
  const entries: { path: string; data: Buffer; size: number }[] = [];
  let totalSize = 0;

  // Parse tar entries
  await new Promise<void>((resolve, reject) => {
    const parser = new tar.Parser({
      onReadEntry: (entry) => {
        const chunks: Buffer[] = [];
        entry.on('data', (chunk: Buffer) => chunks.push(chunk));
        entry.on('end', () => {
          const data = Buffer.concat(chunks);
          entries.push({ path: entry.path, data, size: data.length });
          totalSize += data.length;
        });
        entry.resume();
      },
    });

    parser.on('end', resolve);
    parser.on('error', reject);

    const stream = Readable.from(buffer);
    stream.pipe(parser);
  });

  // Check all paths for traversal
  for (const entry of entries) {
    if (!isPathSafe(entry.path)) {
      return { valid: false, error: `Path traversal detected in archive entry: ${entry.path}` };
    }
  }

  if (totalSize > MAX_EXTRACTED_SIZE) {
    return { valid: false, error: `Extracted size exceeds maximum of ${MAX_EXTRACTED_SIZE / 1024 / 1024}MB` };
  }

  // Find and validate manifest
  const manifestResult = findManifestInTar(entries);
  if (!manifestResult) {
    return { valid: false, error: 'Archive does not contain a manifest.json' };
  }

  let manifest: Record<string, unknown>;
  try {
    manifest = JSON.parse(manifestResult.content);
  } catch {
    return { valid: false, error: 'manifest.json contains invalid JSON' };
  }

  const validation = validateManifestFields(manifest);
  if (!validation.valid) {
    return validation;
  }

  return {
    valid: true,
    manifest: validation.manifest,
    archiveType: 'gzip',
  };
}

// =============================================================================
// EXTRACTION
// =============================================================================

/**
 * Extract a plugin archive to the plugins directory
 */
export async function extractPlugin(
  buffer: Buffer,
  options: { force?: boolean } = {}
): Promise<ExtractionResult> {
  // Validate first
  const validation = await validateArchive(buffer);
  if (!validation.valid || !validation.manifest) {
    return { success: false, error: validation.error };
  }

  const pluginName = validation.manifest.name;
  const pluginPath = path.join(PLUGINS_DIR, pluginName);

  // Check for existing plugin
  if (await pluginExists(pluginName)) {
    if (!options.force) {
      return {
        success: false,
        error: `Plugin '${pluginName}' already exists`,
        conflict: true,
        pluginName,
      };
    }
    // Remove existing plugin files
    await removePluginFiles(pluginName);
  }

  // Ensure plugins directory exists
  await fs.mkdir(PLUGINS_DIR, { recursive: true });

  try {
    if (validation.archiveType === 'zip') {
      await extractZip(buffer, pluginName, pluginPath);
    } else {
      await extractTar(buffer, pluginName, pluginPath);
    }

    return {
      success: true,
      pluginName,
      pluginPath,
    };
  } catch (error) {
    // Clean up on failure
    try {
      await fs.rm(pluginPath, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
    return {
      success: false,
      error: `Extraction failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

async function extractZip(buffer: Buffer, pluginName: string, pluginPath: string): Promise<void> {
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();

  // Determine if archive has a root directory matching plugin name
  const manifestResult = findManifestInZip(zip);
  const rootDir = manifestResult?.rootDir || '';

  await fs.mkdir(pluginPath, { recursive: true });

  for (const entry of entries) {
    let targetPath: string;
    if (rootDir && entry.entryName.startsWith(rootDir + '/')) {
      // Strip root directory, put under plugin name
      const relativePath = entry.entryName.slice(rootDir.length + 1);
      if (!relativePath) continue; // Skip the root dir entry itself
      targetPath = path.join(pluginPath, relativePath);
    } else if (!rootDir) {
      // Flat archive - put everything under plugin name dir
      targetPath = path.join(pluginPath, entry.entryName);
    } else {
      // File outside root dir, put under plugin name
      targetPath = path.join(pluginPath, entry.entryName);
    }

    // Safety check
    if (!targetPath.startsWith(pluginPath)) {
      throw new Error(`Path traversal detected: ${entry.entryName}`);
    }

    if (entry.isDirectory) {
      await fs.mkdir(targetPath, { recursive: true });
    } else {
      await fs.mkdir(path.dirname(targetPath), { recursive: true });
      await fs.writeFile(targetPath, entry.getData());
    }
  }
}

async function extractTar(buffer: Buffer, pluginName: string, pluginPath: string): Promise<void> {
  const entries: { path: string; data: Buffer; type: string }[] = [];

  // Parse all entries first
  await new Promise<void>((resolve, reject) => {
    const parser = new tar.Parser({
      onReadEntry: (entry) => {
        const chunks: Buffer[] = [];
        entry.on('data', (chunk: Buffer) => chunks.push(chunk));
        entry.on('end', () => {
          entries.push({
            path: entry.path,
            data: Buffer.concat(chunks),
            type: entry.type || 'File',
          });
        });
        entry.resume();
      },
    });

    parser.on('end', resolve);
    parser.on('error', reject);

    const stream = Readable.from(buffer);
    stream.pipe(parser);
  });

  // Find root dir
  const manifestResult = findManifestInTar(entries);
  const rootDir = manifestResult?.rootDir || '';

  await fs.mkdir(pluginPath, { recursive: true });

  for (const entry of entries) {
    const normalized = entry.path.replace(/^\.\//, '');
    let targetPath: string;

    if (rootDir && normalized.startsWith(rootDir + '/')) {
      const relativePath = normalized.slice(rootDir.length + 1);
      if (!relativePath) continue;
      targetPath = path.join(pluginPath, relativePath);
    } else if (!rootDir) {
      targetPath = path.join(pluginPath, normalized);
    } else {
      targetPath = path.join(pluginPath, normalized);
    }

    // Safety check
    if (!targetPath.startsWith(pluginPath)) {
      throw new Error(`Path traversal detected: ${entry.path}`);
    }

    if (entry.type === 'Directory') {
      await fs.mkdir(targetPath, { recursive: true });
    } else {
      await fs.mkdir(path.dirname(targetPath), { recursive: true });
      await fs.writeFile(targetPath, entry.data);
    }
  }
}

// =============================================================================
// FILESYSTEM UTILITIES
// =============================================================================

/**
 * Check if a plugin exists in the plugins directory
 */
export async function pluginExists(name: string): Promise<boolean> {
  try {
    const pluginPath = path.join(PLUGINS_DIR, name);
    const stat = await fs.stat(pluginPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Remove plugin files from the plugins directory
 * Includes path traversal guard
 */
export async function removePluginFiles(name: string): Promise<void> {
  // Guard against path traversal
  if (name.includes('..') || name.includes('/') || name.includes('\\')) {
    throw new Error('Invalid plugin name: path traversal detected');
  }

  const pluginPath = path.join(PLUGINS_DIR, name);

  // Verify resolved path is within plugins directory
  const resolved = path.resolve(pluginPath);
  const resolvedPluginsDir = path.resolve(PLUGINS_DIR);
  if (!resolved.startsWith(resolvedPluginsDir + path.sep)) {
    throw new Error('Invalid plugin name: path traversal detected');
  }

  await fs.rm(pluginPath, { recursive: true, force: true });
}

export { MAX_ARCHIVE_SIZE, MAX_EXTRACTED_SIZE };
