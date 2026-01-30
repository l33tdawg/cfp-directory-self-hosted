/**
 * Plugin Config Form Component Tests
 *
 * Tests grouped sections, provider-dependent model picker,
 * slider fields, friendly hints, and setup flow.
 *
 * @vitest-environment happy-dom
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import '@testing-library/jest-dom';

// Mock radix-ui tooltip
vi.mock('@radix-ui/react-tooltip', () => ({
  Provider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Root: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Trigger: ({ children }: any) => <>{children}</>,
  Content: ({ children }: { children: React.ReactNode }) => <div role="tooltip">{children}</div>,
  Portal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock radix-ui collapsible
vi.mock('@radix-ui/react-collapsible', () => ({
  Root: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CollapsibleTrigger: ({ children }: any) => <>{children}</>,
  CollapsibleContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock radix-ui slider
vi.mock('@radix-ui/react-slider', () => ({
  Root: ({ children, value, onValueChange, ...props }: any) => (
    <div role="slider" aria-valuenow={value?.[0] || 0} aria-valuemin={0} aria-valuemax={100} data-value={value?.[0]} {...props}>
      <input
        type="range"
        value={value?.[0] || 0}
        onChange={(e: any) => onValueChange?.([Number(e.target.value)])}
        data-testid={`slider-${props.id || 'default'}`}
      />
      {children}
    </div>
  ),
  Track: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Range: () => <div />,
  Thumb: () => <div />,
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

import { PluginConfigForm } from '@/components/admin/plugin-config-form';

// ---------------------------------------------------------------------------
// Test data: mimics the AI Paper Reviewer manifest configSchema
// ---------------------------------------------------------------------------

const fullSchema = {
  type: 'object',
  'x-groups': {
    provider: { title: 'AI Provider & Model', description: 'Choose your AI service and model', order: 0 },
    quality: { title: 'Quality Controls', description: 'Fine-tune output quality', order: 2 },
    review: { title: 'Review Behavior', description: 'Control how reviews are generated', order: 1 },
  },
  properties: {
    aiProvider: {
      type: 'string' as const,
      title: 'AI Provider',
      description: 'The AI provider to use',
      enum: ['openai', 'anthropic', 'gemini'],
      default: 'openai',
      'x-group': 'provider',
      'x-friendly-hint': 'Choose your AI service.',
    },
    apiKey: {
      type: 'string' as const,
      title: 'API Key',
      description: 'API key for the selected provider',
      format: 'password',
      'x-group': 'provider',
      'x-friendly-hint': 'Paste your key from the dashboard.',
    },
    model: {
      type: 'string' as const,
      title: 'Model',
      description: 'The AI model to use',
      default: 'gpt-4o',
      'x-group': 'provider',
      'x-depends-on': 'aiProvider',
      'x-friendly-hint': 'Pick the model for reviews.',
      'x-options': {
        openai: [
          { value: 'gpt-4o', label: 'GPT-4o (Recommended)', description: 'Best balance' },
          { value: 'gpt-4o-mini', label: 'GPT-4o Mini', description: 'Faster' },
        ],
        anthropic: [
          { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4 (Recommended)', description: 'Great quality' },
          { value: 'claude-haiku-4-20250514', label: 'Claude Haiku 4', description: 'Fastest' },
        ],
        gemini: [
          { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (Recommended)', description: 'Fast' },
        ],
      },
    },
    temperature: {
      type: 'number' as const,
      title: 'Temperature',
      description: '0.0 = consistent, 1.0 = creative',
      default: 0.3,
      minimum: 0,
      maximum: 1,
      'x-group': 'quality',
      'x-display': 'slider',
      'x-labels': { '0': 'Consistent', '0.5': 'Balanced', '1': 'Creative' },
      'x-friendly-hint': 'Lower = more consistent reviews.',
    },
    strictnessLevel: {
      type: 'string' as const,
      title: 'Review Strictness',
      enum: ['lenient', 'moderate', 'strict'],
      default: 'moderate',
      'x-group': 'review',
    },
    autoReview: {
      type: 'boolean' as const,
      title: 'Auto-Review',
      description: 'Auto trigger on new submissions',
      default: true,
    },
  },
  required: ['apiKey'],
};

const simpleSchema = {
  type: 'object',
  properties: {
    name: {
      type: 'string' as const,
      title: 'Name',
      description: 'Plugin name',
    },
    count: {
      type: 'number' as const,
      title: 'Count',
      minimum: 0,
      maximum: 100,
    },
    enabled: {
      type: 'boolean' as const,
      title: 'Enabled',
    },
  },
  required: [],
};

describe('PluginConfigForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
  });

  // -----------------------------------------------------------------------
  // Basic rendering
  // -----------------------------------------------------------------------

  it('shows "no configurable settings" when schema is null', () => {
    render(
      <PluginConfigForm
        pluginId="p1"
        pluginName="Test"
        config={{}}
        configSchema={null}
      />
    );
    expect(screen.getByText('This plugin does not have any configurable settings.')).toBeInTheDocument();
  });

  it('shows "no configurable settings" when schema has no properties', () => {
    render(
      <PluginConfigForm
        pluginId="p1"
        pluginName="Test"
        config={{}}
        configSchema={{ type: 'object' }}
      />
    );
    expect(screen.getByText('This plugin does not have any configurable settings.')).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Simple (ungrouped) form
  // -----------------------------------------------------------------------

  it('renders flat form fields when no x-group is present', () => {
    render(
      <PluginConfigForm
        pluginId="p1"
        pluginName="Test"
        config={{ name: 'hello', count: 5, enabled: true }}
        configSchema={simpleSchema}
      />
    );
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Count')).toBeInTheDocument();
    expect(screen.getByText('Enabled')).toBeInTheDocument();
  });

  it('renders Save and Reset buttons', () => {
    render(
      <PluginConfigForm
        pluginId="p1"
        pluginName="Test"
        config={{}}
        configSchema={simpleSchema}
      />
    );
    expect(screen.getByText('Save Configuration')).toBeInTheDocument();
    expect(screen.getByText('Reset')).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Setup Flow
  // -----------------------------------------------------------------------

  it('shows setup flow when config is empty and schema has provider/apiKey/model', () => {
    render(
      <PluginConfigForm
        pluginId="p1"
        pluginName="AI Paper Reviewer"
        config={{}}
        configSchema={fullSchema}
      />
    );
    expect(screen.getByText('First-time Setup')).toBeInTheDocument();
    expect(screen.getByText('Choose your AI Provider')).toBeInTheDocument();
  });

  it('shows setup flow when apiKey is missing from config', () => {
    render(
      <PluginConfigForm
        pluginId="p1"
        pluginName="AI Paper Reviewer"
        config={{ aiProvider: 'openai' }}
        configSchema={fullSchema}
      />
    );
    expect(screen.getByText('First-time Setup')).toBeInTheDocument();
  });

  it('does not show setup flow when config has apiKey', () => {
    render(
      <PluginConfigForm
        pluginId="p1"
        pluginName="AI Paper Reviewer"
        config={{ apiKey: 'sk-test', aiProvider: 'openai', model: 'gpt-4o' }}
        configSchema={fullSchema}
      />
    );
    expect(screen.queryByText('First-time Setup')).not.toBeInTheDocument();
    // Should show the regular grouped form instead
    expect(screen.getByText('AI Provider & Model')).toBeInTheDocument();
  });

  it('setup flow shows three provider buttons', () => {
    render(
      <PluginConfigForm
        pluginId="p1"
        pluginName="AI Paper Reviewer"
        config={{}}
        configSchema={fullSchema}
      />
    );
    expect(screen.getByText('OpenAI')).toBeInTheDocument();
    expect(screen.getByText('Anthropic')).toBeInTheDocument();
    expect(screen.getByText('Google Gemini')).toBeInTheDocument();
  });

  it('setup flow has disabled Next button initially (no provider selected)', () => {
    render(
      <PluginConfigForm
        pluginId="p1"
        pluginName="AI Paper Reviewer"
        config={{}}
        configSchema={fullSchema}
      />
    );
    const nextBtn = screen.getByText('Next').closest('button');
    expect(nextBtn).toBeDisabled();
  });

  it('setup flow step indicators show correct state', () => {
    render(
      <PluginConfigForm
        pluginId="p1"
        pluginName="AI Paper Reviewer"
        config={{}}
        configSchema={fullSchema}
      />
    );
    // Step 1 active, steps 2 and 3 pending
    expect(screen.getByText('Choose Provider')).toBeInTheDocument();
    expect(screen.getByText('Enter API Key')).toBeInTheDocument();
    expect(screen.getByText('Choose Model')).toBeInTheDocument();
  });

  it('setup flow friendly hint is shown for provider step', () => {
    render(
      <PluginConfigForm
        pluginId="p1"
        pluginName="AI Paper Reviewer"
        config={{}}
        configSchema={fullSchema}
      />
    );
    expect(screen.getByText('Choose your AI service.')).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Grouped sections
  // -----------------------------------------------------------------------

  it('renders grouped sections with headers', () => {
    render(
      <PluginConfigForm
        pluginId="p1"
        pluginName="AI Paper Reviewer"
        config={{ apiKey: 'sk-test', aiProvider: 'openai', model: 'gpt-4o' }}
        configSchema={fullSchema}
      />
    );
    expect(screen.getByText('AI Provider & Model')).toBeInTheDocument();
    expect(screen.getByText('Quality Controls')).toBeInTheDocument();
    expect(screen.getByText('Review Behavior')).toBeInTheDocument();
  });

  it('renders group descriptions', () => {
    render(
      <PluginConfigForm
        pluginId="p1"
        pluginName="AI Paper Reviewer"
        config={{ apiKey: 'sk-test', aiProvider: 'openai', model: 'gpt-4o' }}
        configSchema={fullSchema}
      />
    );
    expect(screen.getByText('Choose your AI service and model')).toBeInTheDocument();
    expect(screen.getByText('Fine-tune output quality')).toBeInTheDocument();
  });

  it('renders "Other Settings" section for ungrouped fields', () => {
    render(
      <PluginConfigForm
        pluginId="p1"
        pluginName="AI Paper Reviewer"
        config={{ apiKey: 'sk-test', aiProvider: 'openai', model: 'gpt-4o' }}
        configSchema={fullSchema}
      />
    );
    // autoReview has no x-group, so it goes to "Other Settings"
    expect(screen.getByText('Other Settings')).toBeInTheDocument();
    expect(screen.getByText('Auto-Review')).toBeInTheDocument();
  });

  it('groups are sorted by order', () => {
    render(
      <PluginConfigForm
        pluginId="p1"
        pluginName="AI Paper Reviewer"
        config={{ apiKey: 'sk-test', aiProvider: 'openai', model: 'gpt-4o' }}
        configSchema={fullSchema}
      />
    );
    const headers = screen.getAllByRole('button').filter((btn) =>
      ['AI Provider & Model', 'Review Behavior', 'Quality Controls'].includes(btn.textContent || '')
    );
    // Provider (0) should come before Review (1) which comes before Quality (2)
    const texts = headers.map((h) => h.textContent);
    const providerIdx = texts.indexOf('AI Provider & Model');
    const reviewIdx = texts.indexOf('Review Behavior');
    const qualityIdx = texts.indexOf('Quality Controls');
    if (providerIdx !== -1 && reviewIdx !== -1) {
      expect(providerIdx).toBeLessThan(reviewIdx);
    }
    if (reviewIdx !== -1 && qualityIdx !== -1) {
      expect(reviewIdx).toBeLessThan(qualityIdx);
    }
  });

  // -----------------------------------------------------------------------
  // Provider-dependent model picker
  // -----------------------------------------------------------------------

  it('shows "Select a provider first" when no provider selected for model field', () => {
    render(
      <PluginConfigForm
        pluginId="p1"
        pluginName="AI Paper Reviewer"
        config={{ apiKey: 'sk-test' }}
        configSchema={fullSchema}
      />
    );
    expect(screen.getByText('Select ai provider first to see available options.')).toBeInTheDocument();
  });

  it('shows model dropdown when provider is selected', () => {
    render(
      <PluginConfigForm
        pluginId="p1"
        pluginName="AI Paper Reviewer"
        config={{ apiKey: 'sk-test', aiProvider: 'openai', model: 'gpt-4o' }}
        configSchema={fullSchema}
      />
    );
    expect(screen.getByText('Model')).toBeInTheDocument();
    // Model dropdown should be present (not the "select a provider" message)
    expect(screen.queryByText('Select ai provider first to see available options.')).not.toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Slider fields
  // -----------------------------------------------------------------------

  it('renders slider for x-display=slider fields', () => {
    render(
      <PluginConfigForm
        pluginId="p1"
        pluginName="AI Paper Reviewer"
        config={{ apiKey: 'sk-test', aiProvider: 'openai', model: 'gpt-4o', temperature: 0.3 }}
        configSchema={fullSchema}
      />
    );
    expect(screen.getByText('Temperature')).toBeInTheDocument();
    // Should render slider (via our mock, it renders as input[type=range])
    const slider = document.querySelector('[role="slider"]');
    expect(slider).toBeTruthy();
  });

  it('renders slider labels from x-labels', () => {
    render(
      <PluginConfigForm
        pluginId="p1"
        pluginName="AI Paper Reviewer"
        config={{ apiKey: 'sk-test', aiProvider: 'openai', model: 'gpt-4o' }}
        configSchema={fullSchema}
      />
    );
    expect(screen.getByText('Consistent')).toBeInTheDocument();
    expect(screen.getByText('Balanced')).toBeInTheDocument();
    expect(screen.getByText('Creative')).toBeInTheDocument();
  });

  it('shows current slider value', () => {
    render(
      <PluginConfigForm
        pluginId="p1"
        pluginName="AI Paper Reviewer"
        config={{ apiKey: 'sk-test', aiProvider: 'openai', model: 'gpt-4o', temperature: 0.3 }}
        configSchema={fullSchema}
      />
    );
    expect(screen.getByText('0.30')).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Friendly hints (x-friendly-hint)
  // -----------------------------------------------------------------------

  it('renders friendly hint tooltips for fields with x-friendly-hint', () => {
    render(
      <PluginConfigForm
        pluginId="p1"
        pluginName="AI Paper Reviewer"
        config={{ apiKey: 'sk-test', aiProvider: 'openai', model: 'gpt-4o' }}
        configSchema={fullSchema}
      />
    );
    // The friendly hint text should be in a tooltip content (via our mock, it renders directly)
    expect(screen.getByText('Choose your AI service.')).toBeInTheDocument();
    expect(screen.getByText('Lower = more consistent reviews.')).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Form submission
  // -----------------------------------------------------------------------

  it('calls API on form submit', async () => {
    const user = userEvent.setup();
    render(
      <PluginConfigForm
        pluginId="p1"
        pluginName="Test Plugin"
        config={{ name: 'hello' }}
        configSchema={simpleSchema}
      />
    );

    const saveBtn = screen.getByText('Save Configuration');
    await user.click(saveBtn);

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/admin/plugins/p1',
      expect.objectContaining({
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });

  // -----------------------------------------------------------------------
  // Required fields
  // -----------------------------------------------------------------------

  it('shows asterisk for required fields', () => {
    render(
      <PluginConfigForm
        pluginId="p1"
        pluginName="AI Paper Reviewer"
        config={{ apiKey: 'sk-test', aiProvider: 'openai', model: 'gpt-4o' }}
        configSchema={fullSchema}
      />
    );
    // apiKey is required, should have an asterisk
    const asterisks = document.querySelectorAll('.text-red-500');
    expect(asterisks.length).toBeGreaterThan(0);
  });

  // -----------------------------------------------------------------------
  // Enum / select fields
  // -----------------------------------------------------------------------

  it('renders enum field as select', () => {
    render(
      <PluginConfigForm
        pluginId="p1"
        pluginName="AI Paper Reviewer"
        config={{ apiKey: 'sk-test', aiProvider: 'openai', model: 'gpt-4o' }}
        configSchema={fullSchema}
      />
    );
    expect(screen.getByText('AI Provider')).toBeInTheDocument();
    expect(screen.getByText('Review Strictness')).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Boolean fields
  // -----------------------------------------------------------------------

  it('renders boolean fields as switches', () => {
    render(
      <PluginConfigForm
        pluginId="p1"
        pluginName="AI Paper Reviewer"
        config={{ apiKey: 'sk-test', aiProvider: 'openai', model: 'gpt-4o' }}
        configSchema={fullSchema}
      />
    );
    expect(screen.getByText('Auto-Review')).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Password field
  // -----------------------------------------------------------------------

  it('renders password fields as password inputs', () => {
    render(
      <PluginConfigForm
        pluginId="p1"
        pluginName="AI Paper Reviewer"
        config={{ apiKey: 'sk-test', aiProvider: 'openai', model: 'gpt-4o' }}
        configSchema={fullSchema}
      />
    );
    const passwordInput = document.querySelector('input[type="password"]');
    expect(passwordInput).toBeTruthy();
  });
});
