import { signInWithGoogle } from '@/features/auth/google';
import { clearAllDrafts } from '@/features/posts/draft';
import { clearSignedUrlCache } from '@/features/posts/useSignedUrls';
import { supabase } from '@/lib/supabase/client';

import { continueDeletion, type DeletionDeps, type DeletionStage } from './deletionFlow';

const BUCKETS = ['avatars', 'post-images'] as const;
const MAX_DEPTH = 3; // post-images/{uid}/{postId}/{berkas}

/** Hapus semua berkas di bawah prefix (rekursif). Tiap putaran mendaftar ulang sampai kosong. */
async function removeFolder(bucket: string, prefix: string, depth = 0): Promise<string | null> {
  for (let guard = 0; guard < 100; guard++) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 100 });
    if (error) return 'Gagal membaca foto. Periksa koneksi lalu lanjutkan lagi.';
    if (!data || data.length === 0) return null;

    const files = data.filter((i) => i.id !== null).map((i) => `${prefix}/${i.name}`);
    const folders = data.filter((i) => i.id === null).map((i) => `${prefix}/${i.name}`);
    if (depth < MAX_DEPTH) {
      for (const f of folders) {
        const err = await removeFolder(bucket, f, depth + 1);
        if (err) return err;
      }
    }
    if (files.length === 0) return null; // hanya sub-folder (sudah dikosongkan di atas)
    const { error: rmError } = await supabase.storage.from(bucket).remove(files);
    if (rmError) return 'Gagal menghapus foto. Periksa koneksi lalu lanjutkan lagi.';
  }
  return 'Terlalu banyak foto untuk dihapus sekaligus. Lanjutkan lagi.';
}

function realDeps(uid: string, onProgress?: (s: DeletionStage) => void): DeletionDeps {
  return {
    onProgress,
    cleanupStorage: async () => {
      for (const bucket of BUCKETS) {
        const err = await removeFolder(bucket, uid);
        if (err) return err;
      }
      return null;
    },
    processData: async () => {
      const { data, error } = await supabase.rpc('process_account_deletion');
      if (error) return { error: 'Gagal menghapus data. Periksa koneksi lalu lanjutkan lagi.' };
      return data === 'done' ? 'done' : 'continue';
    },
    finalize: async () => {
      const { error } = await supabase.rpc('finalize_account_deletion');
      return error ? 'Gagal menyelesaikan penghapusan. Lanjutkan lagi.' : null;
    },
  };
}

/** Setelah akun terhapus: bersihkan data lokal dan akhiri sesi di perangkat ini. */
async function afterDeleted() {
  await Promise.all([clearAllDrafts(), Promise.resolve(clearSignedUrlCache())]);
  await supabase.auth.signOut({ scope: 'local' });
}

/** Melanjutkan penghapusan yang sudah dimulai (akun berstatus 'deleting'). null = selesai. */
export async function resumeAccountDeletion(uid: string, onProgress?: (s: DeletionStage) => void): Promise<string | null> {
  const err = await continueDeletion(realDeps(uid, onProgress));
  if (err) return err;
  await afterDeleted();
  return null;
}

export type Reauth = { kind: 'password'; email: string; password: string } | { kind: 'google'; email?: string };

/** Login ulang yang membuat sesi baru. Google: UID yang kembali harus sama dengan akun target. */
async function reauthenticate(uid: string, reauth: Reauth): Promise<string | null> {
  if (reauth.kind === 'password') {
    const res = await supabase.auth.signInWithPassword({ email: reauth.email, password: reauth.password });
    return res.error ? 'Password salah.' : null;
  }
  const result = await signInWithGoogle(reauth.email);
  if (result.status === 'cancelled') return 'Verifikasi Google dibatalkan.';
  if (result.status === 'error') return result.message;
  if (result.userId !== uid) {
    // Sesi sekarang milik akun Google lain: akhiri dan jangan hapus akun mana pun.
    await supabase.auth.signOut({ scope: 'local' });
    return 'Akun Google yang dipilih berbeda dari akun ini. Tidak ada akun yang dihapus; silakan masuk lagi.';
  }
  return null;
}

/**
 * Memulai penghapusan: login ulang (membuat sesi baru yang dibuktikan ke server, password atau Google),
 * menandai akun 'deleting', lalu menjalankan seluruh tahap. null = akun sudah terhapus.
 */
export async function startAccountDeletion(uid: string, reauth: Reauth, onProgress?: (s: DeletionStage) => void): Promise<string | null> {
  const reauthError = await reauthenticate(uid, reauth);
  if (reauthError) return reauthError;
  const { error } = await supabase.rpc('request_account_deletion');
  if (error) {
    return error.message.includes('reauth required')
      ? 'Sesi belum cukup baru. Verifikasi ulang lalu coba lagi.'
      : 'Tidak bisa memulai penghapusan. Periksa koneksi lalu coba lagi.';
  }
  return resumeAccountDeletion(uid, onProgress);
}
