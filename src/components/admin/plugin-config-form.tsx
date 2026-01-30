'use client';

/**
 * Plugin Config Form Component
 *
 * Dynamically renders a form based on the plugin's JSON Schema
 * config definition. Supports grouped sections, provider-dependent
 * model picker, slider fields, friendly hints, dynamic API-based
 * options fetching, and a guided first-time setup flow.
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Save,
  Loader2,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Info,
  ArrowRight,
  Check,
  Sparkles,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ModelOption {
  value: string;
  label: string;
  description?: string;
}

interface XOptionsApi {
  action: string;
  params?: Record<string, string>;
  dependsOnFields?: string[];
  cacheSeconds?: number;
  loadingText?: string;
  errorBehavior?: 'show-error-with-fallback' | 'show-error-only' | 'fallback-only';
}

interface JSONSchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  title?: string;
  description?: string;
  default?: unknown;
  enum?: unknown[];
  format?: string;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  // Custom extensions
  'x-group'?: string;
  'x-friendly-hint'?: string;
  'x-depends-on'?: string | string[];
  'x-options'?: Record<string, ModelOption[]>;
  'x-options-api'?: XOptionsApi;
  'x-display'?: string;
  'x-labels'?: Record<string, string>;
}

interface ConfigSchema {
  type: string;
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
  title?: string;
  description?: string;
  'x-groups'?: Record<string, { title: string; description?: string; order?: number }>;
}

interface PluginConfigFormProps {
  pluginId: string;
  pluginName: string;
  config: Record<string, unknown>;
  configSchema: ConfigSchema | null;
}

// ---------------------------------------------------------------------------
// Group Definitions
// ---------------------------------------------------------------------------

const DEFAULT_GROUP_META: Record<string, { title: string; description?: string; order: number }> = {
  provider: { title: 'AI Provider & Model', description: 'Choose your AI service and model', order: 0 },
  review: { title: 'Review Behavior', description: 'Control how reviews are generated', order: 1 },
  quality: { title: 'Quality Controls', description: 'Fine-tune output quality and confidence', order: 2 },
  automation: { title: 'Automation', description: 'Automatic review triggers and cooldowns', order: 3 },
  detection: { title: 'Advanced Detection', description: 'Duplicate detection and speaker research', order: 4 },
};

// ---------------------------------------------------------------------------
// Setup Flow Component
// ---------------------------------------------------------------------------

interface SetupFlowProps {
  properties: Record<string, JSONSchemaProperty>;
  formData: Record<string, unknown>;
  requiredFields: Set<string>;
  onFieldChange: (key: string, value: unknown) => void;
  onComplete: () => void;
}

function SetupFlow({ properties, formData, onFieldChange, onComplete }: SetupFlowProps) {
  const [step, setStep] = useState(0);

  const providerSchema = properties.aiProvider;
  const apiKeySchema = properties.apiKey;
  const modelSchema = properties.model;

  const providerValue = formData.aiProvider as string | undefined;
  const apiKeyValue = formData.apiKey as string | undefined;
  const modelValue = formData.model as string | undefined;

  const steps = [
    { label: 'Choose Provider', key: 'aiProvider' },
    { label: 'Enter API Key', key: 'apiKey' },
    { label: 'Choose Model', key: 'model' },
  ];

  const canAdvance = () => {
    if (step === 0) return !!providerValue;
    if (step === 1) return !!apiKeyValue && apiKeyValue.length > 0;
    if (step === 2) return !!modelValue;
    return false;
  };

  const modelOptions = useMemo(() => {
    if (!modelSchema?.['x-options'] || !providerValue) return [];
    return modelSchema['x-options'][providerValue] || [];
  }, [modelSchema, providerValue]);

  return (
    <div className="space-y-6">
      {/* Step indicators */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                i < step
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                  : i === step
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
              }`}
            >
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span
              className={`text-sm hidden sm:inline ${
                i === step
                  ? 'font-medium text-slate-900 dark:text-white'
                  : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <ArrowRight className="h-4 w-4 text-slate-300 dark:text-slate-600" />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-6">
        {step === 0 && providerSchema && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Choose your AI Provider
            </h3>
            {providerSchema['x-friendly-hint'] && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {providerSchema['x-friendly-hint']}
              </p>
            )}
            <div className="grid gap-3 sm:grid-cols-3">
              {(providerSchema.enum || []).map((opt) => {
                const val = String(opt);
                const labels: Record<string, string> = {
                  openai: 'OpenAI',
                  anthropic: 'Anthropic',
                  gemini: 'Google Gemini',
                };
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => {
                      onFieldChange('aiProvider', val);
                      // Reset model when provider changes
                      onFieldChange('model', '');
                    }}
                    className={`rounded-lg border-2 p-4 text-left transition-all ${
                      providerValue === val
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-400'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <p className="font-medium text-slate-900 dark:text-white">
                      {labels[val] || val}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 1 && apiKeySchema && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Enter your API Key
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {apiKeySchema['x-friendly-hint'] || apiKeySchema.description || 'Paste your API key from the provider dashboard.'}
            </p>
            <Input
              type="password"
              value={String(apiKeyValue || '')}
              onChange={(e) => onFieldChange('apiKey', e.target.value)}
              placeholder="sk-..."
              required
            />
          </div>
        )}

        {step === 2 && modelSchema && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Choose a Model
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {modelSchema['x-friendly-hint'] || 'Select the AI model to use for reviews.'}
            </p>
            <div className="grid gap-3">
              {modelOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onFieldChange('model', opt.value)}
                  className={`rounded-lg border-2 p-4 text-left transition-all ${
                    modelValue === opt.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-400'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <p className="font-medium text-slate-900 dark:text-white">
                    {opt.label}
                  </p>
                  {opt.description && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                      {opt.description}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
        >
          Back
        </Button>
        {step < steps.length - 1 ? (
          <Button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            disabled={!canAdvance()}
          >
            Next
            <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={onComplete}
            disabled={!canAdvance()}
          >
            <Sparkles className="h-4 w-4 mr-1.5" />
            Complete Setup
          </Button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Form Component
// ---------------------------------------------------------------------------

interface DynamicOptionsState {
  loading: boolean;
  error: string | null;
  options: ModelOption[];
  lastFetchKey: string | null;
}

export function PluginConfigForm({
  pluginId,
  pluginName,
  config,
  configSchema,
}: PluginConfigFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<Record<string, unknown>>(config);
  const [isSaving, setIsSaving] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [showSetupFlow, setShowSetupFlow] = useState(() => {
    // Show setup flow when config is empty or has no apiKey
    return !config || Object.keys(config).length === 0 || !config.apiKey;
  });

  // State for dynamic options fetching (keyed by field name)
  const [dynamicOptions, setDynamicOptions] = useState<Record<string, DynamicOptionsState>>({});

  const properties = useMemo(
    () => configSchema?.properties || {},
    [configSchema]
  );
  const requiredFields = useMemo(
    () => new Set(configSchema?.required || []),
    [configSchema]
  );

  // Function to fetch dynamic options from plugin action
  const fetchDynamicOptions = useCallback(async (
    fieldKey: string,
    optionsApi: XOptionsApi,
    currentFormData: Record<string, unknown>
  ) => {
    // Build the fetch key based on dependent fields
    const dependsOnFields = optionsApi.dependsOnFields || [];
    const fetchKey = dependsOnFields.map(f => `${f}:${currentFormData[f]}`).join('|');

    // Check if all dependent fields have values
    const hasAllDependencies = dependsOnFields.every(f => {
      const val = currentFormData[f];
      return val !== undefined && val !== null && val !== '';
    });

    if (!hasAllDependencies) {
      setDynamicOptions(prev => ({
        ...prev,
        [fieldKey]: { loading: false, error: null, options: [], lastFetchKey: null }
      }));
      return;
    }

    // Check if we already fetched with these values
    const currentState = dynamicOptions[fieldKey];
    if (currentState?.lastFetchKey === fetchKey && !currentState.error) {
      return; // Already fetched with same params
    }

    // Set loading state
    setDynamicOptions(prev => ({
      ...prev,
      [fieldKey]: { loading: true, error: null, options: prev[fieldKey]?.options || [], lastFetchKey: fetchKey }
    }));

    try {
      // Build action params from template strings
      const params: Record<string, string> = {};
      if (optionsApi.params) {
        for (const [key, value] of Object.entries(optionsApi.params)) {
          // Replace ${fieldName} with actual values
          const resolved = value.replace(/\$\{(\w+)\}/g, (_, field) =>
            String(currentFormData[field] || '')
          );
          params[key] = resolved;
        }
      }

      const response = await fetch(`/api/plugins/${pluginId}/actions/${optionsApi.action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const errorMessage = data.error?.message || data.error || 'Failed to fetch options';
        setDynamicOptions(prev => ({
          ...prev,
          [fieldKey]: { loading: false, error: errorMessage, options: [], lastFetchKey: fetchKey }
        }));
        return;
      }

      setDynamicOptions(prev => ({
        ...prev,
        [fieldKey]: { loading: false, error: null, options: data.models || [], lastFetchKey: fetchKey }
      }));
    } catch (err) {
      setDynamicOptions(prev => ({
        ...prev,
        [fieldKey]: {
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to fetch options',
          options: [],
          lastFetchKey: fetchKey
        }
      }));
    }
  }, [pluginId, dynamicOptions]);

  // Effect to fetch dynamic options when dependencies change
  useEffect(() => {
    for (const [key, schema] of Object.entries(properties)) {
      if (schema['x-options-api']) {
        fetchDynamicOptions(key, schema['x-options-api'], formData);
      }
    }
  }, [properties, formData, fetchDynamicOptions]);

  const handleFieldChange = (key: string, value: unknown) => {
    setFormData((prev) => {
      const next = { ...prev, [key]: value };
      // When provider changes, reset model
      if (key === 'aiProvider') {
        const modelSchema = properties.model;
        if (modelSchema?.['x-options']) {
          const providerOptions = modelSchema['x-options'][value as string];
          // Auto-select first (recommended) model
          if (providerOptions?.length) {
            next.model = providerOptions[0].value;
          } else {
            next.model = '';
          }
        }
      }
      return next;
    });
  };

  const handleReset = () => {
    setFormData(config);
    toast.info('Configuration reset to saved values');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const response = await fetch(`/api/admin/plugins/${pluginId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: formData }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save configuration');
      }

      toast.success(`Configuration saved for ${pluginName}`);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to save configuration'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const toggleGroup = (group: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) {
        next.delete(group);
      } else {
        next.add(group);
      }
      return next;
    });
  };

  // -----------------------------------------------------------------------
  // Field rendering
  // -----------------------------------------------------------------------

  const renderFriendlyHint = (schema: JSONSchemaProperty) => {
    if (!schema['x-friendly-hint']) return null;
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help inline-block ml-1.5" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            {schema['x-friendly-hint']}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const renderSliderField = (key: string, schema: JSONSchemaProperty) => {
    const value = formData[key] ?? schema.default ?? 0;
    const min = schema.minimum ?? 0;
    const max = schema.maximum ?? 1;
    const step = max <= 1 ? 0.05 : 1;
    const labels = schema['x-labels'] || {};
    const isRequired = requiredFields.has(key);
    const label = schema.title || key;

    return (
      <div key={key} className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Label htmlFor={key}>
              {label}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {renderFriendlyHint(schema)}
          </div>
          <span className="text-sm font-mono text-slate-600 dark:text-slate-400">
            {Number(value).toFixed(max <= 1 ? 2 : 0)}
          </span>
        </div>
        {schema.description && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {schema.description}
          </p>
        )}
        <Slider
          id={key}
          value={[Number(value)]}
          min={min}
          max={max}
          step={step}
          onValueChange={([v]) => handleFieldChange(key, v)}
        />
        {Object.keys(labels).length > 0 && (
          <div className="flex justify-between text-xs text-slate-400 dark:text-slate-500">
            {Object.entries(labels).map(([pos, text]) => (
              <span key={pos}>{text}</span>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderDependentField = (key: string, schema: JSONSchemaProperty) => {
    const dependsOn = schema['x-depends-on'];
    const dependsOnFields = Array.isArray(dependsOn) ? dependsOn : [dependsOn!];
    const primaryDependsOn = dependsOnFields[0];
    const parentValue = formData[primaryDependsOn] as string | undefined;

    // Determine options source: dynamic API or static x-options
    const optionsApi = schema['x-options-api'];
    const staticOptions = schema['x-options'] || {};
    const dynamicState = dynamicOptions[key];

    // Get current options (prefer dynamic if available, fallback to static)
    let currentOptions: ModelOption[] = [];
    let isLoading = false;
    let fetchError: string | null = null;

    if (optionsApi) {
      // Using dynamic API options
      isLoading = dynamicState?.loading || false;
      fetchError = dynamicState?.error || null;

      if (dynamicState?.options && dynamicState.options.length > 0) {
        currentOptions = dynamicState.options;
      } else if (fetchError && optionsApi.errorBehavior !== 'show-error-only') {
        // Fallback to static options on error
        currentOptions = parentValue ? (staticOptions[parentValue] || []) : [];
      }
    } else {
      // Using static options
      currentOptions = parentValue ? (staticOptions[parentValue] || []) : [];
    }

    const value = formData[key] as string | undefined;
    const isRequired = requiredFields.has(key);
    const label = schema.title || key;

    // Check if all dependencies have values
    const hasAllDependencies = dependsOnFields.every(f => {
      const val = formData[f];
      return val !== undefined && val !== null && val !== '';
    });

    if (!hasAllDependencies) {
      const missingFields = dependsOnFields.filter(f => !formData[f]).map(f => {
        const fieldSchema = properties[f];
        return fieldSchema?.title || f;
      });

      return (
        <div key={key} className="space-y-2">
          <div className="flex items-center">
            <Label htmlFor={key}>
              {label}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {renderFriendlyHint(schema)}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {missingFields.length === 1
              ? `Select ${missingFields[0].toLowerCase()} first to see available options.`
              : `Configure ${missingFields.join(' and ')} first to see available options.`}
          </p>
        </div>
      );
    }

    // Retry handler for fetch errors
    const handleRetry = () => {
      if (optionsApi) {
        // Clear the last fetch key to force a refetch
        setDynamicOptions(prev => ({
          ...prev,
          [key]: { ...prev[key], lastFetchKey: null, error: null }
        }));
        fetchDynamicOptions(key, optionsApi, formData);
      }
    };

    return (
      <div key={key} className="space-y-2">
        <div className="flex items-center">
          <Label htmlFor={key}>
            {label}
            {isRequired && <span className="text-red-500 ml-1">*</span>}
          </Label>
          {renderFriendlyHint(schema)}
        </div>
        {schema.description && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {schema.description}
          </p>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 py-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{optionsApi?.loadingText || 'Loading models from provider...'}</span>
          </div>
        )}

        {/* Error state */}
        {fetchError && !isLoading && (
          <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  {fetchError}
                </p>
                {currentOptions.length > 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    Using fallback options. Fix your API key to see all available models.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={handleRetry}
                className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100"
              >
                <RefreshCw className="h-3 w-3" />
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Select dropdown */}
        {!isLoading && (currentOptions.length > 0 || !fetchError) && (
          <Select
            value={value || ''}
            onValueChange={(v) => handleFieldChange(key, v)}
            disabled={isLoading}
          >
            <SelectTrigger id={key}>
              <SelectValue placeholder={isLoading ? 'Loading...' : 'Select a model...'} />
            </SelectTrigger>
            <SelectContent>
              {currentOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  <div>
                    <span>{opt.label}</span>
                    {opt.description && (
                      <span className="ml-2 text-xs text-slate-400">
                        — {opt.description}
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
              {currentOptions.length === 0 && !fetchError && (
                <div className="px-2 py-1.5 text-sm text-slate-500">
                  No models available
                </div>
              )}
            </SelectContent>
          </Select>
        )}
      </div>
    );
  };

  const renderField = (key: string, schema: JSONSchemaProperty) => {
    // Slider display
    if (schema['x-display'] === 'slider') {
      return renderSliderField(key, schema);
    }

    // Dependent field (e.g. model depends on aiProvider)
    // Supports both static x-options and dynamic x-options-api
    if (schema['x-depends-on'] && (schema['x-options'] || schema['x-options-api'])) {
      return renderDependentField(key, schema);
    }

    const value = formData[key] ?? schema.default ?? '';
    const isRequired = requiredFields.has(key);
    const label = schema.title || key;

    // Enum/select
    if (schema.enum && schema.enum.length > 0) {
      return (
        <div key={key} className="space-y-2">
          <div className="flex items-center">
            <Label htmlFor={key}>
              {label}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {renderFriendlyHint(schema)}
          </div>
          {schema.description && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {schema.description}
            </p>
          )}
          <Select
            value={String(value)}
            onValueChange={(v) => handleFieldChange(key, v)}
          >
            <SelectTrigger id={key}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {schema.enum.map((option) => (
                <SelectItem key={String(option)} value={String(option)}>
                  {String(option)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    // Boolean
    if (schema.type === 'boolean') {
      return (
        <div key={key} className="flex items-center justify-between py-2">
          <div>
            <div className="flex items-center">
              <Label htmlFor={key}>{label}</Label>
              {renderFriendlyHint(schema)}
            </div>
            {schema.description && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {schema.description}
              </p>
            )}
          </div>
          <Switch
            id={key}
            checked={Boolean(value)}
            onCheckedChange={(v) => handleFieldChange(key, v)}
          />
        </div>
      );
    }

    // Number (non-slider)
    if (schema.type === 'number') {
      return (
        <div key={key} className="space-y-2">
          <div className="flex items-center">
            <Label htmlFor={key}>
              {label}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {renderFriendlyHint(schema)}
          </div>
          {schema.description && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {schema.description}
            </p>
          )}
          <Input
            id={key}
            type="number"
            value={value === '' ? '' : Number(value)}
            onChange={(e) =>
              handleFieldChange(
                key,
                e.target.value === '' ? '' : Number(e.target.value)
              )
            }
            min={schema.minimum}
            max={schema.maximum}
            required={isRequired}
          />
        </div>
      );
    }

    // String (with format detection for textarea)
    const isTextarea =
      schema.format === 'textarea' ||
      (schema.maxLength && schema.maxLength > 200);

    if (isTextarea) {
      return (
        <div key={key} className="space-y-2">
          <div className="flex items-center">
            <Label htmlFor={key}>
              {label}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {renderFriendlyHint(schema)}
          </div>
          {schema.description && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {schema.description}
            </p>
          )}
          <Textarea
            id={key}
            value={String(value)}
            onChange={(e) => handleFieldChange(key, e.target.value)}
            minLength={schema.minLength}
            maxLength={schema.maxLength}
            required={isRequired}
            rows={4}
          />
        </div>
      );
    }

    // Default: text input
    return (
      <div key={key} className="space-y-2">
        <div className="flex items-center">
          <Label htmlFor={key}>
            {label}
            {isRequired && <span className="text-red-500 ml-1">*</span>}
          </Label>
          {renderFriendlyHint(schema)}
        </div>
        {schema.description && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {schema.description}
          </p>
        )}
        <Input
          id={key}
          type={schema.format === 'password' ? 'password' : 'text'}
          value={String(value)}
          onChange={(e) => handleFieldChange(key, e.target.value)}
          minLength={schema.minLength}
          maxLength={schema.maxLength}
          required={isRequired}
        />
      </div>
    );
  };

  // -----------------------------------------------------------------------
  // Group fields (must be above early return to satisfy Rules of Hooks)
  // -----------------------------------------------------------------------

  const groupedFields = useMemo(() => {
    const groups: Record<string, { key: string; schema: JSONSchemaProperty }[]> = {};
    const ungrouped: { key: string; schema: JSONSchemaProperty }[] = [];

    for (const [key, schema] of Object.entries(properties)) {
      const group = schema['x-group'];
      if (group) {
        if (!groups[group]) groups[group] = [];
        groups[group].push({ key, schema });
      } else {
        ungrouped.push({ key, schema });
      }
    }

    return { groups, ungrouped };
  }, [properties]);

  const hasGroups = Object.keys(groupedFields.groups).length > 0;

  // Merge custom group metadata from schema with defaults
  const groupMeta = configSchema?.['x-groups'] || {};
  const getGroupMeta = (group: string) => ({
    ...DEFAULT_GROUP_META[group],
    ...groupMeta[group],
  });

  const sortedGroupNames = Object.keys(groupedFields.groups).sort((a, b) => {
    const aOrder = getGroupMeta(a).order ?? 99;
    const bOrder = getGroupMeta(b).order ?? 99;
    return aOrder - bOrder;
  });

  // -----------------------------------------------------------------------
  // Early return: no configurable settings
  // -----------------------------------------------------------------------

  if (!configSchema || !configSchema.properties) {
    return (
      <div className="text-sm text-slate-500 dark:text-slate-400 py-4">
        This plugin does not have any configurable settings.
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Setup flow for first-time config
  // -----------------------------------------------------------------------

  if (showSetupFlow && hasGroups && properties.aiProvider && properties.apiKey && properties.model) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
          <Sparkles className="h-4 w-4" />
          <span className="font-medium">First-time Setup</span>
        </div>
        <SetupFlow
          properties={properties}
          formData={formData}
          requiredFields={requiredFields}
          onFieldChange={handleFieldChange}
          onComplete={() => setShowSetupFlow(false)}
        />
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Full form with grouped sections
  // -----------------------------------------------------------------------

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {configSchema?.description && (
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {configSchema.description}
        </p>
      )}

      {hasGroups ? (
        <div className="space-y-4">
          {sortedGroupNames.map((group) => {
            const meta = getGroupMeta(group);
            const fields = groupedFields.groups[group];
            const isCollapsed = collapsedGroups.has(group);

            return (
              <Collapsible
                key={group}
                open={!isCollapsed}
                onOpenChange={() => toggleGroup(group)}
              >
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors text-left"
                    >
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                          {meta.title || group}
                        </h3>
                        {meta.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {meta.description}
                          </p>
                        )}
                      </div>
                      {isCollapsed ? (
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      )}
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="p-4 space-y-4 bg-white dark:bg-slate-950">
                      {fields.map(({ key, schema }) => renderField(key, schema))}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}

          {/* Ungrouped fields */}
          {groupedFields.ungrouped.length > 0 && (
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="p-4 bg-slate-50 dark:bg-slate-900/50">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Other Settings
                </h3>
              </div>
              <div className="p-4 space-y-4 bg-white dark:bg-slate-950">
                {groupedFields.ungrouped.map(({ key, schema }) =>
                  renderField(key, schema)
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(properties).map(([key, schema]) =>
            renderField(key, schema)
          )}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
        <Button
          type="button"
          variant="outline"
          onClick={handleReset}
          disabled={isSaving}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Configuration
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
