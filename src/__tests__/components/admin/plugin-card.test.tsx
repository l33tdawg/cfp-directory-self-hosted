/**
 * Plugin Card Component Tests
 *
 * @vitest-environment happy-dom
 */

/* eslint-disable @typescript-eslint/no-explicit-any, react/display-name */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import '@testing-library/jest-dom';

// Mock radix-ui tooltip to avoid portal issues in tests
vi.mock('@radix-ui/react-tooltip', () => ({
  Provider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Root: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Trigger: ({ children }: any) => <>{children}</>,
  Content: ({ children }: { children: React.ReactNode }) => <div role="tooltip">{children}</div>,
  Portal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import { PluginCard } from '@/components/admin/plugin-card';
import type { PluginData } from '@/components/admin/plugin-list';

const mockPlugin: PluginData = {
  id: 'plugin-1',
  name: 'ai-paper-reviewer',
  displayName: 'AI Paper Reviewer',
  description: 'Intelligent submission analysis',
  version: '1.2.0',
  apiVersion: '1.0',
  author: 'CFP Directory',
  homepage: 'https://example.com/docs',
  source: 'gallery',
  enabled: true,
  installed: true,
  permissions: ['submissions:read', 'reviews:write'],
  hooks: ['submission.created', 'submission.updated'],
  config: {},
  configSchema: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  _count: { logs: 42, jobs: 10 },
};

describe('PluginCard', () => {
  const defaultProps = {
    plugin: mockPlugin,
    isToggling: false,
    onToggleEnabled: vi.fn(),
    onUninstall: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders plugin display name and version', () => {
    render(<PluginCard {...defaultProps} />);
    expect(screen.getByText('AI Paper Reviewer')).toBeInTheDocument();
    expect(screen.getByText('ai-paper-reviewer v1.2.0')).toBeInTheDocument();
  });

  it('renders plugin description', () => {
    render(<PluginCard {...defaultProps} />);
    expect(screen.getByText('Intelligent submission analysis')).toBeInTheDocument();
  });

  it('shows enabled badge when plugin is enabled', () => {
    render(<PluginCard {...defaultProps} />);
    expect(screen.getByText('Enabled')).toBeInTheDocument();
  });

  it('shows disabled badge when plugin is disabled', () => {
    const disabledPlugin = { ...mockPlugin, enabled: false };
    render(<PluginCard {...defaultProps} plugin={disabledPlugin} />);
    expect(screen.getByText('Disabled')).toBeInTheDocument();
  });

  it('renders plugin icon with initials from displayName', () => {
    render(<PluginCard {...defaultProps} />);
    // "AI Paper Reviewer" => "AP" (first letters of first two words)
    expect(screen.getByText('AP')).toBeInTheDocument();
  });

  it('renders accent strip with green gradient for enabled plugin', () => {
    const { container } = render(<PluginCard {...defaultProps} />);
    const strip = container.querySelector('.from-green-400');
    expect(strip).toBeTruthy();
  });

  it('renders accent strip with slate gradient for disabled plugin', () => {
    const disabledPlugin = { ...mockPlugin, enabled: false };
    const { container } = render(<PluginCard {...defaultProps} plugin={disabledPlugin} />);
    const strip = container.querySelector('.from-slate-300');
    expect(strip).toBeTruthy();
  });

  it('renders rounded-xl card wrapper', () => {
    const { container } = render(<PluginCard {...defaultProps} />);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('rounded-xl');
  });

  it('renders overflow-hidden for accent strip', () => {
    const { container } = render(<PluginCard {...defaultProps} />);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('overflow-hidden');
  });

  it('renders stats with icon-only format', () => {
    render(<PluginCard {...defaultProps} />);
    // Stats should show numbers without labels (labels are in tooltips)
    // "2" appears for both permissions and hooks counts; check that both exist
    const twos = screen.getAllByText('2');
    expect(twos.length).toBeGreaterThanOrEqual(2); // permissions + hooks
    expect(screen.getByText('42')).toBeInTheDocument(); // logs count
  });

  it('renders tooltip content for stats', () => {
    render(<PluginCard {...defaultProps} />);
    // Tooltips should render their content
    expect(screen.getByText('2 permissions')).toBeInTheDocument();
    expect(screen.getByText('2 hooks')).toBeInTheDocument();
    expect(screen.getByText('42 logs')).toBeInTheDocument();
  });

  it('renders manage button linking to detail page', () => {
    render(<PluginCard {...defaultProps} />);
    const manageLink = screen.getByText('Manage').closest('a');
    expect(manageLink).toHaveAttribute('href', '/admin/plugins/plugin-1');
  });

  it('renders docs tooltip for homepage link', () => {
    render(<PluginCard {...defaultProps} />);
    expect(screen.getByText('Documentation')).toBeInTheDocument();
  });

  it('renders uninstall tooltip button', () => {
    render(<PluginCard {...defaultProps} />);
    expect(screen.getByText('Uninstall')).toBeInTheDocument();
  });

  it('does not render uninstall button when onUninstall is not provided', () => {
    render(<PluginCard {...defaultProps} onUninstall={undefined} />);
    expect(screen.queryByText('Uninstall')).not.toBeInTheDocument();
  });

  it('shows loading spinner when toggling', () => {
    render(<PluginCard {...defaultProps} isToggling={true} />);
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeTruthy();
  });

  it('renders Separator component between stats and actions', () => {
    const { container } = render(<PluginCard {...defaultProps} />);
    // Check for separator role or element
    const separator = container.querySelector('[data-orientation]');
    expect(separator).toBeTruthy();
  });

  it('renders API version badge', () => {
    render(<PluginCard {...defaultProps} />);
    expect(screen.getByText('API v1.0')).toBeInTheDocument();
  });

  it('renders author badge', () => {
    render(<PluginCard {...defaultProps} />);
    expect(screen.getByText('CFP Directory')).toBeInTheDocument();
  });

  it('renders Local badge for local source plugins', () => {
    const localPlugin = { ...mockPlugin, source: 'local' };
    render(<PluginCard {...defaultProps} plugin={localPlugin} />);
    expect(screen.getByText('Local')).toBeInTheDocument();
  });

  it('handles plugin with no description', () => {
    const noDescPlugin = { ...mockPlugin, description: null };
    render(<PluginCard {...defaultProps} plugin={noDescPlugin} />);
    expect(screen.getByText('AI Paper Reviewer')).toBeInTheDocument();
  });

  it('handles plugin with no permissions', () => {
    const noPermPlugin = { ...mockPlugin, permissions: [] };
    render(<PluginCard {...defaultProps} plugin={noPermPlugin} />);
    // Should not crash; permission count should not appear
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('handles plugin with no hooks', () => {
    const noHooksPlugin = { ...mockPlugin, hooks: [] };
    render(<PluginCard {...defaultProps} plugin={noHooksPlugin} />);
    expect(screen.getByText('AI Paper Reviewer')).toBeInTheDocument();
  });

  it('handles single permission label correctly', () => {
    const singlePermPlugin = { ...mockPlugin, permissions: ['submissions:read'] };
    render(<PluginCard {...defaultProps} plugin={singlePermPlugin} />);
    expect(screen.getByText('1 permission')).toBeInTheDocument();
  });

  it('handles single hook label correctly', () => {
    const singleHookPlugin = { ...mockPlugin, hooks: ['submission.created'] };
    render(<PluginCard {...defaultProps} plugin={singleHookPlugin} />);
    expect(screen.getByText('1 hook')).toBeInTheDocument();
  });
});
