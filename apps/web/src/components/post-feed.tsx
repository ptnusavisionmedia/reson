'use client';

import { useState, type ReactNode } from 'react';

import { fetchFeedPage, PAGE_SIZE, type FeedSource, type PostItem } from '@/lib/data/posts';
import { createClient } from '@/lib/supabase/browser';

import { PostCard } from './post-card';

/** Halaman pertama datang dari server; halaman berikutnya dimuat bertahap dari browser (bukan seluruh tabel). */
export function PostFeed({ source, initial, empty }: { source: FeedSource; initial: PostItem[]; empty: ReactNode }) {
  const [items, setItems] = useState(initial);
  const [done, setDone] = useState(initial.length < PAGE_SIZE);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  async function loadMore() {
    if (loading || done || items.length === 0) return;
    setLoading(true);
    setFailed(false);
    const page = await fetchFeedPage(createClient(), source, items[items.length - 1]);
    setLoading(false);
    if (page.error) return setFailed(true);
    setItems((prev) => {
      const seen = new Set(prev.map((p) => p.id));
      return [...prev, ...page.items.filter((p) => !seen.has(p.id))];
    });
    setDone(page.items.length < PAGE_SIZE);
  }

  if (items.length === 0) return <>{empty}</>;

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-3">
        {items.map((p) => (
          <li key={p.id}>
            <PostCard post={p} />
          </li>
        ))}
      </ul>
      {failed && (
        <p role="alert" className="text-sm text-accent">
          Gagal memuat post berikutnya. Coba lagi.
        </p>
      )}
      {done ? (
        <p className="py-4 text-center text-sm text-muted">Sudah sampai akhir.</p>
      ) : (
        <button
          type="button"
          onClick={loadMore}
          disabled={loading}
          className="min-h-11 rounded-md border border-line-strong px-5 disabled:opacity-60"
        >
          {loading ? 'Memuat…' : 'Muat lebih banyak'}
        </button>
      )}
    </div>
  );
}
