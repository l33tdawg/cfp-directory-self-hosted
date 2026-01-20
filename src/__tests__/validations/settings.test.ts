/**
 * Settings Validation Schema Tests
 */

import { describe, it, expect } from 'vitest';
import {
  updateSiteSettingsSchema,
  updateFederationSettingsSchema,
  updateUserRoleSchema,
} from '@/lib/validations/settings';

describe('Settings Validation Schemas', () => {
  describe('updateSiteSettingsSchema', () => {
    it('should validate complete site settings', () => {
      const settings = {
        name: 'My Conference CFP',
        description: 'The premier conference for developers',
        websiteUrl: 'https://myconference.com',
        logoUrl: 'https://myconference.com/logo.png',
        contactEmail: 'contact@myconference.com',
        supportUrl: 'https://myconference.com/support',
      };

      const result = updateSiteSettingsSchema.safeParse(settings);
      expect(result.success).toBe(true);
    });

    it('should allow partial updates', () => {
      const settings = {
        name: 'Updated Name',
      };

      const result = updateSiteSettingsSchema.safeParse(settings);
      expect(result.success).toBe(true);
    });

    it('should allow empty object', () => {
      const result = updateSiteSettingsSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should validate website URL format', () => {
      const settings = {
        websiteUrl: 'not-a-url',
      };

      const result = updateSiteSettingsSchema.safeParse(settings);
      expect(result.success).toBe(false);
    });

    it('should allow empty URL strings', () => {
      const settings = {
        websiteUrl: '',
        logoUrl: '',
        supportUrl: '',
      };

      const result = updateSiteSettingsSchema.safeParse(settings);
      expect(result.success).toBe(true);
    });

    it('should validate email format', () => {
      const settings = {
        contactEmail: 'not-an-email',
      };

      const result = updateSiteSettingsSchema.safeParse(settings);
      expect(result.success).toBe(false);
    });

    it('should allow empty email string', () => {
      const settings = {
        contactEmail: '',
      };

      const result = updateSiteSettingsSchema.safeParse(settings);
      expect(result.success).toBe(true);
    });

    it('should enforce name max length', () => {
      const settings = {
        name: 'a'.repeat(201),
      };

      const result = updateSiteSettingsSchema.safeParse(settings);
      expect(result.success).toBe(false);
    });

    it('should enforce description max length', () => {
      const settings = {
        description: 'a'.repeat(2001),
      };

      const result = updateSiteSettingsSchema.safeParse(settings);
      expect(result.success).toBe(false);
    });
  });

  describe('updateFederationSettingsSchema', () => {
    it('should validate enabling federation', () => {
      const settings = {
        federationEnabled: true,
        federationLicenseKey: 'license-key-123',
      };

      const result = updateFederationSettingsSchema.safeParse(settings);
      expect(result.success).toBe(true);
    });

    it('should validate disabling federation', () => {
      const settings = {
        federationEnabled: false,
      };

      const result = updateFederationSettingsSchema.safeParse(settings);
      expect(result.success).toBe(true);
    });

    it('should require federationEnabled', () => {
      const settings = {
        federationLicenseKey: 'some-key',
      };

      const result = updateFederationSettingsSchema.safeParse(settings);
      expect(result.success).toBe(false);
    });

    it('should allow empty license key', () => {
      const settings = {
        federationEnabled: false,
        federationLicenseKey: '',
      };

      const result = updateFederationSettingsSchema.safeParse(settings);
      expect(result.success).toBe(true);
    });

    it('should allow removing license key', () => {
      const settings = {
        federationEnabled: false,
        federationLicenseKey: '',
      };

      const result = updateFederationSettingsSchema.safeParse(settings);
      expect(result.success).toBe(true);
    });
  });

  describe('updateUserRoleSchema', () => {
    it('should validate ADMIN role', () => {
      const data = { role: 'ADMIN' };
      const result = updateUserRoleSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should validate ORGANIZER role', () => {
      const data = { role: 'ORGANIZER' };
      const result = updateUserRoleSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should validate REVIEWER role', () => {
      const data = { role: 'REVIEWER' };
      const result = updateUserRoleSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should validate USER role', () => {
      const data = { role: 'USER' };
      const result = updateUserRoleSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should require role', () => {
      const result = updateUserRoleSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject invalid role', () => {
      const data = { role: 'SUPERADMIN' };
      const result = updateUserRoleSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject lowercase roles', () => {
      const data = { role: 'admin' };
      const result = updateUserRoleSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
});
