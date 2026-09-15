import { useState, useCallback } from 'react';

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseApiReturn<T, A extends unknown[]> {
  data: T | null;
  loading: boolean;
  error: string | null;
  execute: (...args: A) => Promise<T | null>;
  reset: () => void;
}

export function useApi<T, A extends unknown[] = []>(
  apiFn: (...args: A) => Promise<T>
): UseApiReturn<T, A> {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(
    async (...args: A): Promise<T | null> => {
      setState({ data: null, loading: true, error: null });
      try {
        const result = await apiFn(...args);
        setState({ data: result, loading: false, error: null });
        return result;
      } catch (err: any) {
        const message = err?.message || 'An unexpected error occurred';
        setState({ data: null, loading: false, error: message });
        return null;
      }
    },
    [apiFn]
  );

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return { ...state, execute, reset };
}

export function useAsync<T>(asyncFn: () => Promise<T>) {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(async (): Promise<T | null> => {
    setState({ data: null, loading: true, error: null });
    try {
      const result = await asyncFn();
      setState({ data: result, loading: false, error: null });
      return result;
    } catch (err: any) {
      const message = err?.message || 'An unexpected error occurred';
      setState({ data: null, loading: false, error: message });
      return null;
    }
  }, [asyncFn]);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return { ...state, execute, reset };
}
