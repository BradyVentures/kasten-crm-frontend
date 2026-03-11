'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export function usePolling<T>(
  fetchFn: () => Promise<T>,
  intervalMs: number = 5000
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchRef = useRef(fetchFn);
  fetchRef.current = fetchFn;

  const refetch = useCallback(async () => {
    try {
      const result = await fetchRef.current();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();

    const interval = setInterval(() => {
      if (!document.hidden) {
        refetch();
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }, [refetch, intervalMs]);

  return { data, loading, error, refetch };
}
