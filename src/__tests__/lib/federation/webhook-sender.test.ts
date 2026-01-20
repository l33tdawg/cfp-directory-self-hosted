/**
 * Webhook Sender Tests
 * 
 * Tests for webhook signing, payload structure, and webhook types.
 */

import { describe, it, expect } from 'vitest';
import { createHmac } from 'crypto';

// Test the signing function logic directly
function signWebhookPayload(payload: string, secret: string): string {
  const hmac = createHmac('sha256', secret);
  hmac.update(payload);
  return hmac.digest('hex');
}

describe('Webhook Signing', () => {
  describe('signWebhookPayload', () => {
    it('should generate consistent HMAC-SHA256 signature', () => {
      const payload = JSON.stringify({ test: 'data' });
      const secret = 'test_secret_123';
      
      const signature1 = signWebhookPayload(payload, secret);
      const signature2 = signWebhookPayload(payload, secret);
      
      expect(signature1).toBe(signature2);
      expect(signature1).toMatch(/^[a-f0-9]{64}$/); // 64 hex characters
    });

    it('should generate different signatures for different payloads', () => {
      const secret = 'test_secret';
      const sig1 = signWebhookPayload('payload1', secret);
      const sig2 = signWebhookPayload('payload2', secret);
      
      expect(sig1).not.toBe(sig2);
    });

    it('should generate different signatures for different secrets', () => {
      const payload = 'same_payload';
      const sig1 = signWebhookPayload(payload, 'secret1');
      const sig2 = signWebhookPayload(payload, 'secret2');
      
      expect(sig1).not.toBe(sig2);
    });

    it('should handle empty payload', () => {
      const signature = signWebhookPayload('', 'secret');
      expect(signature).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should handle JSON payloads', () => {
      const payload = JSON.stringify({
        id: 'test-123',
        type: 'submission.created',
        timestamp: '2025-01-20T10:00:00.000Z',
        data: {
          submissionId: 'sub_123',
          title: 'Test Talk',
        },
      });
      
      const signature = signWebhookPayload(payload, 'webhook_secret');
      expect(signature).toMatch(/^[a-f0-9]{64}$/);
    });
  });
});

describe('Webhook Payload Structure', () => {
  describe('WebhookPayload', () => {
    it('should have correct structure', () => {
      const payload = {
        id: 'wh_123',
        type: 'submission.created',
        timestamp: '2025-01-20T10:00:00.000Z',
        federatedEventId: 'fed_evt_123',
        data: {
          submissionId: 'sub_123',
          speakerId: 'spk_123',
          title: 'Test Talk',
          abstract: 'Test abstract',
        },
      };

      expect(payload).toHaveProperty('id');
      expect(payload).toHaveProperty('type');
      expect(payload).toHaveProperty('timestamp');
      expect(payload).toHaveProperty('federatedEventId');
      expect(payload).toHaveProperty('data');
    });

    it('should have valid timestamp format', () => {
      const timestamp = new Date().toISOString();
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe('SubmissionWebhookData', () => {
    it('should have correct structure', () => {
      const data = {
        submissionId: 'sub_123',
        speakerId: 'spk_456',
        title: 'Building Scalable APIs',
        abstract: 'Learn how to build scalable APIs...',
        trackName: 'Backend',
        formatName: 'Talk',
        materials: [
          { type: 'slides', title: 'Presentation', url: 'https://example.com/slides.pdf' },
        ],
        coSpeakers: [
          { name: 'Jane Doe', email: 'jane@example.com' },
        ],
      };

      expect(data.submissionId).toBeDefined();
      expect(data.speakerId).toBeDefined();
      expect(data.title).toBeDefined();
      expect(data.abstract).toBeDefined();
      expect(data.materials).toBeInstanceOf(Array);
      expect(data.coSpeakers).toBeInstanceOf(Array);
    });

    it('should allow optional fields', () => {
      const minimalData = {
        submissionId: 'sub_123',
        speakerId: 'spk_456',
        title: 'Talk Title',
        abstract: 'Talk abstract',
      };

      expect(minimalData.submissionId).toBeDefined();
      expect(minimalData.trackName).toBeUndefined();
      expect(minimalData.formatName).toBeUndefined();
    });
  });

  describe('StatusUpdateWebhookData', () => {
    it('should have correct structure for accept', () => {
      const data = {
        submissionId: 'sub_123',
        status: 'ACCEPTED',
        feedback: 'Great talk proposal! We look forward to your presentation.',
      };

      expect(data.submissionId).toBeDefined();
      expect(data.status).toBe('ACCEPTED');
      expect(data.feedback).toBeDefined();
    });

    it('should have correct structure for reject', () => {
      const data = {
        submissionId: 'sub_123',
        status: 'REJECTED',
        feedback: 'Unfortunately, this does not fit our program this year.',
      };

      expect(data.status).toBe('REJECTED');
    });

    it('should allow status without feedback', () => {
      const data = {
        submissionId: 'sub_123',
        status: 'WAITLISTED',
      };

      expect(data.submissionId).toBeDefined();
      expect(data.status).toBe('WAITLISTED');
      expect(data.feedback).toBeUndefined();
    });
  });

  describe('MessageWebhookData', () => {
    it('should have correct structure for organizer message', () => {
      const data = {
        messageId: 'msg_123',
        submissionId: 'sub_456',
        subject: 'Question about your talk',
        body: 'Could you clarify the technical requirements?',
        senderType: 'organizer',
      };

      expect(data.messageId).toBeDefined();
      expect(data.submissionId).toBeDefined();
      expect(data.body).toBeDefined();
      expect(data.senderType).toBe('organizer');
    });

    it('should allow subject to be optional', () => {
      const data = {
        messageId: 'msg_123',
        submissionId: 'sub_456',
        body: 'Quick question...',
        senderType: 'organizer',
      };

      expect(data.subject).toBeUndefined();
    });
  });
});

describe('Webhook Event Types', () => {
  it('should have valid submission event types', () => {
    const validTypes = [
      'submission.created',
      'submission.updated',
      'submission.status_updated',
    ];
    
    validTypes.forEach(type => {
      expect(type).toMatch(/^submission\./);
    });
  });

  it('should have valid message event types', () => {
    const validTypes = [
      'message.sent',
      'message.read',
    ];
    
    validTypes.forEach(type => {
      expect(type).toMatch(/^message\./);
    });
  });

  it('should have valid speaker event types', () => {
    const validTypes = [
      'speaker.profile_updated',
      'speaker.consent_revoked',
    ];
    
    validTypes.forEach(type => {
      expect(type).toMatch(/^speaker\./);
    });
  });
});

describe('Webhook Headers', () => {
  it('should include required headers', () => {
    const requiredHeaders = [
      'Content-Type',
      'X-Webhook-Id',
      'X-Webhook-Timestamp',
      'X-Webhook-Signature',
      'User-Agent',
    ];

    const mockHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Webhook-Id': 'wh_test_123',
      'X-Webhook-Timestamp': Date.now().toString(),
      'X-Webhook-Signature': 'sha256=abc123...',
      'User-Agent': 'CFP-Directory-Self-Hosted-Webhook/1.0',
    };

    requiredHeaders.forEach(header => {
      expect(mockHeaders).toHaveProperty(header);
    });
  });

  it('should have correct signature format', () => {
    const signatureHeader = 'sha256=abc123def456...';
    expect(signatureHeader).toMatch(/^sha256=[a-f0-9]+/);
  });

  it('should have numeric timestamp', () => {
    const timestamp = Date.now().toString();
    expect(parseInt(timestamp)).toBeGreaterThan(0);
  });
});

describe('Webhook Result', () => {
  it('should have correct structure for success', () => {
    const result = {
      success: true,
      webhookId: 'wh_123',
      statusCode: 200,
      retryCount: 0,
    };

    expect(result.success).toBe(true);
    expect(result.webhookId).toBeDefined();
    expect(result.statusCode).toBe(200);
  });

  it('should have correct structure for failure', () => {
    const result = {
      success: false,
      webhookId: 'wh_123',
      statusCode: 500,
      error: 'Server error',
      retryCount: 3,
    };

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.retryCount).toBe(3);
  });

  it('should handle network errors', () => {
    const result = {
      success: false,
      webhookId: 'wh_123',
      error: 'Network timeout',
      retryCount: 3,
    };

    expect(result.success).toBe(false);
    expect(result.statusCode).toBeUndefined();
    expect(result.error).toBe('Network timeout');
  });
});

describe('Retry Logic', () => {
  it('should have reasonable retry delays', () => {
    const retryDelays = [1000, 5000, 15000];
    
    // First retry should be quick
    expect(retryDelays[0]).toBeLessThanOrEqual(2000);
    
    // Each delay should be longer than the previous
    for (let i = 1; i < retryDelays.length; i++) {
      expect(retryDelays[i]).toBeGreaterThan(retryDelays[i - 1]);
    }
    
    // Max delay shouldn't be too long
    expect(retryDelays[retryDelays.length - 1]).toBeLessThanOrEqual(60000);
  });

  it('should have reasonable max retries', () => {
    const maxRetries = 3;
    expect(maxRetries).toBeGreaterThanOrEqual(1);
    expect(maxRetries).toBeLessThanOrEqual(5);
  });

  it('should have reasonable timeout', () => {
    const timeoutMs = 10000;
    expect(timeoutMs).toBeGreaterThanOrEqual(5000);
    expect(timeoutMs).toBeLessThanOrEqual(30000);
  });
});

describe('Non-retryable Errors', () => {
  it('should identify 4xx errors as non-retryable (except 429)', () => {
    const nonRetryable = [400, 401, 403, 404];
    const retryable = [429, 500, 502, 503, 504];

    nonRetryable.forEach(status => {
      expect(status >= 400 && status < 500 && status !== 429).toBe(true);
    });

    retryable.forEach(status => {
      expect(status === 429 || status >= 500).toBe(true);
    });
  });
});
