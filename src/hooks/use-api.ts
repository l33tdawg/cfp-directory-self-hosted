/**
 * API Hooks
 * 
 * React hooks for API calls with loading and error states.
 */

'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: Record<string, string[]>;
  meta?: {
    total?: number;
    limit?: number;
    offset?: number;
  };
}

interface UseApiOptions {
  onSuccess?: (data: unknown) => void;
  onError?: (error: string) => void;
  showErrorToast?: boolean;
}

export function useApi<T = unknown>(options: UseApiOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]> | null>(null);

  const execute = useCallback(
    async (
      url: string,
      init?: RequestInit
    ): Promise<{ data: T | null; error: string | null }> => {
      setIsLoading(true);
      setError(null);
      setErrors(null);

      try {
        const response = await fetch(url, {
          ...init,
          headers: {
            'Content-Type': 'application/json',
            ...init?.headers,
          },
        });

        // Handle 204 No Content
        if (response.status === 204) {
          setIsLoading(false);
          options.onSuccess?.(null);
          return { data: null, error: null };
        }

        const result: ApiResponse<T> = await response.json();

        if (!response.ok || !result.success) {
          const errorMessage = result.error || 'An error occurred';
          setError(errorMessage);
          if (result.errors) {
            setErrors(result.errors);
          }
          if (options.showErrorToast !== false) {
            toast.error(errorMessage);
          }
          options.onError?.(errorMessage);
          setIsLoading(false);
          return { data: null, error: errorMessage };
        }

        setIsLoading(false);
        options.onSuccess?.(result.data);
        return { data: result.data as T, error: null };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Network error';
        setError(errorMessage);
        if (options.showErrorToast !== false) {
          toast.error(errorMessage);
        }
        options.onError?.(errorMessage);
        setIsLoading(false);
        return { data: null, error: errorMessage };
      }
    },
    [options]
  );

  const get = useCallback(
    (url: string) => execute(url, { method: 'GET' }),
    [execute]
  );

  const post = useCallback(
    (url: string, data: unknown) =>
      execute(url, { method: 'POST', body: JSON.stringify(data) }),
    [execute]
  );

  const patch = useCallback(
    (url: string, data: unknown) =>
      execute(url, { method: 'PATCH', body: JSON.stringify(data) }),
    [execute]
  );

  const del = useCallback(
    (url: string) => execute(url, { method: 'DELETE' }),
    [execute]
  );

  return {
    isLoading,
    error,
    errors,
    get,
    post,
    patch,
    delete: del,
    execute,
  };
}

/**
 * Helper to build query string from params
 */
export function buildQueryString(params: Record<string, string | number | boolean | undefined>): string {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      searchParams.append(key, String(value));
    }
  });
  
  const query = searchParams.toString();
  return query ? `?${query}` : '';
}
