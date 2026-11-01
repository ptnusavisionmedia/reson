import Link from 'next/link';

import { EmptyState } from '@/components/empty-state';
import { PostFeed } from '@/components/post-feed';
import { fetchFeedPage } from '@/lib/data/posts';
import { createClient } from '@/lib/supabase/server';

const TABS = [
  { id: 'forYou', label: 'Untukmu' },
  { id: 'following', label: 'Mengikuti' },
] as const;

export default async function HomePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const active = tab === 'following' ? 'following' : 'forYou';

  const supabase = await createClient();
  const first = await fetchFeedPage(supabase, { kind: active }, null);

  return (
    <>
      <h1 className="mb-4 text-2xl font-semibold">Beranda</h1>
      <div role="tablist" aria-label="Jenis feed" className="mb-4 flex gap-2">
        {TABS.map((t) => {
          const selected = t.id === active;
          return (
            <Link
              key={t.id}
              href={t.id === 'forYou' ? '/home' : '/home?tab=following'}
              role="tab"
              aria-selected={selected}
              className={`min-h-11 rounded-md bg-surface px-4 py-3 text-sm ${
                selected ? 'border-2 border-accent' : 'border border-line-strong text-muted'
              }`}
            >
              {selected ? `✓ ${t.label}` : t.label}
            </Link>
          );
        })}
      </div>

      {first.error ? (
        <EmptyState title="Gagal memuat" message="Tidak bisa memuat feed. Muat ulang halaman untuk mencoba lagi." />
      ) : (
        <PostFeed
          key={active}
          source={{ kind: active }}
          initial={first.items}
          empty={
            active === 'forYou' ? (
              <EmptyState
                title="Belum ada post"
                message="Gabung ke komunitas untuk melihat post terbaru mereka di sini."
                href="/communities"
                actionLabel="Lihat komunitas"
              />
            ) : (
              <EmptyState
                title="Belum ada post dari yang kamu ikuti"
                message="Ikuti pengguna dari profil mereka, atau lihat Match untuk menemukan pendengar dengan selera mirip."
                href="/match"
                actionLabel="Buka Match"
              />
            )
          }
        />
      )}
    </>
  );
}
