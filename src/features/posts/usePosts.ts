import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { escapeLike } from '@/features/devices/api';
import { supabase } from '@/lib/supabase/client';

export type PostItem = {
  id: string;
  title: string;
  type: 'discussion' | 'question' | 'review' | 'showcase';
  createdAt: string;
  likeCount: number;
  commentCount: number;
  authorName: string;
  authorUsername: string;
};

// `posts` terhubung ke `profiles` lewat beberapa jalur (penulis, post_likes, saved_posts); tanpa
// nama FK, PostgREST menolak embed karena ambigu (PGRST201).
const SELECT = 'id, title, type, created_at, like_count, comment_count, profiles!posts_author_id_fkey(username, display_name)';
export const PAGE_SIZE = 20;

type Row = {
  id: string;
  title: string;
  type: PostItem['type'];
  created_at: string;
  like_count: number;
  comment_count: number;
  profiles: { username: string; display_name: string } | null;
};

function toItem(r: Row): PostItem {
  return {
    id: r.id,
    title: r.title,
    type: r.type,
    createdAt: r.created_at,
    likeCount: r.like_count,
    commentCount: r.comment_count,
    authorName: r.profiles?.display_name ?? 'Akun dihapus',
    authorUsername: r.profiles?.username ?? '',
  };
}

export type PostType = PostItem['type'];
export type FeedSource =
  | { kind: 'community'; communityId: string }
  | { kind: 'author'; authorId: string; type?: PostType }
  | { kind: 'device'; deviceId: string; type: PostType }
  | { kind: 'search'; q: string; type?: PostType }
  | { kind: 'forYou' }
  | { kind: 'following' };

// Bentuk minimal query PostgREST yang dipakai feed (from('posts') dan rpc(...) sama-sama cocok).
type FeedQuery = PromiseLike<{ data: unknown; error: { code?: string; message: string } | null }> & {
  order(column: string, opts: { ascending: boolean }): FeedQuery;
  limit(count: number): FeedQuery;
  or(filters: string): FeedQuery;
};

/**
 * Feed post berhalaman: 20 per halaman, cursor stabil (created_at, id) sehingga post baru/dihapus
 * atau follow/unfollow saat menggulir tidak menggeser atau menduplikasi halaman berikutnya.
 * Sumber: satu komunitas, Untukmu (komunitas yang diikuti), atau Mengikuti (penulis yang diikuti).
 */
export function usePostFeed(source: FeedSource) {
  const [items, setItems] = useState<PostItem[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreFailed, setMoreFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [done, setDone] = useState(false);
  const generation = useRef(0); // mengabaikan respons basi saat refresh dan loadMore berpapasan
  const sourceKey = JSON.stringify(source); // kunci stabil: objek source baru tiap render tidak memicu muat ulang
  const kind = source.kind;

  const fetchPage = useCallback(
    (after: PostItem | null) => {
      const src = JSON.parse(sourceKey) as FeedSource;
      let base;
      if (src.kind === 'community') {
        base = supabase.from('posts').select(SELECT).eq('community_id', src.communityId).eq('status', 'published');
      } else if (src.kind === 'author') {
        base = supabase.from('posts').select(SELECT).eq('author_id', src.authorId).eq('status', 'published');
        if (src.type) base = base.eq('type', src.type);
      } else if (src.kind === 'device') {
        base = supabase.from('posts').select(SELECT).contains('device_ids', [src.deviceId]).eq('type', src.type).eq('status', 'published');
      } else if (src.kind === 'search') {
        base = supabase.from('posts').select(SELECT).eq('status', 'published');
        if (src.q) base = base.ilike('title_lower', `${escapeLike(src.q.toLowerCase())}%`);
        if (src.type) base = base.eq('type', src.type);
      } else {
        base = supabase.rpc(src.kind === 'forYou' ? 'feed_for_you' : 'feed_following').select(SELECT);
      }
      let q = (base as unknown as FeedQuery)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(PAGE_SIZE);
      if (after) q = q.or(`created_at.lt.${after.createdAt},and(created_at.eq.${after.createdAt},id.lt.${after.id})`);
      return q;
    },
    [sourceKey],
  );

  const refresh = useCallback(async () => {
    const gen = ++generation.current;
    const { data, error } = await fetchPage(null);
    if (gen !== generation.current) return;
    if (error) {
      console.warn('[usePostFeed]', kind, error.code, error.message);
      setStatus((s) => (s === 'loading' ? 'error' : s)); // jika sudah ada isi, pertahankan
      return;
    }
    const page = (data as Row[]).map(toItem);
    setItems(page);
    setDone(page.length < PAGE_SIZE);
    setMoreFailed(false);
    setStatus('ready');
  }, [fetchPage, kind]);

  const loadMore = useCallback(async () => {
    if (status !== 'ready' || done || loadingMore || items.length === 0) return;
    const gen = generation.current;
    setLoadingMore(true);
    setMoreFailed(false);
    const { data, error } = await fetchPage(items[items.length - 1]);
    if (gen !== generation.current) return;
    setLoadingMore(false);
    if (error) return setMoreFailed(true);
    const page = (data as Row[]).map(toItem);
    setItems((prev) => {
      const seen = new Set(prev.map((p) => p.id));
      return [...prev, ...page.filter((p) => !seen.has(p.id))];
    });
    setDone(page.length < PAGE_SIZE);
  }, [status, done, loadingMore, items, fetchPage]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const retry = useCallback(() => {
    setStatus('loading');
    refresh();
  }, [refresh]);

  // Muat ulang diam-diam tiap layar kembali fokus (mis. setelah dari composer).
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  return { items, status, loadingMore, moreFailed, refreshing, done, loadMore, onRefresh, retry };
}

/** Post yang disematkan (maksimal 3). Hanya yang published yang dikembalikan RLS. */
export function usePinnedPosts(ids: string[]) {
  const [state, setState] = useState<{ key: string; items: PostItem[] } | null>(null);
  const key = ids.join(',');

  useFocusEffect(
    useCallback(() => {
      if (!key) return;
      supabase
        .from('posts')
        .select(SELECT)
        .in('id', key.split(','))
        .eq('status', 'published')
        .then(({ data }) => {
          if (data) setState({ key, items: (data as unknown as Row[]).map(toItem) });
        });
    }, [key]),
  );

  return key && state?.key === key ? state.items : [];
}
