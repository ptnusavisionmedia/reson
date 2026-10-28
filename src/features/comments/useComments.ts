import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { supabase } from '@/lib/supabase/client';

export type CommentNode = {
  id: string;
  authorId: string | null; // null = akun penulis sudah dihapus (tombstone)
  authorName: string;
  authorUsername: string;
  authorAvatarPath: string | null;
  body: string;
  deleted: boolean; // tombstone: tanpa isi dan tanpa identitas
  createdAt: string;
  updatedAt: string;
  replies: CommentNode[];
};

type Row = {
  id: string;
  author_id: string | null;
  parent_comment_id: string | null;
  body: string;
  status: 'published' | 'deleted' | 'hidden';
  created_at: string;
  updated_at: string;
  profiles: { username: string; display_name: string; avatar_path: string | null } | null;
};

const LIMIT = 300;

function toNode(r: Row): CommentNode {
  return {
    id: r.id,
    authorId: r.author_id,
    authorName: r.profiles?.display_name ?? 'Akun dihapus',
    authorUsername: r.profiles?.username ?? '',
    authorAvatarPath: r.profiles?.avatar_path ?? null,
    body: r.body,
    deleted: r.status === 'deleted',
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    replies: [],
  };
}

/**
 * Susun pohon dua tingkat. Balasan yang dihapus disembunyikan; komentar utama yang dihapus
 * hanya tampil (sebagai tombstone) bila masih punya balasan aktif.
 */
export function buildTree(rows: Row[]): CommentNode[] {
  const tops = new Map<string, CommentNode>();
  rows.filter((r) => r.parent_comment_id === null).forEach((r) => tops.set(r.id, toNode(r)));
  rows
    .filter((r) => r.parent_comment_id !== null && r.status === 'published')
    .forEach((r) => tops.get(r.parent_comment_id as string)?.replies.push(toNode(r)));
  return [...tops.values()].filter((c) => !c.deleted || c.replies.length > 0);
}

export function useComments(postId: string) {
  const [state, setState] = useState<{ forPost: string; status: 'ready' | 'error'; tree: CommentNode[] } | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('comments')
      .select('id, author_id, parent_comment_id, body, status, created_at, updated_at, profiles!comments_author_id_fkey(username, display_name, avatar_path)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
      .limit(LIMIT);
    if (error) {
      console.warn('[useComments]', error.code, error.message);
      setState((s) => ({ forPost: postId, status: 'error', tree: s?.forPost === postId ? s.tree : [] }));
      return;
    }
    setState({ forPost: postId, status: 'ready', tree: buildTree(data as unknown as Row[]) });
  }, [postId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const current = state && state.forPost === postId ? state : null;
  return { status: current?.status ?? 'loading', tree: current?.tree ?? [], reload: load };
}
