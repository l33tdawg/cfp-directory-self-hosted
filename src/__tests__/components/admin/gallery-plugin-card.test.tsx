/**
 * Gallery Plugin Card Component Tests
 *
 * @vitest-environment happy-dom
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock radix-ui tooltip
vi.mock('@radix-ui/react-tooltip', () => ({
  Provider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Root: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Trigger: ({ children }: any) => <>{children}</>,
  Content: ({ children }: { children: React.ReactNode }) => <div role="tooltip">{children}</div>,
  Portal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import { GalleryPluginCard } from '@/components/admin/gallery-plugin-card';
import type { GalleryPluginWithStatus } from '@/lib/plugins/gallery';

const basePlugin: GalleryPluginWithStatus = {
  name: 'ai-paper-reviewer',
  displayName: 'AI Paper Reviewer',
  version: '1.2.0',
  apiVersion: '1.0',
  description: 'Intelligent submission analysis',
  author: 'CFP Directory',
  homepage: 'https://example.com',
  permissions: ['submissions:read', 'reviews:write'],
  hooks: ['submission.created'],
  downloadUrl: 'https://example.com/download',
  installStatus: 'not_installed',
};

describe('GalleryPluginCard', () => {
  const defaultProps = {
    plugin: basePlugin,
    isInstalling: false,
    onInstall: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders plugin display name', () => {
    render(<GalleryPluginCard {...defaultProps} />);
    expect(screen.getByText('AI Paper Reviewer')).toBeInTheDocument();
  });

  it('renders plugin version', () => {
    render(<GalleryPluginCard {...defaultProps} />);
    expect(screen.getByText('ai-paper-reviewer v1.2.0')).toBeInTheDocument();
  });

  it('renders description', () => {
    render(<GalleryPluginCard {...defaultProps} />);
    expect(screen.getByText('Intelligent submission analysis')).toBeInTheDocument();
  });

  it('renders plugin icon with initials', () => {
    render(<GalleryPluginCard {...defaultProps} />);
    expect(screen.getByText('AP')).toBeInTheDocument();
  });

  // --- Accent strip colors ---

  it('renders blue accent for not_installed plugin', () => {
    const { container } = render(<GalleryPluginCard {...defaultProps} />);
    expect(container.querySelector('.from-blue-400')).toBeTruthy();
  });

  it('renders green accent for installed plugin', () => {
    const installedPlugin = { ...basePlugin, installStatus: 'installed' as const };
    const { container } = render(
      <GalleryPluginCard {...defaultProps} plugin={installedPlugin} />
    );
    expect(container.querySelector('.from-green-400')).toBeTruthy();
  });

  it('renders amber accent for update_available plugin', () => {
    const updatePlugin = {
      ...basePlugin,
      installStatus: 'update_available' as const,
      installedVersion: '1.1.0',
    };
    const { container } = render(
      <GalleryPluginCard {...defaultProps} plugin={updatePlugin} />
    );
    expect(container.querySelector('.from-amber-400')).toBeTruthy();
  });

  // --- Icon colors ---

  it('renders blue icon for not_installed', () => {
    const { container } = render(<GalleryPluginCard {...defaultProps} />);
    const icon = container.querySelector('.bg-blue-100');
    expect(icon).toBeTruthy();
  });

  it('renders green icon for installed', () => {
    const installed = { ...basePlugin, installStatus: 'installed' as const };
    const { container } = render(
      <GalleryPluginCard {...defaultProps} plugin={installed} />
    );
    expect(container.querySelector('.bg-green-100')).toBeTruthy();
  });

  it('renders amber icon for update_available', () => {
    const update = {
      ...basePlugin,
      installStatus: 'update_available' as const,
      installedVersion: '1.0.0',
    };
    const { container } = render(
      <GalleryPluginCard {...defaultProps} plugin={update} />
    );
    expect(container.querySelector('.bg-amber-100')).toBeTruthy();
  });

  // --- Install button states ---

  it('shows Install button for not_installed plugin', () => {
    render(<GalleryPluginCard {...defaultProps} />);
    expect(screen.getByText('Install')).toBeInTheDocument();
  });

  it('shows Update button for update_available plugin', () => {
    const updatePlugin = {
      ...basePlugin,
      installStatus: 'update_available' as const,
      installedVersion: '1.0.0',
    };
    render(<GalleryPluginCard {...defaultProps} plugin={updatePlugin} />);
    expect(screen.getByText('Update')).toBeInTheDocument();
  });

  it('shows Installed badge for installed plugin', () => {
    const installedPlugin = { ...basePlugin, installStatus: 'installed' as const };
    render(<GalleryPluginCard {...defaultProps} plugin={installedPlugin} />);
    expect(screen.getByText('Installed')).toBeInTheDocument();
  });

  it('shows Installing... when isInstalling is true', () => {
    render(<GalleryPluginCard {...defaultProps} isInstalling={true} />);
    expect(screen.getByText('Installing...')).toBeInTheDocument();
  });

  // --- Version upgrade path ---

  it('shows version upgrade path for update_available', () => {
    const updatePlugin = {
      ...basePlugin,
      installStatus: 'update_available' as const,
      installedVersion: '1.1.0',
    };
    render(<GalleryPluginCard {...defaultProps} plugin={updatePlugin} />);
    // Should show "v1.1.0 → v1.2.0"
    const upgradeText = screen.getByText((content) =>
      content.includes('v1.1.0') && content.includes('v1.2.0')
    );
    expect(upgradeText).toBeInTheDocument();
  });

  it('does not show version upgrade path for installed plugin', () => {
    const installedPlugin = { ...basePlugin, installStatus: 'installed' as const };
    render(<GalleryPluginCard {...defaultProps} plugin={installedPlugin} />);
    expect(screen.queryByText(/→/)).not.toBeInTheDocument();
  });

  // --- Metadata ---

  it('renders API version badge', () => {
    render(<GalleryPluginCard {...defaultProps} />);
    expect(screen.getByText('API v1.0')).toBeInTheDocument();
  });

  it('renders author badge', () => {
    render(<GalleryPluginCard {...defaultProps} />);
    expect(screen.getByText('CFP Directory')).toBeInTheDocument();
  });

  it('renders category badge when present', () => {
    const withCategory = { ...basePlugin, category: 'AI' };
    render(<GalleryPluginCard {...defaultProps} plugin={withCategory} />);
    expect(screen.getByText('AI')).toBeInTheDocument();
  });

  // --- Stats tooltips ---

  it('renders permission count with tooltip', () => {
    render(<GalleryPluginCard {...defaultProps} />);
    expect(screen.getByText('2 permissions')).toBeInTheDocument();
  });

  it('renders hook count with tooltip', () => {
    render(<GalleryPluginCard {...defaultProps} />);
    expect(screen.getByText('1 hook')).toBeInTheDocument();
  });

  it('renders docs tooltip for homepage', () => {
    render(<GalleryPluginCard {...defaultProps} />);
    expect(screen.getByText('Documentation')).toBeInTheDocument();
  });

  // --- Card structure ---

  it('renders rounded-xl card', () => {
    const { container } = render(<GalleryPluginCard {...defaultProps} />);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('rounded-xl');
  });

  it('renders overflow-hidden for accent strip', () => {
    const { container } = render(<GalleryPluginCard {...defaultProps} />);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('overflow-hidden');
  });

  it('renders hover:shadow-lg for premium hover effect', () => {
    const { container } = render(<GalleryPluginCard {...defaultProps} />);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('hover:shadow-lg');
  });
});
