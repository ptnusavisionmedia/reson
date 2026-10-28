import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { supabase } from '@/lib/supabase/client';

import type { PostItem } from './usePosts';

export type PostDetail = {
  id: string;
  type: PostItem['type'];
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

type Result = { status: 'ready'; post: PostDetail } | { status: 'not_found' } | { status: 'error' };

/**
 * Post hidden/deleted tidak dikembalikan RLS, jadi deep link ke sana tampil sebagai
 * "tidak tersedia" tanpa membedakan penyebabnya.
 */
export function usePost(postId: string | undefined) {
  const [state, setState] = useState<{ forId: string; result: Result } | null>(null);

  const load = useCallback(async () => {
    if (!postId) return;
    const { data, error } = await supabase
      .from('posts')
      .select(
        'id, type, title, body, image_paths, details, created_at, updated_at, like_count, comment_count, author_id, community_id, profiles!posts_author_id_fkey(username, display_name, avatar_path), communities!posts_community_id_fkey(name)',
      )
      .eq('id', postId)
      .maybeSingle();
    let result: Result;
    if (error) {
      console.warn('[usePost]', error.code, error.message);
      result = { status: 'error' };
    }
    else if (!data) result = { status: 'not_found' };
    else {
      const p = data as unknown as {
        id: string; type: PostItem['type']; title: string; body: string; image_paths: string[]; details: unknown;
        created_at: string; updated_at: string; like_count: number; comment_count: number;
        author_id: string; community_id: string;
        profiles: { username: string; display_name: string; avatar_path: string | null } | null;
        communities: { name: string } | null;
      };
      result = {
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
    setState({ forId: postId, result });
  }, [postId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return { result: state && state.forId === postId ? state.result : null, retry: load };
}
