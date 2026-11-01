'use client';

import { useEffect } from 'react';

/** Galat tak terduga di halaman mana pun. Pesan aman: detail teknis tidak ditampilkan ke pengguna. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[web]', error.digest ?? error.message);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-4">
      <p className="font-mono text-sm tracking-widest text-accent">RESON</p>
      <h1 className="text-2xl font-semibold">Terjadi masalah</h1>
      <p className="text-muted">Halaman ini tidak bisa dimuat. Coba lagi, atau kembali sebentar lagi.</p>
      <div className="flex gap-3">
        <button type="button" onClick={reset} className="min-h-11 rounded-md bg-accent px-5 font-medium text-bg">
          Coba lagi
        </button>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/home" className="flex min-h-11 items-center rounded-md border border-line-strong px-5">
          Ke Beranda
        </a>
      </div>
    </main>
  );
}
