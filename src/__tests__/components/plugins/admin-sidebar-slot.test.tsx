/**
 * AdminSidebarSlot Component Tests
 *
 * @vitest-environment happy-dom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// Mock plugin events
vi.mock('@/lib/plugins/events', () => ({
  onPluginChange: vi.fn(() => vi.fn()), // Returns unsubscribe function
  emitPluginChange: vi.fn(),
}));

import { usePathname } from 'next/navigation';
import { AdminSidebarSlot } from '@/components/plugins/admin-sidebar-slot';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('AdminSidebarSlot', () => {
  beforeEach(() => {
    vi.mocked(usePathname).mockReturnValue('/admin/plugins');
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render nothing when API returns empty items', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [] }),
    });

    const { container } = render(<AdminSidebarSlot />);

    await waitFor(() => {
      expect(container.innerHTML).toBe('');
    });
  });

  it('should render nothing when API returns no items', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    const { container } = render(<AdminSidebarSlot />);

    await waitFor(() => {
      expect(container.innerHTML).toBe('');
    });
  });

  it('should render nothing on API error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { container } = render(<AdminSidebarSlot />);

    await waitFor(() => {
      expect(container.innerHTML).toBe('');
    });
  });

  it('should render plugin sidebar items from API', async () => {
    vi.mocked(usePathname).mockReturnValue('/admin/plugins');

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [
          {
            pluginName: 'ai-paper-reviewer',
            pluginId: 'plugin-123',
            sections: [
              {
                title: 'AI Reviews',
                icon: 'Bot',
                items: [
                  { key: 'history', label: 'Review History', path: '/history', icon: 'History' },
                  { key: 'personas', label: 'Reviewer Personas', path: '/personas', icon: 'Sparkles' },
                ],
              },
            ],
          },
        ],
      }),
    });

    render(<AdminSidebarSlot />);

    await waitFor(() => {
      expect(screen.getByText('AI Reviews')).toBeInTheDocument();
    });

    expect(screen.getByText('Review History')).toBeInTheDocument();
    expect(screen.getByText('Reviewer Personas')).toBeInTheDocument();
  });

  it('should build correct hrefs for sidebar items', async () => {
    vi.mocked(usePathname).mockReturnValue('/admin/plugins');

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [
          {
            pluginName: 'ai-paper-reviewer',
            pluginId: 'plugin-123',
            sections: [
              {
                title: 'AI Reviews',
                items: [
                  { key: 'history', label: 'Review History', path: '/history' },
                ],
              },
            ],
          },
        ],
      }),
    });

    render(<AdminSidebarSlot />);

    await waitFor(() => {
      expect(screen.getByText('Review History')).toBeInTheDocument();
    });

    const link = screen.getByRole('link', { name: /Review History/i });
    expect(link).toHaveAttribute('href', '/admin/plugins/pages/ai-paper-reviewer/history');
  });

  it('should highlight active link based on pathname', async () => {
    vi.mocked(usePathname).mockReturnValue('/admin/plugins/pages/ai-paper-reviewer/history');

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [
          {
            pluginName: 'ai-paper-reviewer',
            pluginId: 'plugin-123',
            sections: [
              {
                title: 'AI Reviews',
                items: [
                  { key: 'history', label: 'Review History', path: '/history' },
                  { key: 'personas', label: 'Reviewer Personas', path: '/personas' },
                ],
              },
            ],
          },
        ],
      }),
    });

    render(<AdminSidebarSlot />);

    await waitFor(() => {
      expect(screen.getByText('Review History')).toBeInTheDocument();
    });

    const activeLink = screen.getByRole('link', { name: /Review History/i });
    const inactiveLink = screen.getByRole('link', { name: /Reviewer Personas/i });

    // Active link should have purple background class
    expect(activeLink.className).toContain('bg-purple-100');
    expect(inactiveLink.className).not.toContain('bg-purple-100');
  });

  it('should render multiple plugin sections', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [
          {
            pluginName: 'plugin-a',
            pluginId: 'id-a',
            sections: [
              {
                title: 'Section A',
                items: [{ key: 'item-a', label: 'Item A', path: '/a' }],
              },
            ],
          },
          {
            pluginName: 'plugin-b',
            pluginId: 'id-b',
            sections: [
              {
                title: 'Section B',
                items: [{ key: 'item-b', label: 'Item B', path: '/b' }],
              },
            ],
          },
        ],
      }),
    });

    render(<AdminSidebarSlot />);

    await waitFor(() => {
      expect(screen.getByText('Section A')).toBeInTheDocument();
    });

    expect(screen.getByText('Section B')).toBeInTheDocument();
    expect(screen.getByText('Item A')).toBeInTheDocument();
    expect(screen.getByText('Item B')).toBeInTheDocument();
  });

  it('should set data-plugin-slot attribute on container', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [
          {
            pluginName: 'test-plugin',
            pluginId: 'id',
            sections: [{ title: 'Test', items: [{ key: 'test', label: 'Test', path: '/test' }] }],
          },
        ],
      }),
    });

    const { container } = render(<AdminSidebarSlot />);

    await waitFor(() => {
      const slotContainer = container.firstChild as HTMLElement;
      expect(slotContainer.getAttribute('data-plugin-slot')).toBe('admin.sidebar.items');
    });
  });
});
