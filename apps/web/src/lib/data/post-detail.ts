import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@db';

import type { PostType } from './posts';

export type PostDetail = {
  id: string;
  type: PostType;
  title: string;
  body: string;
  imagePaths: string[];
  details: unknown;
  createdAt: string;
  updatedAt: string;
  likeCount: number;
  commentCount: number;
  authorId: string;
  authorName: string;
  authorUsername: string;
  authorAvatarPath: string | null;
  communityId: string;
  communityName: string;
};

export type DeviceLite = { id: string; name: string; brand: string; category: string };

export const POST_IMAGES_BUCKET = 'post-images';

/**
 * Post hidden/deleted tidak dikembalikan RLS, jadi deep link ke sana tampil sebagai
 * "tidak tersedia" tanpa membedakan penyebabnya.
 */
export async function fetchPost(
  supabase: SupabaseClient<Database>,
  postId: string,
): Promise<{ status: 'ready'; post: PostDetail } | { status: 'not_found' } | { status: 'error' }> {
  const { data, error } = await supabase
    .from('posts')
    .select(
      'id, type, title, body, image_paths, details, created_at, updated_at, like_count, comment_count, author_id, community_id, profiles!posts_author_id_fkey(username, display_name, avatar_path), communities!posts_community_id_fkey(name)',
    )
    .eq('id', postId)
    .maybeSingle();
  if (error) return { status: 'error' };
  if (!data) return { status: 'not_found' };
  const p = data as unknown as {
    id: string; type: PostType; title: string; body: string; image_paths: string[]; details: unknown;
    created_at: string; updated_at: string; like_count: number; comment_count: number;
    author_id: string; community_id: string;
    profiles: { username: string; display_name: string; avatar_path: string | null } | null;
    communities: { name: string } | null;
  };
  return {
    status: 'ready',
    post: {
      id: p.id,
      type: p.type,
      title: p.title,
      body: p.body,
      imagePaths: p.image_paths,
      details: p.details,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      likeCount: p.like_count,
      commentCount: p.comment_count,
      authorId: p.author_id,
      authorName: p.profiles?.display_name ?? 'Akun dihapus',
      authorUsername: p.profiles?.username ?? '',
      authorAvatarPath: p.profiles?.avatar_path ?? null,
      communityId: p.community_id,
      communityName: p.communities?.name ?? '',
    },
  };
}

export async function fetchDevices(supabase: SupabaseClient<Database>, ids: string[]): Promise<Record<string, DeviceLite>> {
  if (ids.length === 0) return {};
  const { data } = await supabase.from('devices').select('id, name, brand, category').in('id', ids).eq('status', 'active');
  return Object.fromEntries((data ?? []).map((d) => [d.id, d]));
}

/** Signed URL privat dibuat per request di server dan tidak disimpan di cache bersama. */
export async function signPostImages(supabase: SupabaseClient<Database>, paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const { data } = await supabase.storage.from(POST_IMAGES_BUCKET).createSignedUrls(paths, 3600);
  const urls: Record<string, string> = {};
  data?.forEach((d) => {
    if (d.path && d.signedUrl) urls[d.path] = d.signedUrl;
  });
  return urls;
}
