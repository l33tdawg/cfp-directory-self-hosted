/**
 * Messages Inbox Client Component Tests
 *
 * Tests for the Gmail-style inbox with role-aware behavior.
 *
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { MessagesInboxClient } from '@/app/(dashboard)/messages/messages-inbox-client';

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

describe('MessagesInboxClient', () => {
  const mockMessages = [
    {
      id: 'msg-root-1',
      body: 'We have a question about your talk proposal.',
      subject: 'Regarding your submission',
      senderType: 'ORGANIZER',
      senderId: 'org-123',
      isRead: false,
      readAt: null,
      parentId: null,
      federatedMessageId: null,
      createdAt: '2025-01-01T00:00:00Z',
      senderName: 'Admin User',
      senderImage: null,
      submission: {
        id: 'sub-1',
        title: 'Building APIs',
        status: 'UNDER_REVIEW',
        isFederated: false,
        speakerName: 'John Speaker',
        speakerImage: null,
      },
      event: {
        id: 'event-1',
        name: 'Tech Conf 2025',
        slug: 'tech-conf-2025',
      },
    },
    {
      id: 'msg-reply-1',
      body: 'Thank you for the question!',
      subject: null,
      senderType: 'SPEAKER',
      senderId: 'speaker-123',
      isRead: true,
      readAt: '2025-01-02T00:00:00Z',
      parentId: 'msg-root-1',
      federatedMessageId: null,
      createdAt: '2025-01-02T00:00:00Z',
      senderName: 'John Speaker',
      senderImage: null,
      submission: {
        id: 'sub-1',
        title: 'Building APIs',
        status: 'UNDER_REVIEW',
        isFederated: false,
        speakerName: 'John Speaker',
        speakerImage: null,
      },
      event: {
        id: 'event-1',
        name: 'Tech Conf 2025',
        slug: 'tech-conf-2025',
      },
    },
  ];

  const createFetchResponse = (data: unknown) => ({
    ok: true,
    json: () => Promise.resolve({ data }),
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // Loading State
  // =========================================================================

  describe('Loading State', () => {
    it('should show loading spinner initially', () => {
      global.fetch = vi.fn().mockReturnValue(new Promise(() => {})); // Never resolves
      render(<MessagesInboxClient />);
      expect(screen.getByText('Loading messages...')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Organizer/Admin View
  // =========================================================================

  describe('Organizer/Admin View', () => {
    it('should render messages for organizer', async () => {
      // Add an unread speaker message (not from the current user)
      const unreadSpeakerMsg = {
        ...mockMessages[1], // speaker message
        isRead: false,
        readAt: null,
        parentId: null,
      };

      global.fetch = vi.fn().mockResolvedValue(
        createFetchResponse({
          messages: [mockMessages[0], unreadSpeakerMsg],
          role: 'ORGANIZER',
          userId: 'org-123',
        })
      );

      render(<MessagesInboxClient />);

      await waitFor(() => {
        expect(screen.getByText('Messages')).toBeInTheDocument();
      });

      // Should show subtitle for organizer
      expect(screen.getByText('All submission messages across events')).toBeInTheDocument();

      // Speaker message is unread (senderId: speaker-123 !== userId: org-123)
      expect(screen.getByText('1 unread')).toBeInTheDocument();
    });

    it('should show speaker name in compact row for organizer', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        createFetchResponse({
          messages: [mockMessages[0]],
          role: 'ORGANIZER',
          userId: 'org-123',
        })
      );

      render(<MessagesInboxClient />);

      await waitFor(() => {
        // Organizer sees speaker name in compact row
        expect(screen.getByText('John Speaker')).toBeInTheDocument();
      });
    });
  });

  // =========================================================================
  // Speaker View
  // =========================================================================

  describe('Speaker View', () => {
    it('should show speaker-specific subtitle', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        createFetchResponse({
          messages: mockMessages,
          role: 'USER',
          userId: 'speaker-123',
        })
      );

      render(<MessagesInboxClient />);

      await waitFor(() => {
        expect(screen.getByText('Messages about your submissions')).toBeInTheDocument();
      });
    });

    it('should show event name in compact row for speaker', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        createFetchResponse({
          messages: [mockMessages[0]],
          role: 'USER',
          userId: 'speaker-123',
        })
      );

      render(<MessagesInboxClient />);

      await waitFor(() => {
        // Speaker sees event name in compact row (also appears in expanded context)
        const eventNames = screen.getAllByText('Tech Conf 2025');
        expect(eventNames.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('should detect unread messages from organizers for speaker', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        createFetchResponse({
          messages: [mockMessages[0]], // Organizer message, unread
          role: 'USER',
          userId: 'speaker-123',
        })
      );

      render(<MessagesInboxClient />);

      await waitFor(() => {
        // Message from org-123, userId is speaker-123, so it's unread
        expect(screen.getByText('1 unread')).toBeInTheDocument();
      });
    });

    it('should not count own messages as unread for speaker', async () => {
      const ownMessage = {
        ...mockMessages[1], // speaker message
        isRead: false,
        readAt: null,
        parentId: null,
      };

      global.fetch = vi.fn().mockResolvedValue(
        createFetchResponse({
          messages: [ownMessage],
          role: 'USER',
          userId: 'speaker-123',
        })
      );

      render(<MessagesInboxClient />);

      await waitFor(() => {
        expect(screen.getByText('Messages')).toBeInTheDocument();
      });

      // Own message not counted as unread — no badge
      expect(screen.queryByText(/unread/)).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // Empty States
  // =========================================================================

  describe('Empty States', () => {
    it('should show empty state for organizer', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        createFetchResponse({
          messages: [],
          role: 'ORGANIZER',
          userId: 'org-123',
        })
      );

      render(<MessagesInboxClient />);

      await waitFor(() => {
        expect(screen.getByText('No messages yet')).toBeInTheDocument();
        expect(
          screen.getByText('Messages from speakers about submissions will appear here.')
        ).toBeInTheDocument();
      });
    });

    it('should show empty state for speaker', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        createFetchResponse({
          messages: [],
          role: 'USER',
          userId: 'speaker-123',
        })
      );

      render(<MessagesInboxClient />);

      await waitFor(() => {
        expect(screen.getByText('No messages yet')).toBeInTheDocument();
        expect(
          screen.getByText('Messages from organizers and reviewers about your submissions will appear here.')
        ).toBeInTheDocument();
      });
    });
  });

  // =========================================================================
  // Thread Building
  // =========================================================================

  describe('Thread Building', () => {
    it('should group replies under parent thread', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        createFetchResponse({
          messages: mockMessages,
          role: 'ORGANIZER',
          userId: 'org-123',
        })
      );

      render(<MessagesInboxClient />);

      await waitFor(() => {
        // Should show thread with reply count
        expect(screen.getByText('1')).toBeInTheDocument(); // Reply count
      });
    });
  });

  // =========================================================================
  // Filters
  // =========================================================================

  describe('Filters', () => {
    it('should show filter buttons', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        createFetchResponse({
          messages: mockMessages,
          role: 'ORGANIZER',
          userId: 'org-123',
        })
      );

      render(<MessagesInboxClient />);

      await waitFor(() => {
        expect(screen.getByText('All')).toBeInTheDocument();
        expect(screen.getByText(/Unread/)).toBeInTheDocument();
        expect(screen.getByText('Federated')).toBeInTheDocument();
      });
    });

    it('should filter to show only federated threads', async () => {
      const federatedMessage = {
        ...mockMessages[0],
        id: 'msg-fed-1',
        submission: {
          ...mockMessages[0].submission,
          isFederated: true,
        },
      };

      global.fetch = vi.fn().mockResolvedValue(
        createFetchResponse({
          messages: [mockMessages[0], federatedMessage],
          role: 'ORGANIZER',
          userId: 'org-123',
        })
      );

      render(<MessagesInboxClient />);

      await waitFor(() => {
        expect(screen.getByText('All')).toBeInTheDocument();
      });

      const user = userEvent.setup();
      await user.click(screen.getByText('Federated'));

      // After filtering, only federated thread should remain
      // The federated badge should be visible
      await waitFor(() => {
        expect(screen.getByText('Fed')).toBeInTheDocument();
      });
    });
  });

  // =========================================================================
  // Error Handling
  // =========================================================================

  describe('Error Handling', () => {
    it('should show error toast on fetch failure', async () => {
      const { toast } = await import('sonner');
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Internal Server Error' }),
      });

      render(<MessagesInboxClient />);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to load messages');
      });
    });
  });

  // =========================================================================
  // Reply Functionality
  // =========================================================================

  describe('Reply', () => {
    it('should render reply button in the DOM', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        createFetchResponse({
          messages: [mockMessages[0]],
          role: 'ORGANIZER',
          userId: 'org-123',
        })
      );

      render(<MessagesInboxClient />);

      await waitFor(() => {
        // The "Reply to Thread" button is in the expanded details section
        expect(screen.getByText('Reply to Thread')).toBeInTheDocument();
      });
    });
  });

  // =========================================================================
  // Sender Labels
  // =========================================================================

  describe('Sender Labels', () => {
    it('should show "You" label for own messages', async () => {
      // Organizer viewing own message (senderId matches userId)
      global.fetch = vi.fn().mockResolvedValue(
        createFetchResponse({
          messages: [mockMessages[0]],
          role: 'ORGANIZER',
          userId: 'org-123', // Same as senderId of msg
        })
      );

      render(<MessagesInboxClient />);

      await waitFor(() => {
        // "You" label appears in the expanded message section
        expect(screen.getByText('You')).toBeInTheDocument();
      });
    });

    it('should show sender name for other users messages', async () => {
      // Speaker viewing organizer's message
      global.fetch = vi.fn().mockResolvedValue(
        createFetchResponse({
          messages: [mockMessages[0]],
          role: 'USER',
          userId: 'speaker-123',
        })
      );

      render(<MessagesInboxClient />);

      await waitFor(() => {
        expect(screen.getByText('Admin User')).toBeInTheDocument();
      });
    });
  });
});
