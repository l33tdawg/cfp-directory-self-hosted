'use client';

/**
 * Plugin Renderer Component
 *
 * Renders plugin admin pages via an iframe to isolate them from the main app.
 * This allows plugin components with React hooks to work properly.
 */

import React from 'react';
import type { PluginComponentProps } from '@/lib/plugins/types';

interface PluginRendererProps {
  pluginName: string;
  pagePath: string;
  context: PluginComponentProps['context'];
  children?: React.ReactNode;
}

export function PluginRenderer({
  pluginName,
  pagePath,
}: PluginRendererProps) {
  // Render plugin admin page in an iframe to avoid SSR/hook issues
  // Use pluginName as the identifier since the API supports both id and name lookup
  const iframeSrc = `/api/plugins/${pluginName}/render?path=${encodeURIComponent(pagePath)}`;

  return (
    <div className="w-full min-h-[400px] border rounded-lg overflow-hidden bg-background">
      <iframe
        src={iframeSrc}
        className="w-full h-full min-h-[400px] border-0"
        title={`${pluginName} admin page`}
      />
    </div>
  );
}
