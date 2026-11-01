import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@db';

export type CommentNode = {
  id: string;
  authorId: string | null; // null = akun penulis sudah dihapus (tombstone)
  authorName: string;
  authorUsername: string;
  authorAvatarUrl: string | null;
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

/**
 * Susun pohon dua tingkat. Balasan yang dihapus disembunyikan; komentar utama yang dihapus
 * hanya tampil (sebagai tombstone tanpa isi) bila masih punya balasan aktif.
 */
export function buildTree(rows: Row[], avatarUrl: (path: string | null) => string | null): CommentNode[] {
  const toNode = (r: Row): CommentNode => ({
    id: r.id,
    authorId: r.author_id,
    authorName: r.profiles?.display_name ?? 'Akun dihapus',
    authorUsername: r.profiles?.username ?? '',
    authorAvatarUrl: avatarUrl(r.profiles?.avatar_path ?? null),
    body: r.status === 'deleted' ? '' : r.body,
    deleted: r.status === 'deleted',
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    replies: [],
  });

  const tops = new Map<string, CommentNode>();
  rows.filter((r) => r.parent_comment_id === null).forEach((r) => tops.set(r.id, toNode(r)));
  rows
    .filter((r) => r.parent_comment_id !== null && r.status === 'published')
    .forEach((r) => tops.get(r.parent_comment_id as string)?.replies.push(toNode(r)));
  return [...tops.values()].filter((c) => !c.deleted || c.replies.length > 0);
}

export async function fetchComments(
  supabase: SupabaseClient<Database>,
  postId: string,
  avatarUrl: (path: string | null) => string | null,
): Promise<{ tree: CommentNode[]; error: boolean }> {
  const { data, error } = await supabase
    .from('comments')
    .select('id, author_id, parent_comment_id, body, status, created_at, updated_at, profiles!comments_author_id_fkey(username, display_name, avatar_path)')
    .eq('post_id', postId)
    .order('created_at', { ascending: true })
    .limit(LIMIT);
  if (error) return { tree: [], error: true };
  return { tree: buildTree(data as unknown as Row[], avatarUrl), error: false };
}
