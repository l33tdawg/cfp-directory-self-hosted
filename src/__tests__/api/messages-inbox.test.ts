/**
 * Messages Inbox API Tests
 *
 * Tests for GET /api/messages/inbox (role-aware) and PATCH /api/messages/inbox (mark read)
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock auth
vi.mock('@/lib/api/auth', () => ({
  getAuthenticatedUser: vi.fn(),
  isOrganizer: vi.fn(),
  isReviewerRole: vi.fn(),
}));

// Mock Prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    message: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    reviewTeamMember: {
      findMany: vi.fn(),
    },
    federatedSpeaker: {
      findMany: vi.fn(),
    },
  },
}));

import { getAuthenticatedUser, isOrganizer, isReviewerRole } from '@/lib/api/auth';
import { prisma } from '@/lib/db/prisma';
import { GET, PATCH } from '@/app/api/messages/inbox/route';

describe('Messages Inbox API', () => {
  const mockAdminUser = {
    id: 'admin-123',
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'ADMIN',
  };

  const mockOrganizerUser = {
    id: 'org-123',
    email: 'organizer@example.com',
    name: 'Organizer User',
    role: 'ORGANIZER',
  };

  const mockReviewerUser = {
    id: 'reviewer-123',
    email: 'reviewer@example.com',
    name: 'Reviewer User',
    role: 'REVIEWER',
  };

  const mockSpeakerUser = {
    id: 'speaker-123',
    email: 'speaker@example.com',
    name: 'Speaker User',
    role: 'USER',
  };

  const mockMessage = {
    id: 'msg-123',
    body: 'Hello, we have a question about your talk.',
    subject: 'Regarding your submission',
    senderType: 'ORGANIZER',
    senderId: 'org-123',
    isRead: false,
    readAt: null,
    parentId: null,
    federatedMessageId: null,
    createdAt: new Date('2025-01-01'),
    sender: {
      id: 'org-123',
      name: 'Organizer User',
      email: 'organizer@example.com',
      image: null,
    },
    submission: {
      id: 'sub-123',
      title: 'Building Scalable APIs',
      status: 'UNDER_REVIEW',
      isFederated: false,
      federatedSpeakerId: null,
      speakerId: 'speaker-123',
      event: {
        id: 'event-123',
        name: 'Tech Conference 2025',
        slug: 'tech-conf-2025',
      },
      speaker: {
        id: 'speaker-123',
        name: 'Speaker User',
        email: 'speaker@example.com',
        image: null,
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // GET /api/messages/inbox
  // =========================================================================

  describe('GET /api/messages/inbox', () => {
    describe('Authentication', () => {
      it('should return 401 when not authenticated', async () => {
        vi.mocked(getAuthenticatedUser).mockResolvedValue({
          user: null,
          error: 'Authentication required',
        });

        const response = await GET();
        expect(response.status).toBe(401);
      });
    });

    describe('Admin/Organizer Role', () => {
      it('should return all messages for admin', async () => {
        vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: mockAdminUser as any });
        vi.mocked(isOrganizer).mockReturnValue(true);
        vi.mocked(prisma.message.findMany).mockResolvedValue([mockMessage] as any);

        const response = await GET();
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.data.messages).toHaveLength(1);
        expect(data.data.role).toBe('ADMIN');
        expect(data.data.userId).toBe('admin-123');
        // Admin gets all messages — no where clause filter
        expect(prisma.message.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: {},
          })
        );
      });

      it('should return all messages for organizer', async () => {
        vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: mockOrganizerUser as any });
        vi.mocked(isOrganizer).mockReturnValue(true);
        vi.mocked(prisma.message.findMany).mockResolvedValue([mockMessage] as any);

        const response = await GET();
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.data.role).toBe('ORGANIZER');
        expect(prisma.message.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: {},
          })
        );
      });
    });

    describe('Reviewer Role', () => {
      it('should return event-scoped messages for reviewer', async () => {
        vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: mockReviewerUser as any });
        vi.mocked(isOrganizer).mockReturnValue(false);
        vi.mocked(isReviewerRole).mockReturnValue(true);
        vi.mocked(prisma.reviewTeamMember.findMany).mockResolvedValue([
          { eventId: 'event-123' } as any,
          { eventId: 'event-456' } as any,
        ]);
        vi.mocked(prisma.message.findMany).mockResolvedValue([mockMessage] as any);

        const response = await GET();
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.data.role).toBe('REVIEWER');
        expect(prisma.reviewTeamMember.findMany).toHaveBeenCalledWith({
          where: { userId: 'reviewer-123' },
          select: { eventId: true },
        });
        expect(prisma.message.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: {
              submission: { eventId: { in: ['event-123', 'event-456'] } },
            },
          })
        );
      });

      it('should return empty for reviewer with no team memberships', async () => {
        vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: mockReviewerUser as any });
        vi.mocked(isOrganizer).mockReturnValue(false);
        vi.mocked(isReviewerRole).mockReturnValue(true);
        vi.mocked(prisma.reviewTeamMember.findMany).mockResolvedValue([]);
        vi.mocked(prisma.message.findMany).mockResolvedValue([]);

        const response = await GET();
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.data.messages).toHaveLength(0);
        expect(prisma.message.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: {
              submission: { eventId: { in: [] } },
            },
          })
        );
      });
    });

    describe('Speaker/User Role', () => {
      it('should return only own submission messages for speaker', async () => {
        vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: mockSpeakerUser as any });
        vi.mocked(isOrganizer).mockReturnValue(false);
        vi.mocked(isReviewerRole).mockReturnValue(false);
        vi.mocked(prisma.message.findMany).mockResolvedValue([mockMessage] as any);

        const response = await GET();
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.data.role).toBe('USER');
        expect(data.data.userId).toBe('speaker-123');
        expect(prisma.message.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: {
              submission: { speakerId: 'speaker-123' },
            },
          })
        );
      });
    });

    describe('Message Formatting', () => {
      it('should format messages with submission and event context', async () => {
        vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: mockAdminUser as any });
        vi.mocked(isOrganizer).mockReturnValue(true);
        vi.mocked(prisma.message.findMany).mockResolvedValue([mockMessage] as any);

        const response = await GET();
        const data = await response.json();

        const msg = data.data.messages[0];
        expect(msg.id).toBe('msg-123');
        expect(msg.body).toBe('Hello, we have a question about your talk.');
        expect(msg.senderType).toBe('ORGANIZER');
        expect(msg.senderName).toBe('Organizer User');
        expect(msg.submission.id).toBe('sub-123');
        expect(msg.submission.title).toBe('Building Scalable APIs');
        expect(msg.submission.speakerName).toBe('Speaker User');
        expect(msg.event.name).toBe('Tech Conference 2025');
        expect(msg.event.slug).toBe('tech-conf-2025');
      });

      it('should handle federated submissions with federated speaker names', async () => {
        const federatedMessage = {
          ...mockMessage,
          submission: {
            ...mockMessage.submission,
            isFederated: true,
            federatedSpeakerId: 'fed-speaker-1',
            speaker: null,
          },
        };

        vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: mockAdminUser as any });
        vi.mocked(isOrganizer).mockReturnValue(true);
        vi.mocked(prisma.message.findMany).mockResolvedValue([federatedMessage] as any);
        vi.mocked(prisma.federatedSpeaker.findMany).mockResolvedValue([
          { id: 'fed-speaker-1', name: 'Fed Speaker', avatarUrl: 'https://example.com/avatar.jpg' },
        ] as any);

        const response = await GET();
        const data = await response.json();

        const msg = data.data.messages[0];
        expect(msg.submission.isFederated).toBe(true);
        expect(msg.submission.speakerName).toBe('Fed Speaker');
        expect(msg.submission.speakerImage).toBe('https://example.com/avatar.jpg');
      });

      it('should use fallback name for federated submissions without speaker data', async () => {
        const federatedMessage = {
          ...mockMessage,
          submission: {
            ...mockMessage.submission,
            isFederated: true,
            federatedSpeakerId: 'fed-speaker-unknown',
            speaker: null,
          },
        };

        vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: mockAdminUser as any });
        vi.mocked(isOrganizer).mockReturnValue(true);
        vi.mocked(prisma.message.findMany).mockResolvedValue([federatedMessage] as any);
        vi.mocked(prisma.federatedSpeaker.findMany).mockResolvedValue([]);

        const response = await GET();
        const data = await response.json();

        const msg = data.data.messages[0];
        expect(msg.submission.speakerName).toBe('Federated Speaker');
      });

      it('should use sender email as fallback when name is null', async () => {
        const noNameMessage = {
          ...mockMessage,
          sender: {
            ...mockMessage.sender,
            name: null,
          },
        };

        vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: mockAdminUser as any });
        vi.mocked(isOrganizer).mockReturnValue(true);
        vi.mocked(prisma.message.findMany).mockResolvedValue([noNameMessage] as any);

        const response = await GET();
        const data = await response.json();

        const msg = data.data.messages[0];
        expect(msg.senderName).toBe('organizer@example.com');
      });

      it('should return messages ordered by createdAt desc', async () => {
        vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: mockAdminUser as any });
        vi.mocked(isOrganizer).mockReturnValue(true);
        vi.mocked(prisma.message.findMany).mockResolvedValue([]);

        await GET();

        expect(prisma.message.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            orderBy: { createdAt: 'desc' },
          })
        );
      });
    });
  });

  // =========================================================================
  // PATCH /api/messages/inbox
  // =========================================================================

  describe('PATCH /api/messages/inbox', () => {
    const createPatchRequest = (body: unknown) =>
      new NextRequest('http://localhost:3000/api/messages/inbox', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

    it('should return 401 when not authenticated', async () => {
      vi.mocked(getAuthenticatedUser).mockResolvedValue({
        user: null,
        error: 'Authentication required',
      });

      const request = createPatchRequest({ messageIds: ['clxxxxxxxxxxxxxxxxx01'] });
      const response = await PATCH(request);
      expect(response.status).toBe(401);
    });

    it('should mark messages as read', async () => {
      vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: mockSpeakerUser as any });
      vi.mocked(prisma.message.updateMany).mockResolvedValue({ count: 2 } as any);

      const messageIds = ['clxxxxxxxxxxxxxxxxx01', 'clxxxxxxxxxxxxxxxxx02'];
      const request = createPatchRequest({ messageIds });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.success).toBe(true);
      expect(prisma.message.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: messageIds },
          isRead: false,
          NOT: { senderId: 'speaker-123' },
        },
        data: {
          isRead: true,
          readAt: expect.any(Date),
        },
      });
    });

    it('should not mark own messages as read', async () => {
      vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: mockOrganizerUser as any });
      vi.mocked(prisma.message.updateMany).mockResolvedValue({ count: 0 } as any);

      const request = createPatchRequest({ messageIds: ['clxxxxxxxxxxxxxxxxx01'] });
      await PATCH(request);

      expect(prisma.message.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            NOT: { senderId: 'org-123' },
          }),
        })
      );
    });

    it('should reject empty messageIds array', async () => {
      vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: mockSpeakerUser as any });

      const request = createPatchRequest({ messageIds: [] });
      const response = await PATCH(request);

      expect(response.status).toBe(400);
    });

    it('should reject invalid cuid format', async () => {
      vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: mockSpeakerUser as any });

      const request = createPatchRequest({ messageIds: ['not-a-valid-cuid'] });
      const response = await PATCH(request);

      expect(response.status).toBe(400);
    });

    it('should reject more than 100 messageIds', async () => {
      vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: mockSpeakerUser as any });

      const tooMany = Array.from({ length: 101 }, (_, i) => `clxxxxxxxxxxxxxxxxx${String(i).padStart(2, '0')}`);
      const request = createPatchRequest({ messageIds: tooMany });
      const response = await PATCH(request);

      expect(response.status).toBe(400);
    });
  });
});
