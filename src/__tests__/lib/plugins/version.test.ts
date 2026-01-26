/**
 * Plugin Version Tests
 */

import { describe, it, expect } from 'vitest';
import {
  CURRENT_API_VERSION,
  SUPPORTED_VERSIONS,
  isVersionSupported,
  getMajorVersion,
  getMinorVersion,
  areVersionsCompatible,
  getVersionInfo,
  VERSION_CHANGELOG,
  UPCOMING_FEATURES,
} from '@/lib/plugins/version';

describe('Plugin Version', () => {
  describe('Constants', () => {
    it('should have current API version defined', () => {
      expect(CURRENT_API_VERSION).toBe('1.0');
    });

    it('should have supported versions array', () => {
      expect(SUPPORTED_VERSIONS).toContain('1.0');
      expect(Array.isArray(SUPPORTED_VERSIONS)).toBe(true);
    });

    it('should have version changelog', () => {
      expect(VERSION_CHANGELOG).toHaveProperty('1.0');
      expect(Array.isArray(VERSION_CHANGELOG['1.0'])).toBe(true);
    });

    it('should have upcoming features', () => {
      expect(typeof UPCOMING_FEATURES).toBe('object');
    });
  });

  describe('isVersionSupported', () => {
    it('should return true for supported version', () => {
      expect(isVersionSupported('1.0')).toBe(true);
    });

    it('should return false for unsupported version', () => {
      expect(isVersionSupported('2.0')).toBe(false);
      expect(isVersionSupported('0.9')).toBe(false);
      expect(isVersionSupported('invalid')).toBe(false);
    });
  });

  describe('getMajorVersion', () => {
    it('should extract major version', () => {
      expect(getMajorVersion('1.0')).toBe(1);
      expect(getMajorVersion('2.5')).toBe(2);
      expect(getMajorVersion('10.3')).toBe(10);
    });

    it('should handle single number', () => {
      expect(getMajorVersion('1')).toBe(1);
    });
  });

  describe('getMinorVersion', () => {
    it('should extract minor version', () => {
      expect(getMinorVersion('1.0')).toBe(0);
      expect(getMinorVersion('2.5')).toBe(5);
      expect(getMinorVersion('10.3')).toBe(3);
    });

    it('should default to 0 for single number', () => {
      expect(getMinorVersion('1')).toBe(0);
    });
  });

  describe('areVersionsCompatible', () => {
    it('should return true for same version', () => {
      expect(areVersionsCompatible('1.0', '1.0')).toBe(true);
    });

    it('should return true when plugin targets older minor version', () => {
      expect(areVersionsCompatible('1.0', '1.5')).toBe(true);
    });

    it('should return false when plugin targets newer minor version', () => {
      expect(areVersionsCompatible('1.5', '1.0')).toBe(false);
    });

    it('should return false for different major versions', () => {
      expect(areVersionsCompatible('2.0', '1.0')).toBe(false);
      expect(areVersionsCompatible('1.0', '2.0')).toBe(false);
    });

    it('should use current API version when not specified', () => {
      expect(areVersionsCompatible('1.0')).toBe(true);
    });
  });

  describe('getVersionInfo', () => {
    it('should return version info for supported version', () => {
      const info = getVersionInfo('1.0');
      
      expect(info.current).toBe(CURRENT_API_VERSION);
      expect(info.supported).toEqual(SUPPORTED_VERSIONS);
      expect(info.isSupported).toBe(true);
      expect(info.isCompatible).toBe(true);
    });

    it('should return version info for unsupported version', () => {
      const info = getVersionInfo('2.0');
      
      expect(info.isSupported).toBe(false);
      expect(info.isCompatible).toBe(false);
    });
  });
});
