/**
 * PluginSlot and PluginErrorBoundary Component Tests
 *
 * @vitest-environment happy-dom
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
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

import { PluginSlot } from '@/components/plugins/plugin-slot';
import { PluginErrorBoundary } from '@/components/plugins/plugin-error-boundary';
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

// Suppress console.error from error boundary in tests
const originalError = console.error;
beforeEach(() => {
  console.error = vi.fn();
});
afterEach(() => {
  console.error = originalError;
});

describe('PluginErrorBoundary', () => {
  it('should render children when no error', () => {
    render(
      <PluginErrorBoundary pluginName="test-plugin">
        <div data-testid="child">Hello</div>
      </PluginErrorBoundary>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('should show fallback UI when child throws', () => {
    const ThrowingComponent = () => {
      throw new Error('Test render error');
    };

    render(
      <PluginErrorBoundary pluginName="broken-plugin">
        <ThrowingComponent />
      </PluginErrorBoundary>
    );

    expect(screen.getByTestId('plugin-error-boundary-fallback')).toBeInTheDocument();
    expect(screen.getByText('Plugin Error: broken-plugin')).toBeInTheDocument();
    expect(screen.getByText('Test render error')).toBeInTheDocument();
  });

  it('should show retry button on error', () => {
    const ThrowingComponent = () => {
      throw new Error('Oops');
    };

    render(
      <PluginErrorBoundary pluginName="test-plugin">
        <ThrowingComponent />
      </PluginErrorBoundary>
    );

    expect(screen.getByTestId('plugin-error-retry')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('should retry rendering when retry button is clicked', async () => {
    let shouldThrow = true;

    const ConditionallyThrowingComponent = () => {
      if (shouldThrow) {
        throw new Error('First render fails');
      }
      return <div data-testid="recovered">Recovered</div>;
    };

    render(
      <PluginErrorBoundary pluginName="test-plugin">
        <ConditionallyThrowingComponent />
      </PluginErrorBoundary>
    );

    // Should show error
    expect(screen.getByTestId('plugin-error-boundary-fallback')).toBeInTheDocument();

    // Fix the error and retry
    shouldThrow = false;
    const user = userEvent.setup();
    await user.click(screen.getByTestId('plugin-error-retry'));

    // Should now show recovered content
    expect(screen.getByTestId('recovered')).toBeInTheDocument();
  });

  it('should log error details to console', () => {
    const ThrowingComponent = () => {
      throw new Error('Log test error');
    };

    render(
      <PluginErrorBoundary pluginName="logging-plugin">
        <ThrowingComponent />
      </PluginErrorBoundary>
    );

    // console.error is called by React internally and by our componentDidCatch
    expect(console.error).toHaveBeenCalled();
  });
});

describe('PluginSlot', () => {
  beforeEach(() => {
    resetSlotRegistry();
  });

  afterEach(() => {
    resetSlotRegistry();
  });

  it('should render nothing when no components are registered', () => {
    const { container } = render(
      <PluginSlot name="dashboard.widgets" />
    );

    expect(container.innerHTML).toBe('');
  });

  it('should render registered components', () => {
    const TestWidget: React.ComponentType<PluginComponentProps> = () => (
      <div data-testid="test-widget">Widget Content</div>
    );

    const registry = getSlotRegistry();
    registry.register({
      pluginName: 'test-plugin',
      pluginId: 'db-id',
      slot: 'dashboard.widgets',
      component: TestWidget,
      context: mockContext,
      order: 100,
    });

    render(<PluginSlot name="dashboard.widgets" />);

    expect(screen.getByTestId('test-widget')).toBeInTheDocument();
    expect(screen.getByText('Widget Content')).toBeInTheDocument();
  });

  it('should pass data to components', () => {
    const DataWidget: React.ComponentType<PluginComponentProps> = ({ data }) => (
      <div data-testid="data-widget">
        {data?.submissionId as string}
      </div>
    );

    const registry = getSlotRegistry();
    registry.register({
      pluginName: 'test-plugin',
      pluginId: 'db-id',
      slot: 'submission.review.sidebar',
      component: DataWidget,
      context: mockContext,
      order: 100,
    });

    render(
      <PluginSlot
        name="submission.review.sidebar"
        data={{ submissionId: 'sub-123' }}
      />
    );

    expect(screen.getByTestId('data-widget')).toBeInTheDocument();
    expect(screen.getByText('sub-123')).toBeInTheDocument();
  });

  it('should render multiple components in order', () => {
    const WidgetA: React.ComponentType<PluginComponentProps> = () => (
      <div data-testid="widget-a">A</div>
    );
    const WidgetB: React.ComponentType<PluginComponentProps> = () => (
      <div data-testid="widget-b">B</div>
    );

    const registry = getSlotRegistry();
    registry.register({
      pluginName: 'plugin-b',
      pluginId: 'db-b',
      slot: 'dashboard.widgets',
      component: WidgetB,
      context: mockContext,
      order: 200,
    });
    registry.register({
      pluginName: 'plugin-a',
      pluginId: 'db-a',
      slot: 'dashboard.widgets',
      component: WidgetA,
      context: mockContext,
      order: 50,
    });

    render(<PluginSlot name="dashboard.widgets" />);

    const widgetA = screen.getByTestId('widget-a');
    const widgetB = screen.getByTestId('widget-b');

    // A should come before B in the DOM (lower order)
    expect(widgetA.compareDocumentPosition(widgetB)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
  });

  it('should apply className to container', () => {
    const TestWidget: React.ComponentType<PluginComponentProps> = () => (
      <div>Widget</div>
    );

    const registry = getSlotRegistry();
    registry.register({
      pluginName: 'test-plugin',
      pluginId: 'db-id',
      slot: 'dashboard.widgets',
      component: TestWidget,
      context: mockContext,
      order: 100,
    });

    const { container } = render(
      <PluginSlot name="dashboard.widgets" className="my-custom-class" />
    );

    const slotContainer = container.firstChild as HTMLElement;
    expect(slotContainer.className).toBe('my-custom-class');
  });

  it('should set data-plugin-slot attribute', () => {
    const TestWidget: React.ComponentType<PluginComponentProps> = () => (
      <div>Widget</div>
    );

    const registry = getSlotRegistry();
    registry.register({
      pluginName: 'test-plugin',
      pluginId: 'db-id',
      slot: 'dashboard.widgets',
      component: TestWidget,
      context: mockContext,
      order: 100,
    });

    const { container } = render(
      <PluginSlot name="dashboard.widgets" />
    );

    const slotContainer = container.firstChild as HTMLElement;
    expect(slotContainer.getAttribute('data-plugin-slot')).toBe('dashboard.widgets');
  });

  it('should catch errors from individual plugin components', () => {
    const GoodWidget: React.ComponentType<PluginComponentProps> = () => (
      <div data-testid="good-widget">Works Fine</div>
    );

    const BadWidget: React.ComponentType<PluginComponentProps> = () => {
      throw new Error('Plugin crash');
    };

    const registry = getSlotRegistry();
    registry.register({
      pluginName: 'good-plugin',
      pluginId: 'db-good',
      slot: 'dashboard.widgets',
      component: GoodWidget,
      context: mockContext,
      order: 100,
    });
    registry.register({
      pluginName: 'bad-plugin',
      pluginId: 'db-bad',
      slot: 'dashboard.widgets',
      component: BadWidget,
      context: mockContext,
      order: 200,
    });

    render(<PluginSlot name="dashboard.widgets" />);

    // Good widget should still render
    expect(screen.getByTestId('good-widget')).toBeInTheDocument();
    // Bad widget should show error boundary
    expect(screen.getByText('Plugin Error: bad-plugin')).toBeInTheDocument();
  });
});
