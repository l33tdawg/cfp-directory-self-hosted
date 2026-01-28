/**
 * Plugin Data Capability Implementation
 * @version 1.7.0
 *
 * Key-value data store for plugins with optional encryption.
 * Each plugin can only access its own data (scoped by pluginId).
 */

import type { PrismaClient } from '@prisma/client';
import type { PluginDataCapability } from '../types';
import { encryptString, decryptString, isEncrypted } from '@/lib/security/encryption';

export class PluginDataCapabilityImpl implements PluginDataCapability {
  constructor(
    private prisma: PrismaClient,
    private pluginId: string
  ) {}

  async set(
    namespace: string,
    key: string,
    value: unknown,
    options?: { encrypted?: boolean }
  ): Promise<void> {
    const encrypted = options?.encrypted ?? false;
    let storedValue = value;

    if (encrypted && typeof value === 'string') {
      storedValue = encryptString(value);
    } else if (encrypted) {
      storedValue = encryptString(JSON.stringify(value));
    }

    await this.prisma.pluginData.upsert({
      where: {
        pluginId_namespace_key: {
          pluginId: this.pluginId,
          namespace,
          key,
        },
      },
      create: {
        pluginId: this.pluginId,
        namespace,
        key,
        value: storedValue as Parameters<typeof JSON.stringify>[0],
        encrypted,
      },
      update: {
        value: storedValue as Parameters<typeof JSON.stringify>[0],
        encrypted,
      },
    });
  }

  async get<T = unknown>(namespace: string, key: string): Promise<T | null> {
    const record = await this.prisma.pluginData.findUnique({
      where: {
        pluginId_namespace_key: {
          pluginId: this.pluginId,
          namespace,
          key,
        },
      },
    });

    if (!record) return null;

    if (record.encrypted) {
      const raw = record.value as unknown;
      if (typeof raw === 'string' && isEncrypted(raw)) {
        const decrypted = decryptString(raw);
        try {
          return JSON.parse(decrypted) as T;
        } catch {
          return decrypted as T;
        }
      }
    }

    return record.value as T;
  }

  async list(namespace: string): Promise<string[]> {
    const records = await this.prisma.pluginData.findMany({
      where: {
        pluginId: this.pluginId,
        namespace,
      },
      select: { key: true },
      orderBy: { key: 'asc' },
    });

    return records.map((r) => r.key);
  }

  async delete(namespace: string, key: string): Promise<void> {
    await this.prisma.pluginData.deleteMany({
      where: {
        pluginId: this.pluginId,
        namespace,
        key,
      },
    });
  }

  async clear(namespace: string): Promise<void> {
    await this.prisma.pluginData.deleteMany({
      where: {
        pluginId: this.pluginId,
        namespace,
      },
    });
  }
}
