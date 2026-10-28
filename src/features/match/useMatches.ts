import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { supabase } from '@/lib/supabase/client';

import type { MatchCard } from './explain';

export const MATCH_PAGE_SIZE = 20;
export const MATCH_LABELS = ['Sangat dekat', 'Cukup dekat', 'Sebagian selera sama', 'Kecocokan awal'] as const;

type State =
  | { status: 'loading' }
  | { status: 'no_profile' }
  | { status: 'disabled' }
  | { status: 'error' }
  | { status: 'ready'; items: MatchCard[]; done: boolean };

/**
 * Memanggil refresh_matches (server memutuskan perlu hitung ulang atau tidak: revision profil,
 * TTL 24 jam, dan batas laju) lalu membaca hasil tervalidasi lewat get_my_matches.
 */
export function useMatches(label: string | null) {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const generation = useRef(0);

  const fetchPage = useCallback(
    async (offset: number) => {
      const { data, error } = await supabase.rpc('get_my_matches', { p_label: label as string, p_limit: MATCH_PAGE_SIZE, p_offset: offset });
      if (error) return { error: error.message };
      const items: MatchCard[] = data.map((r) => ({
        candidateId: r.candidate_id,
        username: r.username,
        displayName: r.display_name,
        avatarPath: r.avatar_path,
        label: r.label,
        coverage: r.coverage,
        sharedGenres: r.shared_genres,
        sharedPreferences: r.shared_preferences,
        differences: r.differences,
        bass: r.bass,
        vocals: r.vocals,
        treble: r.treble,
      }));
      return { items };
    },
    [label],
  );

  const load = useCallback(
    async (force: boolean) => {
      const gen = ++generation.current;
      const refreshed = await supabase.rpc('refresh_matches', { p_force: force });
      if (gen !== generation.current) return;
      if (refreshed.error) {
        const m = refreshed.error.message;
        if (m.includes('no sound profile')) return setState({ status: 'no_profile' });
        if (m.includes('match disabled')) return setState({ status: 'disabled' });
        console.warn('[useMatches] refresh', refreshed.error.code, m);
        return setState((s) => (s.status === 'ready' ? s : { status: 'error' }));
      }
      if (refreshed.data === 'cooldown') setNotice('Hasil sudah diperbarui baru-baru ini. Coba lagi beberapa menit lagi.');
      const page = await fetchPage(0);
      if (gen !== generation.current) return;
      if ('error' in page) {
        console.warn('[useMatches] read', page.error);
        return setState((s) => (s.status === 'ready' ? s : { status: 'error' }));
      }
      setState({ status: 'ready', items: page.items, done: page.items.length < MATCH_PAGE_SIZE });
    },
    [fetchPage],
  );

  useFocusEffect(
    useCallback(() => {
      load(false);
    }, [load]),
  );

  const loadMore = useCallback(async () => {
    if (state.status !== 'ready' || state.done || loadingMore) return;
    const gen = generation.current;
    setLoadingMore(true);
    const page = await fetchPage(state.items.length);
    if (gen !== generation.current) return;
    setLoadingMore(false);
    if ('error' in page) return;
    setState((s) => {
      if (s.status !== 'ready') return s;
      const seen = new Set(s.items.map((i) => i.candidateId));
      return { status: 'ready', items: [...s.items, ...page.items.filter((i) => !seen.has(i.candidateId))], done: page.items.length < MATCH_PAGE_SIZE };
    });
  }, [state, loadingMore, fetchPage]);

  const refresh = useCallback(async () => {
    setNotice(null);
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  }, [load]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    load(false);
  }, [load]);

  return { state, loadingMore, refreshing, notice, loadMore, refresh, retry };
}
