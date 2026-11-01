import type { SupabaseClient } from '@supabase/supabase-js';

import { clearAllDrafts } from '@/lib/composer/draft';
import type { Database } from '@db';
import { continueDeletion, type DeletionDeps, type DeletionStage } from '@account/deletionFlow';

export type { DeletionStage };

const BUCKETS = ['avatars', 'post-images'] as const;
const MAX_DEPTH = 3; // post-images/{uid}/{postId}/{berkas}

type Supabase = SupabaseClient<Database>;

/** Hapus semua berkas di bawah prefix (rekursif). Tiap putaran mendaftar ulang sampai kosong. */
async function removeFolder(supabase: Supabase, bucket: string, prefix: string, depth = 0): Promise<string | null> {
  for (let guard = 0; guard < 100; guard++) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 100 });
    if (error) return 'Gagal membaca foto. Periksa koneksi lalu lanjutkan lagi.';
    if (!data || data.length === 0) return null;

    const files = data.filter((i) => i.id !== null).map((i) => `${prefix}/${i.name}`);
    const folders = data.filter((i) => i.id === null).map((i) => `${prefix}/${i.name}`);
    if (depth < MAX_DEPTH) {
      for (const f of folders) {
        const err = await removeFolder(supabase, bucket, f, depth + 1);
        if (err) return err;
      }
    }
    if (files.length === 0) return null; // hanya sub-folder (sudah dikosongkan di atas)
    const { error: rmError } = await supabase.storage.from(bucket).remove(files);
    if (rmError) return 'Gagal menghapus foto. Periksa koneksi lalu lanjutkan lagi.';
  }
  return 'Terlalu banyak foto untuk dihapus sekaligus. Lanjutkan lagi.';
}

function realDeps(supabase: Supabase, uid: string, onProgress?: (s: DeletionStage) => void): DeletionDeps {
  return {
    onProgress,
    cleanupStorage: async () => {
      for (const bucket of BUCKETS) {
        const err = await removeFolder(supabase, bucket, uid);
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

/** Melanjutkan penghapusan yang sudah dimulai (akun berstatus 'deleting'). null = selesai dan sesi lokal diakhiri. */
export async function resumeAccountDeletion(supabase: Supabase, uid: string, onProgress?: (s: DeletionStage) => void): Promise<string | null> {
  const err = await continueDeletion(realDeps(supabase, uid, onProgress));
  if (err) return err;
  clearAllDrafts();
  await supabase.auth.signOut({ scope: 'local' });
  return null;
}

/**
 * Menandai akun 'deleting' lalu menjalankan seluruh tahap. Server mewajibkan sesi yang dibuat dalam
 * 5 menit terakhir (login ulang), jadi pemanggil harus baru saja memverifikasi ulang.
 */
export async function startAccountDeletion(supabase: Supabase, uid: string, onProgress?: (s: DeletionStage) => void): Promise<string | null> {
  const { error } = await supabase.rpc('request_account_deletion');
  if (error) {
    return error.message.includes('reauth required')
      ? 'Verifikasi sudah terlalu lama. Ulangi verifikasi lalu coba lagi.'
      : 'Tidak bisa memulai penghapusan. Periksa koneksi lalu coba lagi.';
  }
  return resumeAccountDeletion(supabase, uid, onProgress);
}

export const STAGE_LABEL: Record<DeletionStage, string> = {
  storage: 'Menghapus foto…',
  data: 'Menghapus data…',
  finalize: 'Menyelesaikan…',
};
