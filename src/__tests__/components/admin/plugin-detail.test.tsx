/**
 * Plugin Detail Component Tests
 *
 * Tests header icon, permission severity indicators,
 * hook descriptions, and job status icons.
 *
 * @vitest-environment happy-dom
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import '@testing-library/jest-dom';

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
  }),
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

// Mock child components to avoid deep dependency tree
vi.mock('@/components/admin/plugin-config-form', () => ({
  PluginConfigForm: ({ pluginName }: { pluginName: string }) => (
    <div data-testid="config-form">Config form for {pluginName}</div>
  ),
}));

vi.mock('@/components/admin/plugin-logs-viewer', () => ({
  PluginLogsViewer: ({ pluginName }: { pluginName: string }) => (
    <div data-testid="logs-viewer">Logs for {pluginName}</div>
  ),
}));

// Mock permission descriptions
vi.mock('@/lib/plugins/types', () => ({
  PERMISSION_DESCRIPTIONS: {
    'submissions:read': 'Read submission data',
    'reviews:write': 'Create/update reviews',
    'events:read': 'Read event data',
    'users:manage': 'Create/update/delete users',
  },
}));

import { PluginDetail } from '@/components/admin/plugin-detail';

const mockPlugin = {
  id: 'p1',
  name: 'ai-paper-reviewer',
  displayName: 'AI Paper Reviewer',
  description: 'Smart submission analysis',
  version: '1.2.0',
  apiVersion: '1.0',
  author: 'CFP Directory',
  homepage: 'https://example.com',
  source: 'gallery',
  sourcePath: '/plugins/ai-paper-reviewer',
  enabled: true,
  installed: true,
  permissions: ['submissions:read', 'reviews:write', 'events:read'],
  hooks: ['submission.created', 'submission.updated'],
  config: { apiKey: 'sk-test' },
  configSchema: { type: 'object', properties: {} },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  _count: { logs: 15, jobs: 8 },
};

const mockJobStats = {
  pending: 2,
  running: 1,
  completed: 10,
  failed: 3,
};

describe('PluginDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
  });

  // -----------------------------------------------------------------------
  // Header with icon
  // -----------------------------------------------------------------------

  it('renders plugin display name', () => {
    render(<PluginDetail plugin={mockPlugin} jobStats={mockJobStats} />);
    // The display name appears in h1 and potentially in badges
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('AI Paper Reviewer');
  });

  it('renders plugin icon with initials', () => {
    render(<PluginDetail plugin={mockPlugin} jobStats={mockJobStats} />);
    expect(screen.getByText('AP')).toBeInTheDocument();
  });

  it('renders version info', () => {
    render(<PluginDetail plugin={mockPlugin} jobStats={mockJobStats} />);
    expect(screen.getByText(/ai-paper-reviewer v1.2.0/)).toBeInTheDocument();
  });

  it('renders description', () => {
    render(<PluginDetail plugin={mockPlugin} jobStats={mockJobStats} />);
    expect(screen.getByText('Smart submission analysis')).toBeInTheDocument();
  });

  it('renders back link to plugins list', () => {
    render(<PluginDetail plugin={mockPlugin} jobStats={mockJobStats} />);
    const backLink = screen.getByText('Back to Plugins').closest('a');
    expect(backLink).toHaveAttribute('href', '/admin/plugins');
  });

  it('renders enabled text in toggle area', () => {
    render(<PluginDetail plugin={mockPlugin} jobStats={mockJobStats} />);
    // Multiple elements may say "Enabled" (toggle label + badge)
    const enabledElements = screen.getAllByText('Enabled');
    expect(enabledElements.length).toBeGreaterThanOrEqual(1);
  });

  // -----------------------------------------------------------------------
  // Metadata badges
  // -----------------------------------------------------------------------

  it('renders source badge', () => {
    render(<PluginDetail plugin={mockPlugin} jobStats={mockJobStats} />);
    expect(screen.getByText('Source: gallery')).toBeInTheDocument();
  });

  it('renders author badge', () => {
    render(<PluginDetail plugin={mockPlugin} jobStats={mockJobStats} />);
    expect(screen.getByText('By CFP Directory')).toBeInTheDocument();
  });

  it('renders documentation link', () => {
    render(<PluginDetail plugin={mockPlugin} jobStats={mockJobStats} />);
    expect(screen.getByText('Documentation')).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Tabs
  // -----------------------------------------------------------------------

  it('renders all tab triggers', () => {
    render(<PluginDetail plugin={mockPlugin} jobStats={mockJobStats} />);
    expect(screen.getByText('Configuration')).toBeInTheDocument();
    expect(screen.getByText('Permissions (3)')).toBeInTheDocument();
    expect(screen.getByText('Hooks (2)')).toBeInTheDocument();
    expect(screen.getByText('Jobs')).toBeInTheDocument();
    expect(screen.getByText('Logs (15)')).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Permissions tab - severity indicators
  // -----------------------------------------------------------------------

  it('renders permissions with severity badges when permissions tab is clicked', async () => {
    const user = userEvent.setup();
    render(<PluginDetail plugin={mockPlugin} jobStats={mockJobStats} />);

    // Click on the permissions tab
    await user.click(screen.getByText('Permissions (3)'));

    // "submissions:read" and "events:read" are "read" severity
    const readBadges = screen.getAllByText('read');
    expect(readBadges.length).toBeGreaterThanOrEqual(2);

    // "reviews:write" is "write" severity
    const writeBadges = screen.getAllByText('write');
    expect(writeBadges.length).toBeGreaterThanOrEqual(1);
  });

  it('renders permission descriptions when permissions tab is active', async () => {
    const user = userEvent.setup();
    render(<PluginDetail plugin={mockPlugin} jobStats={mockJobStats} />);

    await user.click(screen.getByText('Permissions (3)'));

    expect(screen.getByText('Read submission data')).toBeInTheDocument();
    expect(screen.getByText('Create/update reviews')).toBeInTheDocument();
    expect(screen.getByText('Read event data')).toBeInTheDocument();
  });

  it('renders color-coded permission backgrounds', async () => {
    const user = userEvent.setup();
    const { container } = render(<PluginDetail plugin={mockPlugin} jobStats={mockJobStats} />);

    await user.click(screen.getByText('Permissions (3)'));

    // Read permissions should have green backgrounds
    expect(container.querySelector('.bg-green-50')).toBeTruthy();
    // Write permissions should have amber backgrounds
    expect(container.querySelector('.bg-amber-50')).toBeTruthy();
  });

  it('shows manage severity for manage permissions', async () => {
    const user = userEvent.setup();
    const pluginWithManage = {
      ...mockPlugin,
      permissions: ['users:manage'],
    };
    render(<PluginDetail plugin={pluginWithManage} jobStats={mockJobStats} />);

    await user.click(screen.getByText('Permissions (1)'));
    expect(screen.getByText('manage')).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Hooks tab - friendly descriptions
  // -----------------------------------------------------------------------

  it('renders hook names as code when hooks tab is active', async () => {
    const user = userEvent.setup();
    render(<PluginDetail plugin={mockPlugin} jobStats={mockJobStats} />);

    await user.click(screen.getByText('Hooks (2)'));

    expect(screen.getByText('submission.created')).toBeInTheDocument();
    expect(screen.getByText('submission.updated')).toBeInTheDocument();
  });

  it('renders friendly hook descriptions', async () => {
    const user = userEvent.setup();
    render(<PluginDetail plugin={mockPlugin} jobStats={mockJobStats} />);

    await user.click(screen.getByText('Hooks (2)'));

    expect(screen.getByText('Triggered when a new paper or talk is submitted')).toBeInTheDocument();
    expect(screen.getByText('Triggered when an existing submission is modified')).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Jobs tab - colored status icons
  // -----------------------------------------------------------------------

  it('renders job counts when jobs tab is active', async () => {
    const user = userEvent.setup();
    render(<PluginDetail plugin={mockPlugin} jobStats={mockJobStats} />);

    await user.click(screen.getByText('Jobs'));

    expect(screen.getByText('10')).toBeInTheDocument(); // completed
  });

  it('renders job status labels', async () => {
    const user = userEvent.setup();
    render(<PluginDetail plugin={mockPlugin} jobStats={mockJobStats} />);

    await user.click(screen.getByText('Jobs'));

    expect(screen.getByText('pending')).toBeInTheDocument();
    expect(screen.getByText('running')).toBeInTheDocument();
    expect(screen.getByText('completed')).toBeInTheDocument();
    expect(screen.getByText('failed')).toBeInTheDocument();
  });

  it('renders colored job status backgrounds', async () => {
    const user = userEvent.setup();
    const { container } = render(<PluginDetail plugin={mockPlugin} jobStats={mockJobStats} />);

    await user.click(screen.getByText('Jobs'));

    expect(container.querySelector('.bg-yellow-50')).toBeTruthy(); // pending
    expect(container.querySelector('.bg-blue-50')).toBeTruthy(); // running
    expect(container.querySelector('.bg-green-50')).toBeTruthy(); // completed
    expect(container.querySelector('.bg-red-50')).toBeTruthy(); // failed
  });

  // -----------------------------------------------------------------------
  // Tab content card wrapping
  // -----------------------------------------------------------------------

  it('wraps tab content in rounded-xl card panels', () => {
    const { container } = render(<PluginDetail plugin={mockPlugin} jobStats={mockJobStats} />);
    const cards = container.querySelectorAll('.rounded-xl');
    // The plugin icon + at least one tab content card
    expect(cards.length).toBeGreaterThanOrEqual(2);
  });

  // -----------------------------------------------------------------------
  // Edge cases
  // -----------------------------------------------------------------------

  it('handles plugin with no permissions', async () => {
    const user = userEvent.setup();
    const noPermPlugin = { ...mockPlugin, permissions: [] };
    render(<PluginDetail plugin={noPermPlugin} jobStats={mockJobStats} />);

    expect(screen.getByText('Permissions (0)')).toBeInTheDocument();

    await user.click(screen.getByText('Permissions (0)'));
    expect(screen.getByText('This plugin does not require any special permissions.')).toBeInTheDocument();
  });

  it('handles plugin with no hooks', async () => {
    const user = userEvent.setup();
    const noHooksPlugin = { ...mockPlugin, hooks: [] };
    render(<PluginDetail plugin={noHooksPlugin} jobStats={mockJobStats} />);

    expect(screen.getByText('Hooks (0)')).toBeInTheDocument();

    await user.click(screen.getByText('Hooks (0)'));
    expect(screen.getByText('This plugin does not register any hooks.')).toBeInTheDocument();
  });

  it('handles zero job stats', async () => {
    const user = userEvent.setup();
    const zeroJobs = { pending: 0, running: 0, completed: 0, failed: 0 };
    const noJobsPlugin = { ...mockPlugin, _count: { logs: 0, jobs: 0 } };
    render(<PluginDetail plugin={noJobsPlugin} jobStats={zeroJobs} />);

    await user.click(screen.getByText('Jobs'));
    expect(screen.getByText('No background jobs have been created by this plugin yet.')).toBeInTheDocument();
  });

  it('handles disabled plugin', () => {
    const disabledPlugin = { ...mockPlugin, enabled: false };
    render(<PluginDetail plugin={disabledPlugin} jobStats={mockJobStats} />);
    // Multiple elements say "Disabled" (toggle label + badge)
    const disabledElements = screen.getAllByText('Disabled');
    expect(disabledElements.length).toBeGreaterThanOrEqual(1);
  });
});
