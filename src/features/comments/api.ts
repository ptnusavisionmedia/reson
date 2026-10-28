import { supabase } from '@/lib/supabase/client';
import { serverErrorMessage } from '@/utils/errors';

/** Semua fungsi mengembalikan pesan error, atau null bila berhasil. */

/** `id` dibuat klien dan dipakai ulang saat retry, sehingga server tidak membuat duplikat. */
export async function createComment(input: { id: string; postId: string; parentId: string | null; body: string }): Promise<string | null> {
  const { error } = await supabase.rpc('create_comment', {
    p_id: input.id,
    p_post_id: input.postId,
    p_parent_id: input.parentId as string,
    p_body: input.body,
  });
  return error ? serverErrorMessage(error) : null;
}

export async function editComment(id: string, body: string): Promise<string | null> {
  const { error } = await supabase.rpc('edit_comment', { p_id: id, p_body: body });
  return error ? serverErrorMessage(error) : null;
}

export async function deleteComment(id: string): Promise<string | null> {
  const { error } = await supabase.rpc('delete_comment', { p_id: id });
  return error ? serverErrorMessage(error) : null;
}

export async function likePost(postId: string): Promise<{ count: number } | { error: string }> {
  const { data, error } = await supabase.rpc('like_post', { p_post_id: postId });
  return error ? { error: serverErrorMessage(error) } : { count: data };
}

export async function unlikePost(postId: string): Promise<{ count: number } | { error: string }> {
  const { data, error } = await supabase.rpc('unlike_post', { p_post_id: postId });
  return error ? { error: serverErrorMessage(error) } : { count: data };
}
