import { removeFiles } from '@/lib/storage';
import { supabase } from '@/lib/supabase/client';
import { serverErrorMessage } from '@/utils/errors';
import type { PostType } from '@shared/validation/post';
import type { Json } from '@/types/database';

export const POST_IMAGES_BUCKET = 'post-images';

type Result<T> = { data: T } | { error: string };

/** `id` dibuat klien dan dipakai ulang saat retry, sehingga server tidak membuat duplikat. */
export async function createPost(input: {
  id: string;
  communityId: string;
  type: PostType;
  title: string;
  body: string;
  imagePaths: string[];
  details?: Record<string, unknown>;
}): Promise<Result<{ id: string }>> {
  const { data, error } = await supabase.rpc('create_post', {
    p_id: input.id,
    p_community_id: input.communityId,
    p_type: input.type,
    p_title: input.title,
    p_body: input.body,
    p_image_paths: input.imagePaths,
    p_details: (input.details ?? {}) as Json,
  });
  return error ? { error: serverErrorMessage(error) } : { data: { id: data.id } };
}

export async function editPost(id: string, title: string, body: string, details?: Record<string, unknown>): Promise<string | null> {
  const { error } = await supabase.rpc('edit_post', { p_id: id, p_title: title, p_body: body, p_details: (details ?? null) as Json });
  return error ? serverErrorMessage(error) : null;
}

/** Hapus di server dulu; pembersihan foto menyusul dan hanya best effort. */
export async function deletePost(id: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('delete_post', { p_id: id });
  if (error) return serverErrorMessage(error);
  await removeFiles(POST_IMAGES_BUCKET, data ?? []);
  return null;
}
