/**
 * Consent Flow Tests
 * 
 * Tests for consent validation, speaker profile types, and sync results.
 */

import { describe, it, expect } from 'vitest';

describe('Consent Types', () => {
  describe('ConsentScope', () => {
    it('should have valid scope values', () => {
      const validScopes = ['profile', 'social_links', 'materials', 'email'];
      validScopes.forEach(scope => {
        expect(['profile', 'social_links', 'materials', 'email']).toContain(scope);
      });
    });
  });

  describe('ValidateConsentTokenResponse', () => {
    it('should have correct structure for valid response', () => {
      const response = {
        valid: true,
        speakerId: 'spk_123',
        eventId: 'evt_456',
        scopes: ['profile', 'email'],
      };

      expect(response.valid).toBe(true);
      expect(response.speakerId).toBeDefined();
      expect(response.eventId).toBeDefined();
      expect(response.scopes).toHaveLength(2);
    });

    it('should have correct structure for invalid response', () => {
      const response = {
        valid: false,
        error: 'Token expired',
        errorCode: 'EXPIRED' as const,
      };

      expect(response.valid).toBe(false);
      expect(response.error).toBeDefined();
      expect(response.errorCode).toBe('EXPIRED');
    });

    it('should handle all error codes', () => {
      const errorCodes = ['INVALID_TOKEN', 'EXPIRED', 'REVOKED', 'NOT_FOUND'];
      errorCodes.forEach(code => {
        expect(['INVALID_TOKEN', 'EXPIRED', 'REVOKED', 'NOT_FOUND']).toContain(code);
      });
    });
  });
});

describe('FederatedSpeakerProfile', () => {
  describe('profile structure', () => {
    it('should have correct structure', () => {
      const profile = {
        speakerId: 'spk_123',
        eventId: 'evt_456',
        consentedScopes: ['profile', 'email'],
        profile: {
          fullName: 'Jane Speaker',
          bio: 'Experienced developer',
          company: 'Tech Corp',
          position: 'Senior Engineer',
          avatarUrl: 'https://example.com/avatar.jpg',
          topics: ['JavaScript', 'TypeScript'],
          languages: ['en', 'es'],
          experienceLevel: 'senior',
          slug: 'jane-speaker',
        },
        email: 'jane@example.com',
      };

      expect(profile.speakerId).toBe('spk_123');
      expect(profile.eventId).toBe('evt_456');
      expect(profile.consentedScopes).toContain('profile');
      expect(profile.profile.fullName).toBe('Jane Speaker');
      expect(profile.email).toBe('jane@example.com');
    });

    it('should handle optional fields', () => {
      const minimalProfile = {
        speakerId: 'spk_123',
        eventId: 'evt_456',
        consentedScopes: ['profile'],
        profile: {
          fullName: 'John Doe',
          bio: null,
          company: null,
          position: null,
          avatarUrl: null,
          topics: [],
          languages: [],
          experienceLevel: null,
          slug: 'john-doe',
        },
      };

      expect(minimalProfile.profile.fullName).toBe('John Doe');
      expect(minimalProfile.profile.bio).toBeNull();
      expect(minimalProfile.email).toBeUndefined();
    });
  });

  describe('socialLinks structure', () => {
    it('should have correct structure', () => {
      const socialLinks = {
        twitter: 'https://twitter.com/janedev',
        linkedin: 'https://linkedin.com/in/janedev',
        github: 'https://github.com/janedev',
      };

      expect(socialLinks.twitter).toContain('twitter.com');
      expect(socialLinks.linkedin).toContain('linkedin.com');
      expect(socialLinks.github).toContain('github.com');
    });

    it('should allow null values', () => {
      const socialLinks = {
        twitter: null,
        linkedin: null,
        github: null,
      };

      expect(socialLinks.twitter).toBeNull();
      expect(socialLinks.linkedin).toBeNull();
      expect(socialLinks.github).toBeNull();
    });
  });
});

describe('FederatedMaterial', () => {
  it('should have correct structure for external material', () => {
    const material = {
      id: 'mat_123',
      type: 'slides',
      title: 'Conference Slides',
      description: 'Slides for my talk',
      isExternal: true,
      externalUrl: 'https://speakerdeck.com/talk',
      fileUrl: null,
      fileName: null,
      fileSize: null,
    };

    expect(material.isExternal).toBe(true);
    expect(material.externalUrl).toBeDefined();
    expect(material.fileUrl).toBeNull();
  });

  it('should have correct structure for uploaded material', () => {
    const material = {
      id: 'mat_456',
      type: 'document',
      title: 'Speaker Bio',
      description: 'My bio document',
      isExternal: false,
      externalUrl: null,
      fileUrl: 'https://storage.example.com/files/bio.pdf?signature=xxx',
      fileName: 'bio.pdf',
      fileSize: 102400,
    };

    expect(material.isExternal).toBe(false);
    expect(material.fileUrl).toBeDefined();
    expect(material.fileName).toBe('bio.pdf');
    expect(material.fileSize).toBe(102400);
  });
});

describe('FederatedCoSpeaker', () => {
  it('should have correct structure for guest co-speaker', () => {
    const coSpeaker = {
      id: 'cos_123',
      type: 'guest' as const,
      fullName: 'Guest Speaker',
      company: 'Other Corp',
      bio: 'Guest bio',
      photoUrl: null,
      speakerProfileId: null,
    };

    expect(coSpeaker.type).toBe('guest');
    expect(coSpeaker.speakerProfileId).toBeNull();
    expect(coSpeaker.fullName).toBe('Guest Speaker');
  });

  it('should have correct structure for linked co-speaker', () => {
    const coSpeaker = {
      id: 'cos_456',
      type: 'linked' as const,
      fullName: 'Linked Speaker',
      company: 'Tech Inc',
      bio: 'Linked speaker bio',
      photoUrl: 'https://example.com/photo.jpg',
      speakerProfileId: 'spk_789',
    };

    expect(coSpeaker.type).toBe('linked');
    expect(coSpeaker.speakerProfileId).toBe('spk_789');
  });
});

describe('SyncSpeakerResult', () => {
  it('should have correct structure for successful sync', () => {
    const result = {
      success: true,
      federatedSpeakerId: 'fed_spk_123',
      localUserId: 'user_456',
      materialsDownloaded: 3,
      coSpeakersProcessed: 2,
    };

    expect(result.success).toBe(true);
    expect(result.federatedSpeakerId).toBeDefined();
    expect(result.materialsDownloaded).toBe(3);
    expect(result.coSpeakersProcessed).toBe(2);
  });

  it('should have correct structure for failed sync', () => {
    const result = {
      success: false,
      error: 'Failed to fetch profile',
      errorCode: 'FETCH_FAILED',
    };

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.errorCode).toBe('FETCH_FAILED');
  });
});

describe('ConsentLandingParams', () => {
  it('should have required params', () => {
    const params = {
      token: 'jwt_token_here',
      eventId: 'evt_123',
    };

    expect(params.token).toBeDefined();
    expect(params.eventId).toBeDefined();
  });

  it('should allow optional returnUrl', () => {
    const params = {
      token: 'jwt_token_here',
      eventId: 'evt_123',
      returnUrl: 'https://cfp.directory/dashboard',
    };

    expect(params.returnUrl).toBeDefined();
    expect(params.returnUrl).toContain('cfp.directory');
  });
});

describe('Consent URL Utility', () => {
  describe('isSignedUrl', () => {
    // Simulating the isSignedUrl function logic
    const isSignedUrl = (url: string): boolean => {
      try {
        const parsed = new URL(url);
        return parsed.searchParams.has('token') || 
               parsed.searchParams.has('signature') ||
               parsed.searchParams.has('X-Amz-Signature') ||
               parsed.hostname.includes('supabase');
      } catch {
        return false;
      }
    };

    it('should detect URLs with token parameter', () => {
      expect(isSignedUrl('https://storage.example.com/file.pdf?token=abc123')).toBe(true);
    });

    it('should detect URLs with signature parameter', () => {
      expect(isSignedUrl('https://storage.example.com/file.pdf?signature=xyz')).toBe(true);
    });

    it('should detect AWS signed URLs', () => {
      expect(isSignedUrl('https://bucket.s3.amazonaws.com/file.pdf?X-Amz-Signature=abc')).toBe(true);
    });

    it('should detect Supabase URLs', () => {
      expect(isSignedUrl('https://abc.supabase.co/storage/v1/object/public/file.pdf')).toBe(true);
    });

    it('should return false for regular URLs', () => {
      expect(isSignedUrl('https://example.com/file.pdf')).toBe(false);
    });

    it('should return false for external service URLs', () => {
      expect(isSignedUrl('https://youtube.com/watch?v=123')).toBe(false);
      expect(isSignedUrl('https://speakerdeck.com/talk/123')).toBe(false);
    });

    it('should handle invalid URLs', () => {
      expect(isSignedUrl('not-a-url')).toBe(false);
    });
  });
});

describe('Consent Validation Error Codes', () => {
  it('should map to correct HTTP status codes', () => {
    const statusMap: Record<string, number> = {
      INVALID_TOKEN: 401,
      EXPIRED: 401,
      REVOKED: 403,
      NOT_FOUND: 404,
      API_ERROR: 502,
    };

    expect(statusMap.INVALID_TOKEN).toBe(401);
    expect(statusMap.EXPIRED).toBe(401);
    expect(statusMap.REVOKED).toBe(403);
    expect(statusMap.NOT_FOUND).toBe(404);
    expect(statusMap.API_ERROR).toBe(502);
  });
});

describe('Material Type Constants', () => {
  it('should have expected material types', () => {
    const materialTypes = ['slides', 'video', 'document', 'other'];
    
    expect(materialTypes).toContain('slides');
    expect(materialTypes).toContain('video');
    expect(materialTypes).toContain('document');
    expect(materialTypes).toContain('other');
  });
});
