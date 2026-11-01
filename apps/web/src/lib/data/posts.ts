import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@db';

export type PostType = 'discussion' | 'question' | 'review' | 'showcase';

export type PostItem = {
  id: string;
  title: string;
  type: PostType;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  authorName: string;
  authorUsername: string;
};

export type FeedSource =
  | { kind: 'forYou' }
  | { kind: 'following' }
  | { kind: 'community'; communityId: string }
  | { kind: 'author'; authorId: string; type?: PostType }
  | { kind: 'device'; deviceId: string; type: PostType }
  | { kind: 'search'; q: string; type?: PostType };

/** Karakter khusus LIKE (% _ \) di input pengguna diperlakukan sebagai teks biasa. */
export const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

export const PAGE_SIZE = 20;

// `posts` terhubung ke `profiles` lewat beberapa FK; tanpa nama FK, PostgREST menolak embed (PGRST201).
const SELECT = 'id, title, type, created_at, like_count, comment_count, profiles!posts_author_id_fkey(username, display_name)';

type Row = {
  id: string;
  title: string;
  type: PostType;
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

// Bentuk minimal query PostgREST yang dipakai feed (from('posts') dan rpc(...) sama-sama cocok).
type FeedQuery = PromiseLike<{ data: unknown; error: { code?: string; message: string } | null }> & {
  order(column: string, opts: { ascending: boolean }): FeedQuery;
  limit(count: number): FeedQuery;
  or(filters: string): FeedQuery;
};

/**
 * Satu halaman feed (20), cursor stabil (created_at, id) seperti di app mobile.
 * Menerima client dari pemanggil, sehingga sama-sama bisa dipakai server (cookie) dan browser.
 */
export async function fetchFeedPage(
  supabase: SupabaseClient<Database>,
  source: FeedSource,
  after: PostItem | null,
): Promise<{ items: PostItem[]; error: boolean }> {
  let base;
  if (source.kind === 'community') {
    base = supabase.from('posts').select(SELECT).eq('community_id', source.communityId).eq('status', 'published');
  } else if (source.kind === 'author') {
    base = supabase.from('posts').select(SELECT).eq('author_id', source.authorId).eq('status', 'published');
    if (source.type) base = base.eq('type', source.type);
  } else if (source.kind === 'device') {
    base = supabase.from('posts').select(SELECT).contains('device_ids', [source.deviceId]).eq('type', source.type).eq('status', 'published');
  } else if (source.kind === 'search') {
    base = supabase.from('posts').select(SELECT).eq('status', 'published');
    if (source.q) base = base.ilike('title_lower', `${escapeLike(source.q.toLowerCase())}%`);
    if (source.type) base = base.eq('type', source.type);
  } else {
    base = supabase.rpc(source.kind === 'forYou' ? 'feed_for_you' : 'feed_following').select(SELECT);
  }

  let q = (base as unknown as FeedQuery).order('created_at', { ascending: false }).order('id', { ascending: false }).limit(PAGE_SIZE);
  if (after) q = q.or(`created_at.lt.${after.createdAt},and(created_at.eq.${after.createdAt},id.lt.${after.id})`);

  const { data, error } = await q;
  if (error) return { items: [], error: true };
  return { items: (data as Row[]).map(toItem), error: false };
}

/** Post yang disematkan (maksimal 3). Hanya yang published yang dikembalikan RLS. */
export async function fetchPostsByIds(supabase: SupabaseClient<Database>, ids: string[]): Promise<PostItem[]> {
  if (ids.length === 0) return [];
  const { data } = await supabase.from('posts').select(SELECT).in('id', ids).eq('status', 'published');
  return ((data ?? []) as unknown as Row[]).map(toItem);
}
