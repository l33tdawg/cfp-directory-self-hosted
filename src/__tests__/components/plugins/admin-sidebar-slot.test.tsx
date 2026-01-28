/**
 * AdminSidebarSlot Component Tests
 *
 * @vitest-environment happy-dom
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}));

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

import { usePathname } from 'next/navigation';
import { AdminSidebarSlot } from '@/components/plugins/admin-sidebar-slot';
import { getSlotRegistry, resetSlotRegistry } from '@/lib/plugins/slots/registry';
import type { PluginComponentProps, PluginContext } from '@/lib/plugins/types';

// Mock plugin context
const mockContext: PluginContext = {
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  config: {},
  submissions: {} as any,
  users: {} as any,
  events: {} as any,
  reviews: {} as any,
  storage: {} as any,
  email: {} as any,
};

describe('AdminSidebarSlot', () => {
  beforeEach(() => {
    resetSlotRegistry();
    vi.mocked(usePathname).mockReturnValue('/admin/plugins');
  });

  afterEach(() => {
    resetSlotRegistry();
    vi.clearAllMocks();
  });

  it('should render nothing when no plugins are registered', () => {
    const { container } = render(<AdminSidebarSlot />);
    expect(container.innerHTML).toBe('');
  });

  it('should render plugin items with pathname data', () => {
    vi.mocked(usePathname).mockReturnValue('/admin/plugins/pages/ai-paper-reviewer/history');

    // Create a sidebar item component that displays the pathname
    const SidebarItem: React.ComponentType<PluginComponentProps> = ({ data }) => (
      <div data-testid="sidebar-item">
        <span data-testid="pathname">{data?.pathname as string}</span>
        <span data-testid="base-path">{data?.pluginBasePath as string}</span>
      </div>
    );

    const registry = getSlotRegistry();
    registry.register({
      pluginName: 'test-plugin',
      pluginId: 'db-id',
      slot: 'admin.sidebar.items',
      component: SidebarItem,
      context: mockContext,
      order: 100,
    });

    render(<AdminSidebarSlot />);

    expect(screen.getByTestId('sidebar-item')).toBeInTheDocument();
    expect(screen.getByTestId('pathname')).toHaveTextContent('/admin/plugins/pages/ai-paper-reviewer/history');
    expect(screen.getByTestId('base-path')).toHaveTextContent('/admin/plugins/pages');
  });

  it('should render multiple plugin sidebar items in order', () => {
    const ItemA: React.ComponentType<PluginComponentProps> = () => (
      <div data-testid="item-a">Plugin A</div>
    );
    const ItemB: React.ComponentType<PluginComponentProps> = () => (
      <div data-testid="item-b">Plugin B</div>
    );

    const registry = getSlotRegistry();
    registry.register({
      pluginName: 'plugin-b',
      pluginId: 'db-b',
      slot: 'admin.sidebar.items',
      component: ItemB,
      context: mockContext,
      order: 200,
    });
    registry.register({
      pluginName: 'plugin-a',
      pluginId: 'db-a',
      slot: 'admin.sidebar.items',
      component: ItemA,
      context: mockContext,
      order: 50,
    });

    render(<AdminSidebarSlot />);

    const itemA = screen.getByTestId('item-a');
    const itemB = screen.getByTestId('item-b');

    // A should come before B in the DOM (lower order)
    expect(itemA.compareDocumentPosition(itemB)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
  });

  it('should apply space-y-1 class to container', () => {
    const SidebarItem: React.ComponentType<PluginComponentProps> = () => (
      <div>Item</div>
    );

    const registry = getSlotRegistry();
    registry.register({
      pluginName: 'test-plugin',
      pluginId: 'db-id',
      slot: 'admin.sidebar.items',
      component: SidebarItem,
      context: mockContext,
      order: 100,
    });

    const { container } = render(<AdminSidebarSlot />);
    const slotContainer = container.firstChild as HTMLElement;
    expect(slotContainer.className).toContain('space-y-1');
  });
});
