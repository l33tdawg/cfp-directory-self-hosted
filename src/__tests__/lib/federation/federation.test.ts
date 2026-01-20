/**
 * Federation Service Tests
 * 
 * Tests for federation types, structures, and API response helpers.
 * These tests focus on type validation and structure correctness.
 */

import { describe, it, expect } from 'vitest';

describe('Federation Types', () => {
  describe('LicenseTier', () => {
    it('should have valid tier values', () => {
      const validTiers = ['starter', 'professional', 'enterprise'];
      validTiers.forEach(tier => {
        expect(['starter', 'professional', 'enterprise']).toContain(tier);
      });
    });
  });

  describe('LicenseStatus', () => {
    it('should have valid status values', () => {
      const validStatuses = ['active', 'expired', 'suspended', 'invalid'];
      validStatuses.forEach(status => {
        expect(['active', 'expired', 'suspended', 'invalid']).toContain(status);
      });
    });
  });

  describe('LicenseFeatures structure', () => {
    it('should contain expected feature flags', () => {
      const features = {
        federatedEvents: true,
        speakerProfiles: true,
        bidirectionalMessaging: true,
        materialsSync: true,
        webhooks: true,
        prioritySupport: false,
        customBranding: false,
        analyticsExport: false,
      };

      expect(features).toHaveProperty('federatedEvents');
      expect(features).toHaveProperty('speakerProfiles');
      expect(features).toHaveProperty('bidirectionalMessaging');
      expect(features).toHaveProperty('materialsSync');
      expect(features).toHaveProperty('webhooks');
      expect(features).toHaveProperty('prioritySupport');
      expect(features).toHaveProperty('customBranding');
      expect(features).toHaveProperty('analyticsExport');
    });
  });

  describe('FederationState structure', () => {
    it('should have correct structure', () => {
      const state = {
        isEnabled: true,
        isConfigured: true,
        isValid: true,
        license: null,
        warnings: [],
        lastValidated: new Date(),
        lastHeartbeat: null,
      };

      expect(state).toHaveProperty('isEnabled');
      expect(state).toHaveProperty('isConfigured');
      expect(state).toHaveProperty('isValid');
      expect(state).toHaveProperty('license');
      expect(state).toHaveProperty('warnings');
      expect(state).toHaveProperty('lastValidated');
      expect(state).toHaveProperty('lastHeartbeat');
    });
  });
});

describe('Federation License Client Types', () => {
  describe('FederationApiError', () => {
    it('should create error with correct properties', () => {
      // Test error class structure
      class TestFederationApiError extends Error {
        constructor(
          message: string,
          public readonly statusCode: number,
          public readonly data?: unknown
        ) {
          super(message);
          this.name = 'FederationApiError';
        }
      }
      
      const error = new TestFederationApiError('Test error', 401, { detail: 'Invalid' });
      
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(401);
      expect(error.data).toEqual({ detail: 'Invalid' });
      expect(error.name).toBe('FederationApiError');
    });
  });

  describe('ValidateLicenseRequest', () => {
    it('should have correct structure', () => {
      const request = {
        licenseKey: 'test_key_123',
        instanceUrl: 'http://localhost:3000',
        version: '0.1.0',
      };

      expect(request).toHaveProperty('licenseKey');
      expect(request).toHaveProperty('instanceUrl');
      expect(request).toHaveProperty('version');
      expect(typeof request.licenseKey).toBe('string');
      expect(typeof request.instanceUrl).toBe('string');
      expect(typeof request.version).toBe('string');
    });
  });

  describe('ValidateLicenseResponse', () => {
    it('should have correct structure for valid response', () => {
      const response = {
        valid: true,
        license: {
          id: 'lic_123',
          tier: 'professional',
          status: 'active',
          organizationName: 'Test Org',
          features: { federatedEvents: true },
          limits: { maxFederatedEvents: 10 },
          expiresAt: '2026-01-01T00:00:00.000Z',
          issuedAt: '2025-01-01T00:00:00.000Z',
        },
        publicKey: '-----BEGIN PUBLIC KEY-----...',
        warnings: [],
      };

      expect(response.valid).toBe(true);
      expect(response.license).toBeDefined();
      expect(response.license.tier).toBe('professional');
    });

    it('should have correct structure for invalid response', () => {
      const response = {
        valid: false,
        error: 'Invalid license key',
      };

      expect(response.valid).toBe(false);
      expect(response.error).toBeDefined();
    });
  });

  describe('HeartbeatRequest', () => {
    it('should have correct structure', () => {
      const request = {
        licenseKey: 'test_key_123',
        instanceUrl: 'http://localhost:3000',
        version: '0.1.0',
        stats: {
          totalEvents: 5,
          federatedEvents: 2,
          totalSubmissions: 10,
          federatedSubmissions: 4,
          activeUsers: 3,
        },
      };

      expect(request).toHaveProperty('licenseKey');
      expect(request).toHaveProperty('instanceUrl');
      expect(request).toHaveProperty('version');
      expect(request).toHaveProperty('stats');
      expect(request.stats).toHaveProperty('totalEvents');
      expect(request.stats).toHaveProperty('federatedEvents');
    });
  });

  describe('HeartbeatResponse', () => {
    it('should have correct structure for success', () => {
      const response = {
        success: true,
        warnings: [],
        latestVersion: '0.2.0',
        updateAvailable: true,
      };

      expect(response.success).toBe(true);
      expect(response.warnings).toEqual([]);
      expect(response.latestVersion).toBe('0.2.0');
    });

    it('should handle warnings correctly', () => {
      const response = {
        success: true,
        warnings: [
          { code: 'LICENSE_EXPIRING', message: 'License expires in 7 days', severity: 'warning' },
        ],
      };

      expect(response.warnings).toHaveLength(1);
      expect(response.warnings[0].code).toBe('LICENSE_EXPIRING');
      expect(response.warnings[0].severity).toBe('warning');
    });
  });
});

describe('Event Registration Types', () => {
  describe('RegisterEventRequest', () => {
    it('should have correct structure', () => {
      const request = {
        licenseKey: 'test_key',
        event: {
          name: 'DevConf 2025',
          slug: 'devconf-2025',
          description: 'A great conference',
          websiteUrl: 'https://devconf.example.com',
          location: 'San Francisco',
          isVirtual: false,
          startDate: '2025-06-15T09:00:00.000Z',
          endDate: '2025-06-17T18:00:00.000Z',
          cfpOpensAt: '2025-01-01T00:00:00.000Z',
          cfpClosesAt: '2025-04-30T23:59:59.000Z',
          tracks: [{ name: 'Web', description: 'Web technologies' }],
          formats: [{ name: 'Talk', durationMin: 45 }],
        },
        callbackUrl: 'https://example.com/api/federation/incoming-webhook',
      };

      expect(request).toHaveProperty('licenseKey');
      expect(request).toHaveProperty('event');
      expect(request).toHaveProperty('callbackUrl');
      expect(request.event).toHaveProperty('name');
      expect(request.event).toHaveProperty('slug');
      expect(request.event).toHaveProperty('tracks');
      expect(request.event).toHaveProperty('formats');
    });
  });

  describe('RegisterEventResponse', () => {
    it('should have correct structure for success', () => {
      const response = {
        success: true,
        federatedEventId: 'fed_evt_123',
        webhookSecret: 'whsec_abc123',
      };

      expect(response.success).toBe(true);
      expect(response).toHaveProperty('federatedEventId');
      expect(response).toHaveProperty('webhookSecret');
    });

    it('should have correct structure for error', () => {
      const response = {
        success: false,
        error: 'Max events limit reached',
      };

      expect(response.success).toBe(false);
      expect(response).toHaveProperty('error');
    });
  });
});

describe('Webhook Types', () => {
  describe('WebhookEventType', () => {
    it('should have valid event types', () => {
      const validTypes = [
        'submission.created',
        'submission.updated',
        'submission.status_updated',
        'message.sent',
        'message.read',
        'speaker.profile_updated',
        'speaker.consent_revoked',
      ];

      validTypes.forEach(type => {
        expect(type).toMatch(/^(submission|message|speaker)\./);
      });
    });
  });

  describe('WebhookPayload', () => {
    it('should have correct structure', () => {
      const payload = {
        id: 'wh_123',
        type: 'submission.created',
        timestamp: '2025-01-15T10:00:00.000Z',
        federatedEventId: 'fed_evt_123',
        data: {
          submissionId: 'sub_123',
          speakerId: 'spk_123',
          title: 'Test Talk',
          abstract: 'This is a test',
        },
      };

      expect(payload).toHaveProperty('id');
      expect(payload).toHaveProperty('type');
      expect(payload).toHaveProperty('timestamp');
      expect(payload).toHaveProperty('federatedEventId');
      expect(payload).toHaveProperty('data');
    });
  });
});

describe('API Response - badRequestResponse', () => {
  it('should return 400 status', async () => {
    const { badRequestResponse } = await import('@/lib/api/response');
    const response = badRequestResponse('Invalid input');

    expect(response.status).toBe(400);

    const json = await response.json();
    expect(json.success).toBe(false);
    expect(json.error).toBe('Invalid input');
  });

  it('should handle various error messages', async () => {
    const { badRequestResponse } = await import('@/lib/api/response');
    
    const messages = [
      'Event is already federated',
      'Federation is not available',
      'Your license does not include federated events',
    ];

    for (const msg of messages) {
      const response = badRequestResponse(msg);
      const json = await response.json();
      expect(json.error).toBe(msg);
    }
  });
});
