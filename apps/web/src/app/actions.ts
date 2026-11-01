'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';
import { serverErrorMessage } from '@utils/errors';

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

type ActionResult<T = object> = ({ error: string } | ({ error?: undefined } & T));

/** Pemeriksaan umum untuk aksi sosial: input uuid valid dan sesi masih ada. */
async function authed(...ids: string[]) {
  if (!ids.every((id) => z.uuid().safeParse(id).success)) return { error: 'Data tidak valid.' } as const;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: 'Sesi berakhir. Silakan masuk lagi.' } as const;
  return { error: undefined, supabase, userId: data.user.id } as const;
}

export async function setLike(postId: string, like: boolean): Promise<ActionResult<{ count: number }>> {
  const a = await authed(postId);
  if (a.error !== undefined) return { error: a.error };
  const { data, error } = like
    ? await a.supabase.rpc('like_post', { p_post_id: postId })
    : await a.supabase.rpc('unlike_post', { p_post_id: postId });
  return error ? { error: serverErrorMessage(error) } : { count: data };
}

export async function setSaved(postId: string, saved: boolean): Promise<ActionResult> {
  const a = await authed(postId);
  if (a.error !== undefined) return { error: a.error };
  const { error } = saved
    ? await a.supabase.from('saved_posts').upsert({ post_id: postId, user_id: a.userId }, { onConflict: 'user_id,post_id', ignoreDuplicates: true })
    : await a.supabase.from('saved_posts').delete().eq('post_id', postId).eq('user_id', a.userId);
  return error ? { error: serverErrorMessage(error) } : {};
}

const commentBody = z.string().trim().min(1, 'Komentar tidak boleh kosong.').max(1000, 'Komentar maksimal 1.000 karakter.');

/** `id` dibuat klien dan dipakai ulang saat retry, sehingga server tidak membuat duplikat. */
export async function addComment(input: { id: string; postId: string; parentId: string | null; body: string }): Promise<ActionResult> {
  const parsed = commentBody.safeParse(input.body);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const a = await authed(input.id, input.postId, ...(input.parentId ? [input.parentId] : []));
  if (a.error !== undefined) return { error: a.error };
  const { error } = await a.supabase.rpc('create_comment', {
    p_id: input.id,
    p_post_id: input.postId,
    p_parent_id: input.parentId as string,
    p_body: parsed.data,
  });
  if (error) return { error: serverErrorMessage(error) };
  revalidatePath(`/posts/${input.postId}`);
  return {};
}

export async function updateComment(postId: string, id: string, body: string): Promise<ActionResult> {
  const parsed = commentBody.safeParse(body);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const a = await authed(postId, id);
  if (a.error !== undefined) return { error: a.error };
  const { error } = await a.supabase.rpc('edit_comment', { p_id: id, p_body: parsed.data });
  if (error) return { error: serverErrorMessage(error) };
  revalidatePath(`/posts/${postId}`);
  return {};
}

export async function removeComment(postId: string, id: string): Promise<ActionResult> {
  const a = await authed(postId, id);
  if (a.error !== undefined) return { error: a.error };
  const { error } = await a.supabase.rpc('delete_comment', { p_id: id });
  if (error) return { error: serverErrorMessage(error) };
  revalidatePath(`/posts/${postId}`);
  return {};
}

/** Hapus di server dulu; pembersihan foto menyusul dan hanya best effort. */
export async function removePost(postId: string): Promise<ActionResult> {
  const a = await authed(postId);
  if (a.error !== undefined) return { error: a.error };
  const { data, error } = await a.supabase.rpc('delete_post', { p_id: postId });
  if (error) return { error: serverErrorMessage(error) };
  if (data?.length) await a.supabase.storage.from('post-images').remove(data);
  revalidatePath('/home');
  redirect('/home');
}

/** Gabung/keluar komunitas. Otorisasi sebenarnya ada di RPC; di sini sesi dan input divalidasi ulang. */
export async function setMembership(communityId: string, join: boolean): Promise<{ error?: string }> {
  if (!z.uuid().safeParse(communityId).success) return { error: 'Komunitas tidak ditemukan.' };
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: 'Sesi berakhir. Silakan masuk lagi.' };

  const { error } = join
    ? await supabase.rpc('join_community', { p_community_id: communityId })
    : await supabase.rpc('leave_community', { p_community_id: communityId });
  if (error) return { error: serverErrorMessage(error) };

  revalidatePath('/communities');
  revalidatePath(`/communities/${communityId}`);
  revalidatePath('/home');
  return {};
}
