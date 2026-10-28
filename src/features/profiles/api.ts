import { supabase } from '@/lib/supabase/client';
import { prepareJpeg, removeFiles, uploadJpeg } from '@/lib/storage';

const BUCKET = 'avatars';

export function avatarUrl(path: string | null | undefined): string | null {
  return path ? supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl : null;
}

/**
 * Kompres ke JPEG 512px lalu unggah ke avatars/{uid}/{fileId}.
 * Mengembalikan path, atau pesan error. Berkas lama TIDAK dihapus di sini.
 */
export async function uploadAvatar(uid: string, pickedUri: string): Promise<{ path: string } | { error: string }> {
  const prep = await prepareJpeg(pickedUri, { maxWidth: 512 });
  if ('error' in prep) return prep;
  const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.jpg`;
  const err = await uploadJpeg(BUCKET, path, prep.bytes);
  return err ? { error: err } : { path };
}

export async function removeAvatar(path: string | null | undefined): Promise<void> {
  if (path) await removeFiles(BUCKET, [path]);
}

export async function updateMyProfile(input: { displayName: string; bio: string; avatarPath: string | null }): Promise<string | null> {
  const { error } = await supabase.rpc('update_my_profile', {
    p_display_name: input.displayName,
    p_bio: input.bio,
    p_avatar_path: input.avatarPath as string,
  });
  return error ? 'Gagal menyimpan profil. Periksa koneksi lalu coba lagi.' : null;
}
