export type DeletionStage = 'storage' | 'data' | 'finalize';

export type DeletionDeps = {
  /** Hapus foto milik akun di Storage. Mengembalikan pesan error, atau null bila bersih. */
  cleanupStorage: () => Promise<string | null>;
  /** Satu langkah berbatas di server: 'continue' bila masih ada sisa, 'done' bila bersih. */
  processData: () => Promise<'continue' | 'done' | { error: string }>;
  /** Hapus akun Auth. Mengembalikan pesan error, atau null bila berhasil. */
  finalize: () => Promise<string | null>;
  onProgress?: (stage: DeletionStage) => void;
};

/**
 * Menjalankan (atau MELANJUTKAN) penghapusan akun. Setiap tahap idempoten, jadi memanggilnya lagi
 * setelah gagal di tengah jalan aman dan tidak melewati tahap mana pun: finalisasi hanya dijalankan
 * setelah foto bersih DAN server melaporkan data 'done'.
 * Mengembalikan pesan error, atau null bila akun sudah terhapus.
 */
export async function continueDeletion(deps: DeletionDeps, maxIterations = 200): Promise<string | null> {
  deps.onProgress?.('storage');
  const storageError = await deps.cleanupStorage();
  if (storageError) return storageError;

  deps.onProgress?.('data');
  let done = false;
  for (let i = 0; i < maxIterations; i++) {
    const step = await deps.processData();
    if (typeof step === 'object') return step.error;
    if (step === 'done') {
      done = true;
      break;
    }
  }
  if (!done) return 'Penghapusan data belum selesai. Coba lanjutkan lagi.';

  deps.onProgress?.('finalize');
  return deps.finalize();
}
