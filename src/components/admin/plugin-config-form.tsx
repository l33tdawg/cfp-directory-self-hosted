'use client';

/**
 * Plugin Config Form Component
 *
 * Dynamically renders a form based on the plugin's JSON Schema
 * config definition. Supports string, number, boolean, and enum types.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Loader2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

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
}

interface ConfigSchema {
  type: string;
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
  title?: string;
  description?: string;
}

interface PluginConfigFormProps {
  pluginId: string;
  pluginName: string;
  config: Record<string, unknown>;
  configSchema: ConfigSchema | null;
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

  if (!configSchema || !configSchema.properties) {
    return (
      <div className="text-sm text-slate-500 dark:text-slate-400 py-4">
        This plugin does not have any configurable settings.
      </div>
    );
  }

  const properties = configSchema.properties;
  const requiredFields = new Set(configSchema.required || []);

  const handleFieldChange = (key: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
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

  const renderField = (key: string, schema: JSONSchemaProperty) => {
    const value = formData[key] ?? schema.default ?? '';
    const isRequired = requiredFields.has(key);
    const label = schema.title || key;

    // Enum/select
    if (schema.enum && schema.enum.length > 0) {
      return (
        <div key={key} className="space-y-2">
          <Label htmlFor={key}>
            {label}
            {isRequired && <span className="text-red-500 ml-1">*</span>}
          </Label>
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
            <Label htmlFor={key}>{label}</Label>
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

    // Number
    if (schema.type === 'number') {
      return (
        <div key={key} className="space-y-2">
          <Label htmlFor={key}>
            {label}
            {isRequired && <span className="text-red-500 ml-1">*</span>}
          </Label>
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
          <Label htmlFor={key}>
            {label}
            {isRequired && <span className="text-red-500 ml-1">*</span>}
          </Label>
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
        <Label htmlFor={key}>
          {label}
          {isRequired && <span className="text-red-500 ml-1">*</span>}
        </Label>
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {configSchema.description && (
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {configSchema.description}
        </p>
      )}

      <div className="space-y-4">
        {Object.entries(properties).map(([key, schema]) =>
          renderField(key, schema)
        )}
      </div>

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
