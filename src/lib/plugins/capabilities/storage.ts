/**
 * Storage Capability Implementation
 * @version 1.1.0
 *
 * Permission-gated access to file storage.
 */

import type { StorageCapability, PluginPermission } from '../types';
import { PluginPermissionError } from '../types';
import { getStorage } from '@/lib/storage/local-storage-provider';

export class StorageCapabilityImpl implements StorageCapability {
  constructor(
    private permissions: Set<PluginPermission>,
    private pluginName: string
  ) {}

  private requirePermission(permission: PluginPermission): void {
    if (!this.permissions.has(permission)) {
      throw new PluginPermissionError(permission);
    }
  }

  async getUrl(key: string): Promise<string> {
    this.requirePermission('storage:read');
    
    const storage = getStorage();
    return storage.getPublicUrl(key);
  }

  async upload(file: Buffer, filename: string, mimeType: string): Promise<string> {
    this.requirePermission('storage:write');
    
    const storage = getStorage();
    
    // Use plugin-specific prefix to namespace files
    const storagePath = `plugins/${this.pluginName}/${Date.now()}-${filename}`;
    
    const result = await storage.upload(storagePath, file, {
      contentType: mimeType,
      isPublic: false,
    });
    
    return result.url;
  }

  async delete(key: string): Promise<void> {
    this.requirePermission('storage:write');
    
    const storage = getStorage();
    await storage.delete(key);
  }
}
