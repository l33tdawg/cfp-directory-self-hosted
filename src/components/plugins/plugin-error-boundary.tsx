'use client';

/**
 * Plugin Error Boundary
 * @version 1.4.0
 *
 * Catches errors in plugin component rendering to prevent
 * plugin crashes from breaking the host page.
 */

import React from 'react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface PluginErrorBoundaryProps {
  /** Name of the plugin (for error display) */
  pluginName: string;
  /** Children to render */
  children: React.ReactNode;
}

interface PluginErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class PluginErrorBoundary extends React.Component<
  PluginErrorBoundaryProps,
  PluginErrorBoundaryState
> {
  constructor(props: PluginErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): PluginErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error(
      `[Plugin: ${this.props.pluginName}] Component error:`,
      error,
      errorInfo.componentStack
    );
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <Alert variant="destructive" data-testid="plugin-error-boundary-fallback">
          <AlertTitle>Plugin Error: {this.props.pluginName}</AlertTitle>
          <AlertDescription>
            <p className="mb-2">
              The plugin encountered an error and could not render.
            </p>
            {this.state.error && (
              <p className="text-xs font-mono mb-2 opacity-75">
                {this.state.error.message}
              </p>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={this.handleRetry}
              data-testid="plugin-error-retry"
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      );
    }

    return this.props.children;
  }
}
