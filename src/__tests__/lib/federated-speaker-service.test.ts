/**
 * Tests for the federated speaker service with encryption
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  isEncryptionEnabled,
  createFederatedSpeaker,
  updateFederatedSpeaker,
  upsertFederatedSpeaker,
  findFederatedSpeaker,
  findByCfpDirectoryId,
  findManyFederatedSpeakers,
  deleteFederatedSpeaker,
} from '@/lib/federation/federated-speaker-service';
import { isEncrypted } from '@/lib/security/encryption';

// Mock Prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    federatedSpeaker: {
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/db/prisma';

// Mock environment
const mockEnv = {
  NEXTAUTH_SECRET: 'a-very-secure-secret-that-is-at-least-32-characters-long',
  FEDERATION_LICENSE_KEY: 'test-license-key',
  NODE_ENV: 'test',
};

describe('FederatedSpeakerService', () => {
  beforeEach(() => {
    vi.stubEnv('NEXTAUTH_SECRET', mockEnv.NEXTAUTH_SECRET);
    vi.stubEnv('FEDERATION_LICENSE_KEY', mockEnv.FEDERATION_LICENSE_KEY);
    vi.stubEnv('NODE_ENV', mockEnv.NODE_ENV);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('isEncryptionEnabled', () => {
    it('should return true when ENCRYPT_PII_AT_REST is "true"', () => {
      vi.stubEnv('ENCRYPT_PII_AT_REST', 'true');
      expect(isEncryptionEnabled()).toBe(true);
    });

    it('should return false when ENCRYPT_PII_AT_REST is "false"', () => {
      vi.stubEnv('ENCRYPT_PII_AT_REST', 'false');
      expect(isEncryptionEnabled()).toBe(false);
    });

    it('should return true in production by default', () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('ENCRYPT_PII_AT_REST', '');
      expect(isEncryptionEnabled()).toBe(true);
    });

    it('should return false in development by default', () => {
      vi.stubEnv('NODE_ENV', 'development');
      vi.stubEnv('ENCRYPT_PII_AT_REST', '');
      expect(isEncryptionEnabled()).toBe(false);
    });
  });

  describe('createFederatedSpeaker', () => {
    it('should encrypt PII fields when encryption is enabled', async () => {
      vi.stubEnv('ENCRYPT_PII_AT_REST', 'true');
      
      const mockSpeaker = {
        id: 'speaker-1',
        cfpDirectorySpeakerId: 'cfp-123',
        name: 'enc:v1:test:encrypted:name',
        email: 'enc:v1:test:encrypted:email',
        bio: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.federatedSpeaker.create).mockResolvedValue(mockSpeaker as never);

      const result = await createFederatedSpeaker({
        cfpDirectorySpeakerId: 'cfp-123',
        name: 'John Doe',
        email: 'john@example.com',
        consentGrantedAt: new Date(),
        consentScopes: ['profile'],
      });

      // Verify create was called with encrypted data
      const createCall = vi.mocked(prisma.federatedSpeaker.create).mock.calls[0][0];
      const data = createCall?.data as Record<string, unknown>;
      
      expect(isEncrypted(data.name as string)).toBe(true);
      expect(isEncrypted(data.email as string)).toBe(true);
    });

    it('should not encrypt when encryption is disabled', async () => {
      vi.stubEnv('ENCRYPT_PII_AT_REST', 'false');
      
      const mockSpeaker = {
        id: 'speaker-1',
        cfpDirectorySpeakerId: 'cfp-123',
        name: 'John Doe',
        email: 'john@example.com',
        bio: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.federatedSpeaker.create).mockResolvedValue(mockSpeaker as never);

      await createFederatedSpeaker({
        cfpDirectorySpeakerId: 'cfp-123',
        name: 'John Doe',
        email: 'john@example.com',
        consentGrantedAt: new Date(),
        consentScopes: ['profile'],
      });

      // Verify create was called with plain data
      const createCall = vi.mocked(prisma.federatedSpeaker.create).mock.calls[0][0];
      const data = createCall?.data as Record<string, unknown>;
      
      expect(data.name).toBe('John Doe');
      expect(data.email).toBe('john@example.com');
    });
  });

  describe('findFederatedSpeaker', () => {
    it('should return null when speaker not found', async () => {
      vi.mocked(prisma.federatedSpeaker.findUnique).mockResolvedValue(null);

      const result = await findFederatedSpeaker({ id: 'nonexistent' });
      
      expect(result).toBeNull();
    });

    it('should decrypt PII fields when returning data', async () => {
      vi.stubEnv('ENCRYPT_PII_AT_REST', 'true');
      
      // Simulate stored encrypted data
      const originalName = 'Jane Doe';
      const { encryptString } = await import('@/lib/security/encryption');
      const encryptedName = encryptString(originalName);
      
      const mockSpeaker = {
        id: 'speaker-1',
        cfpDirectorySpeakerId: 'cfp-123',
        name: encryptedName,
        email: null,
        bio: null,
        avatarUrl: null,
        location: null,
        company: null,
        position: null,
        websiteUrl: null,
        linkedinUrl: null,
        twitterHandle: null,
        githubUsername: null,
        expertiseTags: [],
        speakingExperience: null,
        experienceLevel: null,
        languages: [],
        presentationTypes: [],
        audienceTypes: [],
        willingToTravel: false,
        virtualEventExperience: false,
        localUserId: null,
        consentGrantedAt: new Date(),
        consentScopes: ['profile'],
        lastSyncedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.federatedSpeaker.findUnique).mockResolvedValue(mockSpeaker as never);

      const result = await findFederatedSpeaker({ id: 'speaker-1' });
      
      // Verify name was decrypted
      expect(result?.name).toBe(originalName);
    });
  });

  describe('updateFederatedSpeaker', () => {
    it('should encrypt updated PII fields', async () => {
      vi.stubEnv('ENCRYPT_PII_AT_REST', 'true');
      
      const mockSpeaker = {
        id: 'speaker-1',
        cfpDirectorySpeakerId: 'cfp-123',
        name: 'enc:v1:test',
        email: null,
        bio: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.federatedSpeaker.update).mockResolvedValue(mockSpeaker as never);

      await updateFederatedSpeaker(
        { id: 'speaker-1' },
        { name: 'Updated Name', company: 'New Company' }
      );

      const updateCall = vi.mocked(prisma.federatedSpeaker.update).mock.calls[0][0];
      const data = updateCall?.data as Record<string, unknown>;
      
      expect(isEncrypted(data.name as string)).toBe(true);
      expect(isEncrypted(data.company as string)).toBe(true);
    });
  });

  describe('upsertFederatedSpeaker', () => {
    it('should encrypt both create and update data', async () => {
      vi.stubEnv('ENCRYPT_PII_AT_REST', 'true');
      
      const mockSpeaker = {
        id: 'speaker-1',
        cfpDirectorySpeakerId: 'cfp-123',
        name: 'enc:v1:test',
        email: null,
        bio: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.federatedSpeaker.upsert).mockResolvedValue(mockSpeaker as never);

      await upsertFederatedSpeaker(
        { cfpDirectorySpeakerId: 'cfp-123' },
        {
          cfpDirectorySpeakerId: 'cfp-123',
          name: 'New Speaker',
          email: 'new@example.com',
          consentGrantedAt: new Date(),
          consentScopes: ['profile'],
        },
        {
          name: 'Updated Speaker',
          email: 'updated@example.com',
        }
      );

      const upsertCall = vi.mocked(prisma.federatedSpeaker.upsert).mock.calls[0][0];
      const createData = upsertCall?.create as Record<string, unknown>;
      const updateData = upsertCall?.update as Record<string, unknown>;
      
      expect(isEncrypted(createData.name as string)).toBe(true);
      expect(isEncrypted(createData.email as string)).toBe(true);
      expect(isEncrypted(updateData.name as string)).toBe(true);
      expect(isEncrypted(updateData.email as string)).toBe(true);
    });
  });

  describe('findManyFederatedSpeakers', () => {
    it('should decrypt all speakers in the list', async () => {
      vi.stubEnv('ENCRYPT_PII_AT_REST', 'true');
      
      const { encryptString } = await import('@/lib/security/encryption');
      
      const mockSpeakers = [
        {
          id: 'speaker-1',
          cfpDirectorySpeakerId: 'cfp-1',
          name: encryptString('Speaker One'),
          email: null,
          bio: null,
          avatarUrl: null,
          location: null,
          company: null,
          position: null,
          websiteUrl: null,
          linkedinUrl: null,
          twitterHandle: null,
          githubUsername: null,
          expertiseTags: [],
          speakingExperience: null,
          experienceLevel: null,
          languages: [],
          presentationTypes: [],
          audienceTypes: [],
          willingToTravel: false,
          virtualEventExperience: false,
          localUserId: null,
          consentGrantedAt: new Date(),
          consentScopes: ['profile'],
          lastSyncedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'speaker-2',
          cfpDirectorySpeakerId: 'cfp-2',
          name: encryptString('Speaker Two'),
          email: null,
          bio: null,
          avatarUrl: null,
          location: null,
          company: null,
          position: null,
          websiteUrl: null,
          linkedinUrl: null,
          twitterHandle: null,
          githubUsername: null,
          expertiseTags: [],
          speakingExperience: null,
          experienceLevel: null,
          languages: [],
          presentationTypes: [],
          audienceTypes: [],
          willingToTravel: false,
          virtualEventExperience: false,
          localUserId: null,
          consentGrantedAt: new Date(),
          consentScopes: ['profile'],
          lastSyncedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(prisma.federatedSpeaker.findMany).mockResolvedValue(mockSpeakers as never);

      const result = await findManyFederatedSpeakers();
      
      expect(result[0].name).toBe('Speaker One');
      expect(result[1].name).toBe('Speaker Two');
    });
  });

  describe('findByCfpDirectoryId', () => {
    it('should query by cfpDirectorySpeakerId', async () => {
      vi.mocked(prisma.federatedSpeaker.findUnique).mockResolvedValue(null);

      await findByCfpDirectoryId('cfp-123');
      
      expect(prisma.federatedSpeaker.findUnique).toHaveBeenCalledWith({
        where: { cfpDirectorySpeakerId: 'cfp-123' },
      });
    });
  });

  describe('deleteFederatedSpeaker', () => {
    it('should delete and return decrypted data', async () => {
      vi.stubEnv('ENCRYPT_PII_AT_REST', 'true');
      
      const { encryptString } = await import('@/lib/security/encryption');
      
      const mockSpeaker = {
        id: 'speaker-1',
        cfpDirectorySpeakerId: 'cfp-123',
        name: encryptString('Deleted Speaker'),
        email: null,
        bio: null,
        avatarUrl: null,
        location: null,
        company: null,
        position: null,
        websiteUrl: null,
        linkedinUrl: null,
        twitterHandle: null,
        githubUsername: null,
        expertiseTags: [],
        speakingExperience: null,
        experienceLevel: null,
        languages: [],
        presentationTypes: [],
        audienceTypes: [],
        willingToTravel: false,
        virtualEventExperience: false,
        localUserId: null,
        consentGrantedAt: new Date(),
        consentScopes: ['profile'],
        lastSyncedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.federatedSpeaker.delete).mockResolvedValue(mockSpeaker as never);

      const result = await deleteFederatedSpeaker({ id: 'speaker-1' });
      
      expect(result.name).toBe('Deleted Speaker');
    });
  });
});
