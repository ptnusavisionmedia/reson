'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { refreshMatches } from '@/lib/data/match';
import { createClient } from '@/lib/supabase/server';
import type { Json } from '@db';
import { bodyRequiredError, POST_LIMITS, postInputSchema, TEXT_REQUIRED_TYPES } from '@shared/validation/post';
import { profileEditSchema } from '@shared/validation/profile';
import { reviewDetailsSchema, showcaseDetailsSchema } from '@shared/validation/postDetails';
import { soundProfileSchema, type SoundProfileInput } from '@shared/validation/soundProfile';
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

const publishSchema = postInputSchema.extend({ id: z.uuid(), imagePaths: z.array(z.string()).max(POST_LIMITS.images), details: z.record(z.string(), z.unknown()) });

/**
 * Terbitkan post. `id` dibuat klien dan dipakai ulang saat retry, sehingga server tidak membuat duplikat.
 * Validasi diulang di sini; RPC create_post tetap penentu akhir (keanggotaan, verifikasi, rate limit).
 */
export async function publishPost(input: z.input<typeof publishSchema>): Promise<ActionResult<{ id: string }>> {
  const parsed = publishSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const p = parsed.data;
  if (TEXT_REQUIRED_TYPES.includes(p.type) && !p.body) return { error: bodyRequiredError };
  if (p.type === 'review') {
    const r = reviewDetailsSchema.safeParse(p.details);
    if (!r.success) return { error: r.error.issues[0].message };
  } else if (p.type === 'showcase') {
    const r = showcaseDetailsSchema.safeParse(p.details);
    if (!r.success) return { error: r.error.issues[0].message };
  }

  const a = await authed(p.id);
  if (a.error !== undefined) return { error: a.error };
  // Foto harus berada di folder milik pengguna ini untuk post ini.
  const prefix = `${a.userId}/${p.id}/`;
  if (!p.imagePaths.every((path) => path.startsWith(prefix) && /^[0-9a-f-]{36}\.jpg$/.test(path.slice(prefix.length)))) {
    return { error: 'Foto tidak valid. Hapus lalu unggah ulang.' };
  }

  const { data, error } = await a.supabase.rpc('create_post', {
    p_id: p.id,
    p_community_id: p.communityId,
    p_type: p.type,
    p_title: p.title,
    p_body: p.body,
    p_image_paths: p.imagePaths,
    p_details: p.details as Json,
  });
  if (error) return { error: serverErrorMessage(error) };
  revalidatePath('/home');
  revalidatePath(`/communities/${p.communityId}`);
  return { id: data.id };
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

/** Simpan Sound Profile. Validasi final ada di RPC save_sound_profile. */
export async function saveSoundProfile(input: SoundProfileInput): Promise<ActionResult> {
  const parsed = soundProfileSchema.safeParse(input);
  if (!parsed.success) return { error: 'Jawaban tidak valid. Periksa kembali pilihan Anda.' };
  const a = await authed();
  if (a.error !== undefined) return { error: a.error };
  const p = parsed.data;
  const { error } = await a.supabase.rpc('save_sound_profile', {
    p_genres: p.genres,
    p_bass: p.bass as number,
    p_vocals: p.vocals as number,
    p_treble: p.treble as number,
    p_contexts: p.contexts,
    p_discoverable: p.discoverable,
  });
  if (error) return { error: 'Gagal menyimpan. Periksa koneksi lalu coba lagi.' };
  revalidatePath('/match');
  revalidatePath('/quiz-result');
  revalidatePath(`/users/${a.userId}`);
  return {};
}

export async function completeOnboarding(): Promise<ActionResult> {
  const a = await authed();
  if (a.error !== undefined) return { error: a.error };
  const { error } = await a.supabase.rpc('complete_onboarding');
  if (error) return { error: 'Tidak bisa menyelesaikan. Periksa koneksi lalu coba lagi.' };
  return {};
}

/** Non-kritis: gagal tidak menghalangi alur. */
export async function markIntroSeen(): Promise<void> {
  const a = await authed();
  if (a.error === undefined) await a.supabase.rpc('mark_intro_seen');
}

/** Hanya penerima yang bisa mengubah read_at miliknya (RLS dan hak kolom). */
export async function markNotificationRead(id: string): Promise<ActionResult> {
  const a = await authed(id);
  if (a.error !== undefined) return { error: a.error };
  const { error } = await a.supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id).eq('user_id', a.userId);
  return error ? { error: 'Gagal menandai dibaca. Coba lagi.' } : {};
}

export async function markAllNotificationsRead(): Promise<ActionResult> {
  const a = await authed();
  if (a.error !== undefined) return { error: a.error };
  const { error } = await a.supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', a.userId).is('read_at', null);
  return error ? { error: 'Gagal menandai semua dibaca. Coba lagi.' } : {};
}

export async function setNotificationPrefs(prefs: Record<string, boolean>): Promise<ActionResult> {
  const parsed = z.object({ follow: z.boolean(), comment: z.boolean(), reply: z.boolean() }).safeParse(prefs);
  if (!parsed.success) return { error: 'Pengaturan tidak valid.' };
  const a = await authed();
  if (a.error !== undefined) return { error: a.error };
  const { error } = await a.supabase.rpc('update_notification_preferences', { p_prefs: parsed.data });
  return error ? { error: 'Gagal menyimpan. Periksa koneksi lalu coba lagi.' } : {};
}

/** Blokir memutus follow di kedua arah dan menyembunyikan konten; ditegakkan di server lewat RLS. */
export async function setBlock(targetId: string, block: boolean): Promise<ActionResult> {
  const a = await authed(targetId);
  if (a.error !== undefined) return { error: a.error };
  const { error } = block
    ? await a.supabase.rpc('block_user', { p_user_id: targetId })
    : await a.supabase.rpc('unblock_user', { p_user_id: targetId });
  if (error) return { error: serverErrorMessage(error) };
  revalidatePath(`/users/${targetId}`);
  revalidatePath('/settings/blocked');
  revalidatePath('/home');
  return {};
}

/** Laporan ganda yang masih terbuka diabaikan server. */
export async function submitReport(targetType: 'post' | 'comment' | 'user', targetId: string, reason: string): Promise<ActionResult> {
  if (!['post', 'comment', 'user'].includes(targetType)) return { error: 'Laporan tidak valid.' };
  const text = reason.trim().slice(0, 500);
  if (!text) return { error: 'Pilih alasan terlebih dahulu.' };
  const a = await authed(targetId);
  if (a.error !== undefined) return { error: a.error };
  const { error } = await a.supabase.rpc('create_report', { p_target_type: targetType, p_target_id: targetId, p_reason: text });
  return error ? { error: serverErrorMessage(error) } : {};
}

/** Avatar baru harus berada di folder milik pengguna ini. */
export async function saveProfile(input: { displayName: string; bio: string; avatarPath: string | null }): Promise<ActionResult> {
  const parsed = profileEditSchema.safeParse({ displayName: input.displayName, bio: input.bio });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const a = await authed();
  if (a.error !== undefined) return { error: a.error };
  if (input.avatarPath !== null && !input.avatarPath.startsWith(`${a.userId}/`)) return { error: 'Foto tidak valid. Pilih foto lain.' };
  const { error } = await a.supabase.rpc('update_my_profile', {
    p_display_name: parsed.data.displayName,
    p_bio: parsed.data.bio,
    p_avatar_path: input.avatarPath as string,
  });
  if (error) return { error: 'Gagal menyimpan profil. Periksa koneksi lalu coba lagi.' };
  revalidatePath(`/users/${a.userId}`);
  revalidatePath('/settings/profile');
  return {};
}

/** Perbarui Match secara paksa. Server tetap menerapkan batas laju dan menjawab 'cooldown'. */
export async function forceRefreshMatches(): Promise<{ status: 'ok' | 'cooldown' | 'no_profile' | 'disabled' | 'error' }> {
  const a = await authed();
  if (a.error !== undefined) return { status: 'error' };
  const status = await refreshMatches(a.supabase, true);
  if (status === 'ok') revalidatePath('/match');
  return { status };
}

/** Ikuti/berhenti mengikuti. Idempoten di server. */
export async function setFollow(targetId: string, follow: boolean): Promise<ActionResult> {
  const a = await authed(targetId);
  if (a.error !== undefined) return { error: a.error };
  const { error } = follow
    ? await a.supabase.rpc('follow_user', { p_user_id: targetId })
    : await a.supabase.rpc('unfollow_user', { p_user_id: targetId });
  if (error) return { error: serverErrorMessage(error) };
  revalidatePath(`/users/${targetId}`);
  revalidatePath('/home');
  return {};
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
