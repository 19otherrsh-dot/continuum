import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api';

/** Fetches on mount and whenever a dependency changes, with a manual reload. */
export function useFetch<T>(path: string | null, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(path !== null);
  // Guards against a slow earlier request overwriting a newer result.
  const requestId = useRef(0);

  const load = useCallback(async () => {
    if (!path) {
      setData(null);
      setLoading(false);
      return;
    }
    const id = ++requestId.current;
    setLoading(true);
    try {
      const result = await api.get<T>(path);
      if (id === requestId.current) {
        setData(result);
        setError(null);
      }
    } catch (err) {
      if (id === requestId.current) setError(err as Error);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, ...deps]);

  return { data, error, loading, reload: load, setData };
}

export function useDebounced<T>(value: T, delayMs = 220): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

/** Global keyboard shortcut, ignored while the user is typing in a field. */
export function useHotkey(key: string, handler: () => void, withMeta = true): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== key.toLowerCase()) return;
      if (withMeta && !(event.metaKey || event.ctrlKey)) return;
      const target = event.target as HTMLElement | null;
      if (!withMeta && target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      event.preventDefault();
      handler();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [key, handler, withMeta]);
}
