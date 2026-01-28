/**
 * PluginAdminPageHost Component Tests
 *
 * @vitest-environment happy-dom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock Prisma before importing slot-dependent modules
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    pluginLog: { create: vi.fn().mockResolvedValue({}) },
    submission: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    user: { findUnique: vi.fn(), findMany: vi.fn() },
    event: { findUnique: vi.fn(), findMany: vi.fn() },
    review: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
  },
}));

vi.mock('@/lib/storage/local-storage-provider', () => ({
  getStorage: vi.fn().mockReturnValue({
    getPublicUrl: vi.fn().mockReturnValue('http://test.com/file'),
    upload: vi.fn().mockResolvedValue({ url: 'http://test.com/uploaded' }),
    delete: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock('@/lib/email/email-service', () => ({
  emailService: { send: vi.fn().mockResolvedValue({ success: true }) },
}));

import { PluginAdminPageHost } from '@/components/plugins/plugin-admin-page-host';
import { getSlotRegistry, resetSlotRegistry } from '@/lib/plugins/slots/registry';
import type { PluginComponentProps, ClientPluginContext } from '@/lib/plugins/types';

// Mock client context
const mockClientContext: ClientPluginContext = {
  pluginName: 'test-plugin',
  pluginId: 'db-id',
  config: {},
};

// Suppress console.error from error boundary in tests
const originalError = console.error;
beforeEach(() => {
  console.error = vi.fn();
});
afterEach(() => {
  console.error = originalError;
});

describe('PluginAdminPageHost', () => {
  beforeEach(() => {
    resetSlotRegistry();
  });

  afterEach(() => {
    resetSlotRegistry();
    vi.clearAllMocks();
  });

  it('should show "no pages available" when no admin pages are registered', () => {
    render(
      <PluginAdminPageHost
        pluginName="test-plugin"
        pluginId="db-id"
        pluginDisplayName="Test Plugin"
        pagePath="/"
      />
    );

    expect(screen.getByTestId('plugin-admin-no-pages')).toBeInTheDocument();
    expect(screen.getByText('No Admin Pages Available')).toBeInTheDocument();
    expect(screen.getByText(/does not provide any admin pages/)).toBeInTheDocument();
  });

  it('should show "page not found" when page path does not match any registered page', () => {
    const HistoryPage: React.ComponentType<PluginComponentProps> = () => (
      <div data-testid="history-page">History</div>
    );

    const registry = getSlotRegistry();
    registry.register({
      pluginName: 'test-plugin',
      pluginId: 'db-id',
      slot: 'admin.pages.test-plugin',
      component: HistoryPage,
      context: mockClientContext,
      order: 100,
      metadata: { path: '/history', title: 'Review History' },
    });

    render(
      <PluginAdminPageHost
        pluginName="test-plugin"
        pluginId="db-id"
        pluginDisplayName="Test Plugin"
        pagePath="/settings"
      />
    );

    expect(screen.getByTestId('plugin-admin-page-not-found')).toBeInTheDocument();
    expect(screen.getByText('Page Not Found')).toBeInTheDocument();
    expect(screen.getByText(/\/settings/)).toBeInTheDocument();
    expect(screen.getByText(/\/history/)).toBeInTheDocument();
  });

  it('should render registered page component with context', () => {
    const HistoryPage: React.ComponentType<PluginComponentProps> = ({ context }) => (
      <div data-testid="history-page">
        Plugin: {context.pluginName}
      </div>
    );

    const registry = getSlotRegistry();
    registry.register({
      pluginName: 'test-plugin',
      pluginId: 'db-id',
      slot: 'admin.pages.test-plugin',
      component: HistoryPage,
      context: mockClientContext,
      order: 100,
      metadata: { path: '/history', title: 'Review History' },
    });

    render(
      <PluginAdminPageHost
        pluginName="test-plugin"
        pluginId="db-id"
        pluginDisplayName="Test Plugin"
        pagePath="/history"
      />
    );

    expect(screen.getByTestId('plugin-admin-page-host')).toBeInTheDocument();
    expect(screen.getByTestId('history-page')).toBeInTheDocument();
    expect(screen.getByText('Plugin: test-plugin')).toBeInTheDocument();
  });

  it('should pass pagePath via data prop to the component', () => {
    const PersonasPage: React.ComponentType<PluginComponentProps> = ({ data }) => (
      <div data-testid="personas-page">
        Path: {data?.pagePath as string}
      </div>
    );

    const registry = getSlotRegistry();
    registry.register({
      pluginName: 'test-plugin',
      pluginId: 'db-id',
      slot: 'admin.pages.test-plugin',
      component: PersonasPage,
      context: mockClientContext,
      order: 100,
      metadata: { path: '/personas', title: 'Reviewer Personas' },
    });

    render(
      <PluginAdminPageHost
        pluginName="test-plugin"
        pluginId="db-id"
        pluginDisplayName="Test Plugin"
        pagePath="/personas"
      />
    );

    expect(screen.getByTestId('personas-page')).toBeInTheDocument();
    expect(screen.getByText('Path: /personas')).toBeInTheDocument();
  });

  it('should catch errors from page components with error boundary', () => {
    const BrokenPage: React.ComponentType<PluginComponentProps> = () => {
      throw new Error('Page crashed');
    };

    const registry = getSlotRegistry();
    registry.register({
      pluginName: 'broken-plugin',
      pluginId: 'db-id',
      slot: 'admin.pages.broken-plugin',
      component: BrokenPage,
      context: mockClientContext,
      order: 100,
      metadata: { path: '/crash', title: 'Broken Page' },
    });

    render(
      <PluginAdminPageHost
        pluginName="broken-plugin"
        pluginId="db-id"
        pluginDisplayName="Broken Plugin"
        pagePath="/crash"
      />
    );

    expect(screen.getByText('Plugin Error: broken-plugin')).toBeInTheDocument();
    expect(screen.getByText('Page crashed')).toBeInTheDocument();
  });

  it('should render breadcrumb navigation with page title', () => {
    const HistoryPage: React.ComponentType<PluginComponentProps> = () => (
      <div data-testid="history-page">History</div>
    );

    const registry = getSlotRegistry();
    registry.register({
      pluginName: 'ai-paper-reviewer',
      pluginId: 'db-id',
      slot: 'admin.pages.ai-paper-reviewer',
      component: HistoryPage,
      context: mockClientContext,
      order: 100,
      metadata: { path: '/history', title: 'Review History' },
    });

    render(
      <PluginAdminPageHost
        pluginName="ai-paper-reviewer"
        pluginId="db-id"
        pluginDisplayName="AI Paper Reviewer"
        pagePath="/history"
      />
    );

    expect(screen.getByText('Plugins')).toBeInTheDocument();
    expect(screen.getByText('AI Paper Reviewer')).toBeInTheDocument();
    expect(screen.getByText('Review History')).toBeInTheDocument();
  });

  it('should handle root path "/" correctly', () => {
    const RootPage: React.ComponentType<PluginComponentProps> = () => (
      <div data-testid="root-page">Root</div>
    );

    const registry = getSlotRegistry();
    registry.register({
      pluginName: 'test-plugin',
      pluginId: 'db-id',
      slot: 'admin.pages.test-plugin',
      component: RootPage,
      context: mockClientContext,
      order: 100,
      metadata: { path: '/', title: 'Dashboard' },
    });

    render(
      <PluginAdminPageHost
        pluginName="test-plugin"
        pluginId="db-id"
        pluginDisplayName="Test Plugin"
        pagePath="/"
      />
    );

    expect(screen.getByTestId('root-page')).toBeInTheDocument();
  });

  it('should normalize empty path to "/"', () => {
    const RootPage: React.ComponentType<PluginComponentProps> = () => (
      <div data-testid="root-page">Root</div>
    );

    const registry = getSlotRegistry();
    registry.register({
      pluginName: 'test-plugin',
      pluginId: 'db-id',
      slot: 'admin.pages.test-plugin',
      component: RootPage,
      context: mockClientContext,
      order: 100,
      metadata: { path: '/', title: 'Dashboard' },
    });

    render(
      <PluginAdminPageHost
        pluginName="test-plugin"
        pluginId="db-id"
        pluginDisplayName="Test Plugin"
        pagePath=""
      />
    );

    expect(screen.getByTestId('root-page')).toBeInTheDocument();
  });
});
