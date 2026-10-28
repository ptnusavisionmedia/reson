import { describe, expect, it, vi } from 'vitest';

import { continueDeletion, type DeletionDeps } from '../../src/features/account/deletionFlow';

type Step = 'continue' | 'done' | { error: string };

/** Semua dependensi berupa mock, supaya jumlah dan urutan panggilan bisa diperiksa. */
function makeDeps(opts: { storage?: () => Promise<string | null>; data?: () => Promise<Step>; finalize?: () => Promise<string | null> } = {}) {
  const order: string[] = [];
  const cleanupStorage = vi.fn(async () => {
    order.push('storage');
    return opts.storage ? opts.storage() : null;
  });
  const processData = vi.fn(async (): Promise<Step> => {
    order.push('data');
    return opts.data ? opts.data() : 'done';
  });
  const finalize = vi.fn(async () => {
    order.push('finalize');
    return opts.finalize ? opts.finalize() : null;
  });
  const deps: DeletionDeps = { cleanupStorage, processData, finalize };
  return { deps, order, cleanupStorage, processData, finalize };
}

describe('continueDeletion', () => {
  it('berurutan: foto, lalu data sampai done, lalu finalisasi', async () => {
    const steps: Step[] = ['continue', 'continue', 'done'];
    const { deps, order } = makeDeps({ data: async () => steps.shift() as Step });
    expect(await continueDeletion(deps)).toBeNull();
    expect(order).toEqual(['storage', 'data', 'data', 'data', 'finalize']);
  });

  it('gagal di foto: berhenti, tidak menyentuh data maupun akun', async () => {
    const { deps, processData, finalize } = makeDeps({ storage: async () => 'Gagal menghapus foto.' });
    expect(await continueDeletion(deps)).toBe('Gagal menghapus foto.');
    expect(processData).not.toHaveBeenCalled();
    expect(finalize).not.toHaveBeenCalled();
  });

  it('gagal di tengah data: mengembalikan error dan TIDAK memfinalisasi akun', async () => {
    let n = 0;
    const { deps, finalize } = makeDeps({ data: async () => (++n < 3 ? 'continue' : { error: 'Koneksi terputus.' }) });
    expect(await continueDeletion(deps)).toBe('Koneksi terputus.');
    expect(finalize).not.toHaveBeenCalled();
  });

  it('dilanjutkan setelah gagal: diulang dari awal dengan aman dan akhirnya selesai', async () => {
    let attempt = 0;
    let dataCalls = 0;
    const { deps, cleanupStorage, finalize } = makeDeps({
      data: async () => {
        dataCalls++;
        if (attempt === 0) return dataCalls === 1 ? 'continue' : { error: 'Koneksi terputus.' }; // gagal sebagian
        return 'done'; // percobaan kedua: progres sudah tersimpan di server
      },
    });

    expect(await continueDeletion(deps)).toBe('Koneksi terputus.');
    expect(finalize).not.toHaveBeenCalled();

    attempt = 1; // pengguna menekan "Lanjutkan penghapusan"
    expect(await continueDeletion(deps)).toBeNull();
    expect(finalize).toHaveBeenCalledTimes(1);
    expect(cleanupStorage).toHaveBeenCalledTimes(2); // tahap foto idempoten: aman dijalankan ulang
  });

  it('batas iterasi: server yang tidak pernah selesai tidak membuat loop tak berujung', async () => {
    const { deps, processData, finalize } = makeDeps({ data: async () => 'continue' });
    const err = await continueDeletion(deps, 5);
    expect(err).toContain('belum selesai');
    expect(processData).toHaveBeenCalledTimes(5);
    expect(finalize).not.toHaveBeenCalled();
  });

  it('gagal di finalisasi: error diteruskan agar bisa dicoba lagi', async () => {
    const { deps } = makeDeps({ finalize: async () => 'Gagal menyelesaikan penghapusan.' });
    expect(await continueDeletion(deps)).toBe('Gagal menyelesaikan penghapusan.');
  });

  it('melaporkan tahap yang sedang berjalan', async () => {
    const stages: string[] = [];
    const { deps } = makeDeps();
    deps.onProgress = (s) => stages.push(s);
    await continueDeletion(deps);
    expect(stages).toEqual(['storage', 'data', 'finalize']);
  });
});
