/**
 * Official Plugins Gallery Component Tests
 *
 * Tests security acknowledgement dialog and install flow.
 *
 * @vitest-environment happy-dom
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import '@testing-library/jest-dom';

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

// Mock plugin events
vi.mock('@/lib/plugins/events', () => ({
  emitPluginChange: vi.fn(),
}));

// Mock radix-ui alert-dialog for testability
vi.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children, open }: any) => (open ? <div data-testid="alert-dialog">{children}</div> : null),
  AlertDialogContent: ({ children }: any) => <div data-testid="alert-dialog-content">{children}</div>,
  AlertDialogHeader: ({ children }: any) => <div>{children}</div>,
  AlertDialogTitle: ({ children, className }: any) => <h2 className={className}>{children}</h2>,
  AlertDialogDescription: ({ children, className }: any) => <div className={className}>{children}</div>,
  AlertDialogFooter: ({ children }: any) => <div>{children}</div>,
  AlertDialogCancel: ({ children, onClick }: any) => (
    <button data-testid="alert-cancel" onClick={onClick}>{children}</button>
  ),
  AlertDialogAction: ({ children, onClick }: any) => (
    <button data-testid="alert-confirm" onClick={onClick}>{children}</button>
  ),
}));

// Mock GalleryPluginCard for simpler testing
vi.mock('@/components/admin/gallery-plugin-card', () => ({
  GalleryPluginCard: ({ plugin, onInstall, isInstalling }: any) => (
    <div data-testid={`gallery-card-${plugin.name}`}>
      <span>{plugin.displayName}</span>
      <button
        data-testid={`install-btn-${plugin.name}`}
        onClick={onInstall}
        disabled={isInstalling}
      >
        {isInstalling ? 'Installing...' : plugin.installStatus === 'update_available' ? 'Update' : 'Install'}
      </button>
    </div>
  ),
}));

import { OfficialPluginsGallery } from '@/components/admin/official-plugins-gallery';
import type { GalleryPluginWithStatus } from '@/lib/plugins/gallery';
import { toast } from 'sonner';

const mockPlugins: GalleryPluginWithStatus[] = [
  {
    name: 'ai-paper-reviewer',
    displayName: 'AI Paper Reviewer',
    version: '1.11.0',
    apiVersion: '1.0',
    description: 'Intelligent submission analysis',
    author: 'CFP Directory',
    homepage: 'https://example.com',
    permissions: ['submissions:read'],
    hooks: ['submission.created'],
    downloadUrl: 'https://github.com/example/plugin.zip',
    installStatus: 'not_installed',
  },
  {
    name: 'example-webhook',
    displayName: 'Example Webhook',
    version: '1.1.0',
    apiVersion: '1.0',
    description: 'Webhook notifications',
    author: 'CFP Directory',
    homepage: 'https://example.com',
    permissions: [],
    hooks: [],
    downloadUrl: 'https://github.com/example/webhook.zip',
    installStatus: 'update_available',
    installedVersion: '1.0.0',
  },
];

describe('OfficialPluginsGallery', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -----------------------------------------------------------------------
  // Gallery loading and display
  // -----------------------------------------------------------------------

  it('fetches and displays gallery plugins', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ plugins: mockPlugins, lastUpdated: '2026-01-30T00:00:00Z' }),
    });

    render(<OfficialPluginsGallery />);

    await waitFor(() => {
      expect(screen.getByText('AI Paper Reviewer')).toBeInTheDocument();
      expect(screen.getByText('Example Webhook')).toBeInTheDocument();
    });
  });

  it('shows error state when gallery fetch fails', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Network error' }),
    });

    render(<OfficialPluginsGallery />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load plugin gallery')).toBeInTheDocument();
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // Refresh functionality
  // -----------------------------------------------------------------------

  it('fetches with refresh=true and cache buster when Refresh button is clicked', async () => {
    const user = userEvent.setup();

    // Initial load
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ plugins: mockPlugins, lastUpdated: '2026-01-30T00:00:00Z' }),
    });

    render(<OfficialPluginsGallery />);

    await waitFor(() => {
      expect(screen.getByText('AI Paper Reviewer')).toBeInTheDocument();
    });

    // Setup mock for refresh call
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ plugins: mockPlugins, lastUpdated: '2026-01-31T00:00:00Z' }),
    });

    // Click refresh button
    await user.click(screen.getByText('Refresh'));

    // Verify refresh was called with correct params
    await waitFor(() => {
      const calls = fetchMock.mock.calls;
      const refreshCall = calls[1][0] as string;
      expect(refreshCall).toContain('refresh=true');
      expect(refreshCall).toContain('_t='); // Cache buster
    });

    // Verify success toast was shown
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Plugin gallery refreshed');
    });
  });

  it('uses cache: no-store to prevent browser caching', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ plugins: mockPlugins, lastUpdated: '2026-01-30T00:00:00Z' }),
    });

    render(<OfficialPluginsGallery />);

    await waitFor(() => {
      expect(screen.getByText('AI Paper Reviewer')).toBeInTheDocument();
    });

    // Verify fetch was called with cache: 'no-store' on refresh
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ plugins: mockPlugins, lastUpdated: '2026-01-31T00:00:00Z' }),
    });

    const user = userEvent.setup();
    await user.click(screen.getByText('Refresh'));

    await waitFor(() => {
      const calls = fetchMock.mock.calls;
      const refreshOptions = calls[1][1] as RequestInit;
      expect(refreshOptions.cache).toBe('no-store');
    });
  });

  // -----------------------------------------------------------------------
  // Security acknowledgement dialog
  // -----------------------------------------------------------------------

  it('shows security dialog when Install button is clicked', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ plugins: mockPlugins, lastUpdated: '2026-01-30T00:00:00Z' }),
    });

    render(<OfficialPluginsGallery />);

    await waitFor(() => {
      expect(screen.getByText('AI Paper Reviewer')).toBeInTheDocument();
    });

    // Click install button
    await user.click(screen.getByTestId('install-btn-ai-paper-reviewer'));

    // Security dialog should appear
    expect(screen.getByTestId('alert-dialog')).toBeInTheDocument();
    expect(screen.getByText('Security Warning')).toBeInTheDocument();
    expect(screen.getByText(/execute arbitrary code/)).toBeInTheDocument();
    expect(screen.getByText(/Your database and all stored data/)).toBeInTheDocument();
    expect(screen.getByText(/Environment variables and secrets/)).toBeInTheDocument();
    expect(screen.getByText(/The file system and network/)).toBeInTheDocument();
  });

  it('shows security dialog when Update button is clicked', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ plugins: mockPlugins, lastUpdated: '2026-01-30T00:00:00Z' }),
    });

    render(<OfficialPluginsGallery />);

    await waitFor(() => {
      expect(screen.getByText('Example Webhook')).toBeInTheDocument();
    });

    // Click update button
    await user.click(screen.getByTestId('install-btn-example-webhook'));

    // Security dialog should appear
    expect(screen.getByTestId('alert-dialog')).toBeInTheDocument();
    expect(screen.getByText('Security Warning')).toBeInTheDocument();
  });

  it('closes security dialog when Cancel is clicked', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ plugins: mockPlugins, lastUpdated: '2026-01-30T00:00:00Z' }),
    });

    render(<OfficialPluginsGallery />);

    await waitFor(() => {
      expect(screen.getByText('AI Paper Reviewer')).toBeInTheDocument();
    });

    // Click install button
    await user.click(screen.getByTestId('install-btn-ai-paper-reviewer'));

    // Dialog should be open
    expect(screen.getByTestId('alert-dialog')).toBeInTheDocument();

    // Click cancel
    await user.click(screen.getByTestId('alert-cancel'));

    // Dialog should be closed
    expect(screen.queryByTestId('alert-dialog')).not.toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Install flow with acknowledgement
  // -----------------------------------------------------------------------

  it('sends acknowledgeCodeExecution=true when user confirms', async () => {
    const user = userEvent.setup();

    // First call: fetch gallery
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ plugins: mockPlugins, lastUpdated: '2026-01-30T00:00:00Z' }),
    });

    // Second call: install plugin
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        plugin: { displayName: 'AI Paper Reviewer', name: 'ai-paper-reviewer' },
      }),
    });

    render(<OfficialPluginsGallery />);

    await waitFor(() => {
      expect(screen.getByText('AI Paper Reviewer')).toBeInTheDocument();
    });

    // Click install button
    await user.click(screen.getByTestId('install-btn-ai-paper-reviewer'));

    // Dialog should be open
    expect(screen.getByTestId('alert-dialog')).toBeInTheDocument();

    // Click confirm
    await user.click(screen.getByTestId('alert-confirm'));

    // Verify the install API was called with acknowledgeCodeExecution
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/admin/plugins/gallery/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pluginName: 'ai-paper-reviewer', acknowledgeCodeExecution: true }),
      });
    });
  });

  it('shows success toast after successful install', async () => {
    const user = userEvent.setup();

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ plugins: mockPlugins, lastUpdated: '2026-01-30T00:00:00Z' }),
    });

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        plugin: { displayName: 'AI Paper Reviewer', name: 'ai-paper-reviewer' },
      }),
    });

    render(<OfficialPluginsGallery />);

    await waitFor(() => {
      expect(screen.getByText('AI Paper Reviewer')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('install-btn-ai-paper-reviewer'));
    await user.click(screen.getByTestId('alert-confirm'));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        'Plugin "AI Paper Reviewer" installed successfully'
      );
    });
  });

  it('shows error toast when install fails', async () => {
    const user = userEvent.setup();

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ plugins: mockPlugins, lastUpdated: '2026-01-30T00:00:00Z' }),
    });

    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Download failed' }),
    });

    render(<OfficialPluginsGallery />);

    await waitFor(() => {
      expect(screen.getByText('AI Paper Reviewer')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('install-btn-ai-paper-reviewer'));
    await user.click(screen.getByTestId('alert-confirm'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Download failed');
    });
  });

  it('shows error toast on network error', async () => {
    const user = userEvent.setup();

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ plugins: mockPlugins, lastUpdated: '2026-01-30T00:00:00Z' }),
    });

    // Simulate network error
    fetchMock.mockRejectedValueOnce(new Error('Network error'));

    render(<OfficialPluginsGallery />);

    await waitFor(() => {
      expect(screen.getByText('AI Paper Reviewer')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('install-btn-ai-paper-reviewer'));
    await user.click(screen.getByTestId('alert-confirm'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Network error. Please try again.');
    });
  });

  // -----------------------------------------------------------------------
  // Security dialog content
  // -----------------------------------------------------------------------

  it('displays all security warning items', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ plugins: mockPlugins, lastUpdated: '2026-01-30T00:00:00Z' }),
    });

    render(<OfficialPluginsGallery />);

    await waitFor(() => {
      expect(screen.getByText('AI Paper Reviewer')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('install-btn-ai-paper-reviewer'));

    const dialog = screen.getByTestId('alert-dialog-content');
    expect(within(dialog).getByText(/Your database and all stored data/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Environment variables and secrets/)).toBeInTheDocument();
    expect(within(dialog).getByText(/The file system and network/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Only install plugins from sources you trust/)).toBeInTheDocument();
  });

  it('displays confirm button with correct text', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ plugins: mockPlugins, lastUpdated: '2026-01-30T00:00:00Z' }),
    });

    render(<OfficialPluginsGallery />);

    await waitFor(() => {
      expect(screen.getByText('AI Paper Reviewer')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('install-btn-ai-paper-reviewer'));

    expect(screen.getByText('I Understand, Install Plugin')).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Dialog does not reopen after install
  // -----------------------------------------------------------------------

  it('does not reopen dialog after successful install', async () => {
    const user = userEvent.setup();

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ plugins: mockPlugins, lastUpdated: '2026-01-30T00:00:00Z' }),
    });

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        plugin: { displayName: 'AI Paper Reviewer', name: 'ai-paper-reviewer' },
      }),
    });

    render(<OfficialPluginsGallery />);

    await waitFor(() => {
      expect(screen.getByText('AI Paper Reviewer')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('install-btn-ai-paper-reviewer'));
    await user.click(screen.getByTestId('alert-confirm'));

    // Dialog should close after confirm
    await waitFor(() => {
      expect(screen.queryByTestId('alert-dialog')).not.toBeInTheDocument();
    });
  });
});
