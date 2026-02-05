'use client';

/**
 * PluginSlot Component
 * @version 1.5.0
 *
 * Renders all registered plugin components for a given slot.
 * Each component is wrapped in an error boundary to isolate failures.
 */

import React, { Suspense, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { PluginErrorBoundary } from './plugin-error-boundary';
import { getSlotRegistry } from '@/lib/plugins/slots';
import type { SlotName } from '@/lib/plugins/slots';
import type { ClientPluginContext, SerializableClientPluginContext } from '@/lib/plugins/types';

/**
 * Enrich a serializable context with the fetch function.
 * This is needed because functions can't be passed from Server to Client Components.
 */
function enrichContext(ctx: SerializableClientPluginContext): ClientPluginContext {
  return {
    ...ctx,
    api: {
      ...ctx.api,
      fetch: async (path: string, options?: RequestInit): Promise<Response> => {
        const normalizedPath = path.startsWith('/') ? path : `/${path}`;
        return fetch(`${ctx.api.baseUrl}${normalizedPath}`, {
          ...options,
          credentials: 'include',
        });
      },
    },
  };
}

export interface PluginSlotProps {
  /** The slot name to render components for */
  name: SlotName;
  /** Contextual data to pass to plugin components */
  data?: Record<string, unknown>;
  /** Optional CSS class for the container */
  className?: string;
}

/**
 * Renders all plugin components registered to a given slot.
 * Each component is isolated with an error boundary and Suspense.
 */
export function PluginSlot({ name, data, className }: PluginSlotProps) {
  const registry = getSlotRegistry();
  const components = registry.getSlotComponents(name);

  // Memoize enriched contexts to avoid recreating on every render
  const enrichedComponents = useMemo(() => {
    return components.map(registration => ({
      ...registration,
      enrichedContext: enrichContext(registration.context),
    }));
  }, [components]);

  if (enrichedComponents.length === 0) {
    return null;
  }

  return (
    <div className={className} data-plugin-slot={name}>
      {enrichedComponents.map((registration, index) => (
        <PluginErrorBoundary
          key={`${registration.pluginName}-${registration.slot}-${index}`}
          pluginName={registration.pluginName}
        >
          <Suspense
            fallback={
              <Skeleton className="h-24 w-full rounded-md" />
            }
          >
            <registration.component context={registration.enrichedContext} data={data} />
          </Suspense>
        </PluginErrorBoundary>
      ))}
    </div>
  );
}
