/**
 * Plugin Types Tests
 */

import { describe, it, expect } from 'vitest';
import {
  PluginPermissionError,
  PluginNotFoundError,
  PluginVersionError,
  PERMISSION_DESCRIPTIONS,
} from '@/lib/plugins/types';

describe('Plugin Types', () => {
  describe('PluginPermissionError', () => {
    it('should create error with permission', () => {
      const error = new PluginPermissionError('submissions:read');
      
      expect(error.name).toBe('PluginPermissionError');
      expect(error.permission).toBe('submissions:read');
      expect(error.message).toBe('Plugin permission required: submissions:read');
    });

    it('should be instanceof Error', () => {
      const error = new PluginPermissionError('users:read');
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(PluginPermissionError);
    });
  });

  describe('PluginNotFoundError', () => {
    it('should create error with plugin name', () => {
      const error = new PluginNotFoundError('my-plugin');
      
      expect(error.name).toBe('PluginNotFoundError');
      expect(error.pluginName).toBe('my-plugin');
      expect(error.message).toBe('Plugin not found: my-plugin');
    });
  });

  describe('PluginVersionError', () => {
    it('should create error with version info', () => {
      const error = new PluginVersionError('2.0', ['1.0']);
      
      expect(error.name).toBe('PluginVersionError');
      expect(error.pluginVersion).toBe('2.0');
      expect(error.supportedVersions).toEqual(['1.0']);
      expect(error.message).toBe('Plugin API version 2.0 is not supported. Supported versions: 1.0');
    });

    it('should list multiple supported versions', () => {
      const error = new PluginVersionError('3.0', ['1.0', '2.0']);
      
      expect(error.message).toBe('Plugin API version 3.0 is not supported. Supported versions: 1.0, 2.0');
    });
  });

  describe('PERMISSION_DESCRIPTIONS', () => {
    it('should have descriptions for all permissions', () => {
      const expectedPermissions = [
        'submissions:read',
        'submissions:manage',
        'users:read',
        'users:manage',
        'events:read',
        'events:manage',
        'reviews:read',
        'reviews:write',
        'storage:read',
        'storage:write',
        'email:send',
      ];

      for (const permission of expectedPermissions) {
        expect(PERMISSION_DESCRIPTIONS).toHaveProperty(permission);
        expect(typeof PERMISSION_DESCRIPTIONS[permission as keyof typeof PERMISSION_DESCRIPTIONS]).toBe('string');
      }
    });

    it('should have meaningful descriptions', () => {
      expect(PERMISSION_DESCRIPTIONS['submissions:read']).toBe('Read submission data');
      expect(PERMISSION_DESCRIPTIONS['email:send']).toBe('Send emails');
    });
  });
});
