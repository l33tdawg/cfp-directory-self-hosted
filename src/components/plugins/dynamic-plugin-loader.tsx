'use client';

/**
 * Dynamic Plugin Loader
 *
 * Loads pre-compiled plugin admin components via script tags.
 * The bundle is an IIFE that assigns exports to a global variable.
 */

import React, { useEffect, useState, useRef } from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import { Loader2, AlertTriangle } from 'lucide-react';
import type { PluginComponentProps } from '@/lib/plugins/types';

// Expose React globally for plugin bundles
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__PLUGIN_REACT__ = React;
  (window as unknown as Record<string, unknown>).__PLUGIN_JSX_RUNTIME__ = jsxRuntime;
}

interface DynamicPluginLoaderProps {
  pluginName: string;
  componentName: string;
  context: PluginComponentProps['context'];
}

type PluginComponent = React.ComponentType<PluginComponentProps>;

// Track loaded scripts to avoid duplicate loading
const loadedScripts = new Set<string>();

export function DynamicPluginLoader({
  pluginName,
  componentName,
  context,
}: DynamicPluginLoaderProps) {
  const [Component, setComponent] = useState<PluginComponent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadAttempted = useRef(false);

  useEffect(() => {
    if (loadAttempted.current) return;
    loadAttempted.current = true;

    async function loadComponent() {
      try {
        const globalName = `__PLUGIN_${pluginName.replace(/-/g, '_').toUpperCase()}__`;
        const win = window as unknown as Record<string, Record<string, PluginComponent>>;

        // Check if already loaded
        if (win[globalName] && win[globalName][componentName]) {
          setComponent(() => win[globalName][componentName]);
          setLoading(false);
          return;
        }

        // Load the script if not already loaded
        const scriptUrl = `/api/plugins/${pluginName}/admin-bundle`;

        if (!loadedScripts.has(pluginName)) {
          // Fetch and execute the script
          const response = await fetch(scriptUrl);
          if (!response.ok) {
            throw new Error(`Failed to load bundle: ${response.status} ${response.statusText}`);
          }

          const scriptContent = await response.text();

          // Execute the script
          const script = document.createElement('script');
          script.textContent = scriptContent;
          document.head.appendChild(script);

          loadedScripts.add(pluginName);
        }

        // Wait a tick for script to execute
        await new Promise(resolve => setTimeout(resolve, 0));

        // Get the component from the global
        if (win[globalName] && win[globalName][componentName]) {
          setComponent(() => win[globalName][componentName]);
        } else {
          const available = win[globalName] ? Object.keys(win[globalName]).join(', ') : 'none';
          throw new Error(`Component "${componentName}" not found. Available: ${available}`);
        }

        setLoading(false);
      } catch (err) {
        console.error('[DynamicPluginLoader] Error loading component:', err);
        setError(err instanceof Error ? err.message : 'Failed to load component');
        setLoading(false);
      }
    }

    loadComponent();
  }, [pluginName, componentName]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-3 text-muted-foreground">Loading plugin component...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 rounded-lg">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
          <div>
            <h3 className="font-semibold text-red-800 dark:text-red-200">
              Failed to Load Plugin Component
            </h3>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!Component) {
    return (
      <div className="p-6 border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 rounded-lg">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          <div>
            <h3 className="font-semibold text-amber-800 dark:text-amber-200">
              Component Not Found
            </h3>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              The component &quot;{componentName}&quot; was not found in the plugin bundle.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <Component context={context} />;
}
