import { useCallback, useEffect, useRef, useState } from 'react';

type Page<T> = { items: T[] } | { error: string };
type State<T> = { key: string; status: 'ready' | 'error'; items: T[]; done: boolean };

/**
 * Daftar berhalaman berbasis offset untuk hasil pencarian. Ganti `key` (mis. kata kunci atau
 * filter) = mulai dari awal; respons basi dari key lama diabaikan.
 */
export function usePagedQuery<T>(key: string, fetchPage: (offset: number) => Promise<Page<T>>, pageSize: number, enabled = true) {
  const [state, setState] = useState<State<T> | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const fetchRef = useRef(fetchPage);
  const generation = useRef(0);

  useEffect(() => {
    fetchRef.current = fetchPage;
  });

  useEffect(() => {
    if (!enabled) return;
    const gen = ++generation.current;
    (async () => {
      const page = await fetchRef.current(0);
      if (gen !== generation.current) return;
      setState('error' in page ? { key, status: 'error', items: [], done: true } : { key, status: 'ready', items: page.items, done: page.items.length < pageSize });
    })();
  }, [key, enabled, attempt, pageSize]);

  const current = state && state.key === key ? state : null;

  const loadMore = useCallback(async () => {
    if (!current || current.status !== 'ready' || current.done || loadingMore) return;
    const gen = generation.current;
    setLoadingMore(true);
    const page = await fetchRef.current(current.items.length);
    if (gen !== generation.current) return;
    setLoadingMore(false);
    if ('error' in page) return;
    setState((s) => {
      if (!s || s.key !== key) return s;
      return { ...s, items: [...s.items, ...page.items], done: page.items.length < pageSize };
    });
  }, [current, loadingMore, key, pageSize]);

  const retry = useCallback(() => {
    setState(null);
    setAttempt((n) => n + 1);
  }, []);

  const status: 'loading' | 'ready' | 'error' = current?.status ?? 'loading';
  return { status, items: current?.items ?? [], done: current?.done ?? false, loadingMore, loadMore, retry };
}

/** Menunda perubahan nilai (mis. teks pencarian) agar tidak memicu query tiap ketukan. */
export function useDebounced<T>(value: T, ms = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}
