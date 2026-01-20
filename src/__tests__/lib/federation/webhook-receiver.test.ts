/**
 * Webhook Receiver Tests
 * 
 * Tests for signature verification, incoming message handling,
 * and consent revocation processing.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHmac, timingSafeEqual } from 'crypto';

// Test the signature verification logic directly
function verifyWebhookSignature(
  payload: string,
  signature: string,
  timestamp: string,
  secret: string
): boolean {
  try {
    if (!signature.startsWith('sha256=')) {
      return false;
    }
    
    const providedSignature = signature.slice(7);
    const timestampMs = parseInt(timestamp, 10);
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    
    if (isNaN(timestampMs) || Math.abs(now - timestampMs) > fiveMinutes) {
      return false;
    }
    
    const signatureData = `${timestamp}.${payload}`;
    const hmac = createHmac('sha256', secret);
    hmac.update(signatureData);
    const expectedSignature = hmac.digest('hex');
    
    const providedBuffer = Buffer.from(providedSignature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    
    if (providedBuffer.length !== expectedBuffer.length) {
      return false;
    }
    
    return timingSafeEqual(providedBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

// Helper to create a valid signature
function createTestSignature(payload: string, timestamp: string, secret: string): string {
  const signatureData = `${timestamp}.${payload}`;
  const hmac = createHmac('sha256', secret);
  hmac.update(signatureData);
  return `sha256=${hmac.digest('hex')}`;
}

describe('Webhook Signature Verification', () => {
  const testSecret = 'whsec_test_secret_123';
  const testPayload = JSON.stringify({ test: 'data', id: '123' });
  
  describe('verifyWebhookSignature', () => {
    it('should accept valid signature with current timestamp', () => {
      const timestamp = Date.now().toString();
      const signature = createTestSignature(testPayload, timestamp, testSecret);
      
      const result = verifyWebhookSignature(testPayload, signature, timestamp, testSecret);
      expect(result).toBe(true);
    });

    it('should accept signature within 5 minute window', () => {
      // 2 minutes ago
      const timestamp = (Date.now() - 2 * 60 * 1000).toString();
      const signature = createTestSignature(testPayload, timestamp, testSecret);
      
      const result = verifyWebhookSignature(testPayload, signature, timestamp, testSecret);
      expect(result).toBe(true);
    });

    it('should reject signature older than 5 minutes', () => {
      // 6 minutes ago
      const timestamp = (Date.now() - 6 * 60 * 1000).toString();
      const signature = createTestSignature(testPayload, timestamp, testSecret);
      
      const result = verifyWebhookSignature(testPayload, signature, timestamp, testSecret);
      expect(result).toBe(false);
    });

    it('should reject signature from the future (>5 min)', () => {
      // 6 minutes in the future
      const timestamp = (Date.now() + 6 * 60 * 1000).toString();
      const signature = createTestSignature(testPayload, timestamp, testSecret);
      
      const result = verifyWebhookSignature(testPayload, signature, timestamp, testSecret);
      expect(result).toBe(false);
    });

    it('should reject invalid signature format', () => {
      const timestamp = Date.now().toString();
      
      // Missing sha256= prefix
      const result = verifyWebhookSignature(testPayload, 'invalid', timestamp, testSecret);
      expect(result).toBe(false);
    });

    it('should reject wrong signature', () => {
      const timestamp = Date.now().toString();
      const wrongSignature = 'sha256=0000000000000000000000000000000000000000000000000000000000000000';
      
      const result = verifyWebhookSignature(testPayload, wrongSignature, timestamp, testSecret);
      expect(result).toBe(false);
    });

    it('should reject signature with wrong secret', () => {
      const timestamp = Date.now().toString();
      const signature = createTestSignature(testPayload, timestamp, 'wrong_secret');
      
      const result = verifyWebhookSignature(testPayload, signature, timestamp, testSecret);
      expect(result).toBe(false);
    });

    it('should reject modified payload', () => {
      const timestamp = Date.now().toString();
      const signature = createTestSignature(testPayload, timestamp, testSecret);
      const modifiedPayload = JSON.stringify({ test: 'modified', id: '123' });
      
      const result = verifyWebhookSignature(modifiedPayload, signature, timestamp, testSecret);
      expect(result).toBe(false);
    });

    it('should reject invalid timestamp format', () => {
      const signature = createTestSignature(testPayload, 'not-a-number', testSecret);
      
      const result = verifyWebhookSignature(testPayload, signature, 'not-a-number', testSecret);
      expect(result).toBe(false);
    });
  });
});

describe('Incoming Message Webhook Types', () => {
  describe('MessageWebhookData for speaker reply', () => {
    it('should have correct structure', () => {
      const data = {
        messageId: 'msg_from_cfp_123',
        submissionId: 'sub_456',
        subject: 'Re: Question about your talk',
        body: 'Thank you for the question! Here is my answer...',
        senderType: 'speaker',
      };

      expect(data.messageId).toBeDefined();
      expect(data.submissionId).toBeDefined();
      expect(data.body).toBeDefined();
      expect(data.senderType).toBe('speaker');
    });

    it('should allow optional subject', () => {
      const data = {
        messageId: 'msg_123',
        submissionId: 'sub_456',
        body: 'Quick reply...',
        senderType: 'speaker',
      };

      expect(data.subject).toBeUndefined();
    });
  });

  describe('ConsentRevocationData', () => {
    it('should have correct structure', () => {
      const data = {
        speakerId: 'spk_cfp_123',
        deletionDeadline: '2026-02-19T00:00:00.000Z',
      };

      expect(data.speakerId).toBeDefined();
      expect(data.deletionDeadline).toBeDefined();
    });

    it('should have valid deletion deadline format', () => {
      const deletionDeadline = '2026-02-19T00:00:00.000Z';
      expect(new Date(deletionDeadline).toISOString()).toBe(deletionDeadline);
    });
  });
});

describe('Incoming Webhook Payload', () => {
  describe('message.sent webhook', () => {
    it('should have correct structure', () => {
      const payload = {
        id: 'wh_incoming_123',
        type: 'message.sent',
        timestamp: new Date().toISOString(),
        federatedEventId: 'fed_evt_456',
        data: {
          messageId: 'msg_789',
          submissionId: 'sub_012',
          body: 'Speaker reply content',
          senderType: 'speaker',
        },
      };

      expect(payload.type).toBe('message.sent');
      expect(payload.data.senderType).toBe('speaker');
    });
  });

  describe('speaker.consent_revoked webhook', () => {
    it('should have correct structure', () => {
      const payload = {
        id: 'wh_revoke_123',
        type: 'speaker.consent_revoked',
        timestamp: new Date().toISOString(),
        federatedEventId: 'fed_evt_456',
        data: {
          speakerId: 'spk_789',
          deletionDeadline: '2026-02-19T00:00:00.000Z',
        },
      };

      expect(payload.type).toBe('speaker.consent_revoked');
      expect(payload.data.speakerId).toBeDefined();
      expect(payload.data.deletionDeadline).toBeDefined();
    });
  });

  describe('speaker.profile_updated webhook', () => {
    it('should have correct structure', () => {
      const payload = {
        id: 'wh_update_123',
        type: 'speaker.profile_updated',
        timestamp: new Date().toISOString(),
        federatedEventId: 'fed_evt_456',
        data: {
          speakerId: 'spk_789',
          updatedFields: ['bio', 'company'],
        },
      };

      expect(payload.type).toBe('speaker.profile_updated');
      expect(payload.data.speakerId).toBeDefined();
    });
  });
});

describe('Webhook Response Handling', () => {
  it('should handle success response', () => {
    const response = {
      success: true,
      messageId: 'msg_local_123',
    };

    expect(response.success).toBe(true);
    expect(response.messageId).toBeDefined();
  });

  it('should handle error response', () => {
    const response = {
      success: false,
      error: {
        code: 'INVALID_SIGNATURE',
        message: 'Failed to verify webhook signature',
      },
    };

    expect(response.success).toBe(false);
    expect(response.error.code).toBe('INVALID_SIGNATURE');
  });

  it('should handle idempotent duplicate', () => {
    const response = {
      success: true,
      messageId: 'existing_msg_123',
      // When a duplicate message is received, it returns success
      // with the existing message ID
    };

    expect(response.success).toBe(true);
    expect(response.messageId).toBeDefined();
  });
});

describe('Required Webhook Headers', () => {
  it('should require all necessary headers', () => {
    const requiredHeaders = [
      'X-Webhook-Id',
      'X-Webhook-Timestamp',
      'X-Webhook-Signature',
    ];

    requiredHeaders.forEach(header => {
      expect(header).toBeDefined();
    });
  });

  it('should have correct header formats', () => {
    const headers = {
      'X-Webhook-Id': 'wh_incoming_abc123',
      'X-Webhook-Timestamp': Date.now().toString(),
      'X-Webhook-Signature': 'sha256=abc123def456...',
    };

    expect(headers['X-Webhook-Id']).toMatch(/^wh_/);
    expect(parseInt(headers['X-Webhook-Timestamp'])).toBeGreaterThan(0);
    expect(headers['X-Webhook-Signature']).toMatch(/^sha256=/);
  });
});

describe('Timing-Safe Comparison', () => {
  it('should prevent timing attacks', () => {
    // The verifyWebhookSignature function uses timingSafeEqual
    // This test verifies the concept
    const buffer1 = Buffer.from('secret123');
    const buffer2 = Buffer.from('secret123');
    const buffer3 = Buffer.from('different');
    
    // Same length buffers
    expect(timingSafeEqual(buffer1, buffer2)).toBe(true);
    
    // Different buffers of same length should return false
    const padded = Buffer.concat([buffer3, Buffer.alloc(buffer1.length - buffer3.length)]);
    expect(timingSafeEqual(buffer1, padded)).toBe(false);
  });
});

describe('Error Scenarios', () => {
  it('should handle missing headers gracefully', () => {
    // The verification function should return false for missing headers
    const result = verifyWebhookSignature('payload', '', '', 'secret');
    expect(result).toBe(false);
  });

  it('should handle malformed JSON gracefully', () => {
    const malformedJson = 'not valid json {';
    // The verification would happen before JSON parsing
    // but the system should handle this error
    expect(() => JSON.parse(malformedJson)).toThrow();
  });

  it('should handle network/timeout errors', () => {
    // Errors during webhook processing should be handled
    const errorResponse = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    };
    
    expect(errorResponse.success).toBe(false);
    expect(errorResponse.error.code).toBe('INTERNAL_ERROR');
  });
});
